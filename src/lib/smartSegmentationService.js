import deepseekService from './deepseekService';
import logger from './logger';

const TARGET_SEGMENT_DURATION_MS = 60000; // 1 minute
const MAX_SEGMENT_DURATION_MS = 120000; // 2 minutes

/**
 * Service to perform smart segmentation of transcripts using DeepSeek
 */
const smartSegmentationService = {
  
  /**
   * Main function to process utterances and return re-segmented utterances
   * @param {Array} utterances - Original utterances with words
   * @returns {Promise<Array>} - New segments
   */
  processTranscript: async (utterances) => {
    if (!utterances || utterances.length === 0) return [];

    // 1. Flatten words and normalize
    const allWords = utterances.flatMap(u => u.words || []).map(w => ({
      ...w,
      text: w.text || w.word || '' // Normalize to 'text'
    }));
    
    if (allWords.length === 0) {
      logger.warn('[SmartSegmentation] No words found in utterances, falling back to original');
      return utterances;
    }

    // 2. Prepare text for LLM
    const fullText = allWords.map(w => w.text).join(' ');
    
    // 3. Call DeepSeek
    logger.info('[SmartSegmentation] Sending text to DeepSeek for analysis...');
    const splitAnchors = await smartSegmentationService.getSplitAnchorsFromLLM(fullText);
    
    if (!splitAnchors || splitAnchors.length === 0) {
      logger.warn('[SmartSegmentation] No split anchors received, falling back to original');
      return utterances;
    }

    logger.info(`[SmartSegmentation] Received ${splitAnchors.length} split anchors`);

    // 4. Re-segment based on anchors
    const newSegments = smartSegmentationService.resegmentByAnchors(allWords, splitAnchors);
    
    return newSegments;
  },

  /**
   * Asks LLM to identify split points
   */
  getSplitAnchorsFromLLM: async (text) => {
    const systemPrompt = `You are an expert transcript editor. 
Your task is to split the transcript into semantically coherent segments.
Rules:
1. Target segment length: ~1 minute (approx 150-200 words).
2. Maximum segment length: 2 minutes.
3. Segments must be split at sentence endings (., ?, !).
4. Return the LAST 5 WORDS of each segment you create.
5. Output strictly a JSON array of strings. No other text.`;

    const userPrompt = `Here is the transcript text:
"${text}"

Output the JSON array of the last 5 words for each segment.`;

    try {
      const response = await deepseekService.chat(systemPrompt, userPrompt);
      
      // Clean response to ensure it's valid JSON
      const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const anchors = JSON.parse(jsonStr);
      
      if (Array.isArray(anchors)) {
        return anchors;
      }
      throw new Error('Response is not an array');
    } catch (error) {
      logger.error('[SmartSegmentation] Error getting anchors from LLM:', error);
      return null;
    }
  },

  /**
   * Re-segments the words array based on the anchor phrases
   */
  resegmentByAnchors: (allWords, anchors) => {
    const segments = [];
    let currentSegmentWords = [];
    let wordIndex = 0;
    let anchorIndex = 0;

    while (wordIndex < allWords.length) {
      const word = allWords[wordIndex];
      currentSegmentWords.push(word);

      // Check if we reached the current anchor
      if (anchorIndex < anchors.length) {
        const anchorPhrase = anchors[anchorIndex];
        // Clean anchor phrase for comparison
        const cleanAnchor = anchorPhrase.replace(/[.,?!]/g, '').toLowerCase().split(/\s+/);
        
        // Check if the last N words match the anchor
        if (currentSegmentWords.length >= cleanAnchor.length) {
          const lastWords = currentSegmentWords.slice(-cleanAnchor.length);
          const isMatch = lastWords.every((w, i) => 
            w.text.replace(/[.,?!]/g, '').toLowerCase() === cleanAnchor[i]
          );

          if (isMatch) {
            // Found a split point!
            segments.push(smartSegmentationService.createSegment(currentSegmentWords));
            currentSegmentWords = [];
            anchorIndex++;
          }
        }
      }

      // Safety check: Max duration
      if (currentSegmentWords.length > 0) {
        const startTime = currentSegmentWords[0].start;
        const endTime = currentSegmentWords[currentSegmentWords.length - 1].end;
        if ((endTime - startTime) > MAX_SEGMENT_DURATION_MS) {
          // Force split if too long, but try to find a sentence end
          const lastSentenceEnd = smartSegmentationService.findLastSentenceEnd(currentSegmentWords);
          if (lastSentenceEnd > 0) {
             const segmentPart = currentSegmentWords.slice(0, lastSentenceEnd);
             segments.push(smartSegmentationService.createSegment(segmentPart));
             currentSegmentWords = currentSegmentWords.slice(lastSentenceEnd);
          } else {
             // Just split everything if no sentence end found (rare)
             segments.push(smartSegmentationService.createSegment(currentSegmentWords));
             currentSegmentWords = [];
          }
        }
      }

      wordIndex++;
    }

    // Add remaining words
    if (currentSegmentWords.length > 0) {
      segments.push(smartSegmentationService.createSegment(currentSegmentWords));
    }

    return segments;
  },

  /**
   * Helper to find the index of the last word ending a sentence
   */
  findLastSentenceEnd: (words) => {
    for (let i = words.length - 1; i >= 0; i--) {
      if (/[.?!]/.test(words[i].text)) {
        return i + 1;
      }
    }
    return -1;
  },

  /**
   * Creates a segment object from a list of words
   */
  createSegment: (words) => {
    if (!words || words.length === 0) return null;
    return {
      start: words[0].start,
      end: words[words.length - 1].end,
      text: words.map(w => w.text).join(' '),
      words: words,
      id: `smart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }
};

export default smartSegmentationService;
