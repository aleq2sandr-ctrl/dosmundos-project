import axios from 'axios';
import logger from './logger';

// Use proxy in development to avoid CORS issues
const DEEPSEEK_API_URL = import.meta.env.DEV 
  ? "/deepseek-api/chat/completions" 
  : "https://api.deepseek.com/chat/completions";

let deepseekApiKey = null;

const initializeDeepSeek = async () => {
  if (deepseekApiKey) {
    return deepseekApiKey;
  }

  try {
    // Get API key from environment variable
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DEEPSEEK_API_KEY) {
      deepseekApiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
      return deepseekApiKey;
    }
    
    // Check process.env for server-side
    if (typeof process !== 'undefined' && process.env?.DEEPSEEK_API_KEY) {
      deepseekApiKey = process.env.DEEPSEEK_API_KEY;
      return deepseekApiKey;
    }

    // Try localStorage as fallback
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('DEEPSEEK_API_KEY');
      if (stored && typeof stored === 'string' && stored.trim()) {
        deepseekApiKey = stored.trim();
        return deepseekApiKey;
      }
    }

    logger.warn('No DeepSeek API key found');
    return null;
  } catch (error) {
    logger.error('Error initializing DeepSeek:', error);
    return null;
  }
};

const deepseekService = {
  /**
   * Sends a prompt to DeepSeek API
   * @param {string} systemPrompt - The system instruction
   * @param {string} userPrompt - The user content
   * @returns {Promise<string>} - The content of the response
   */
  chat: async (systemPrompt, userPrompt) => {
    const apiKey = await initializeDeepSeek();
    
    if (!apiKey) {
      throw new Error('DeepSeek API key is not configured');
    }

    try {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.3, // Low temperature for more deterministic formatting
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 300000 // 5 minutes timeout for long texts
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      logger.error('DeepSeek API error:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Validates if the API key is working
   */
  testConnection: async () => {
    try {
      await deepseekService.chat("You are a helpful assistant.", "Ping");
      return true;
    } catch (error) {
      return false;
    }
  }
};

export default deepseekService;
