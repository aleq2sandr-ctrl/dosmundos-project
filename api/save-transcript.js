import { saveFullTranscriptToStorage } from '../src/lib/transcriptStorageService.js';

export default async function handler(req, res) {
  console.log('API called with method:', req.method);
  console.log('Raw body:', req.body);
  console.log('Headers:', req.headers);

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { episodeSlug, lang, transcriptData, provider } = req.body;
  console.log('Extracted values:', { episodeSlug, lang, transcriptData: !!transcriptData, provider });

  if (!episodeSlug || !lang || !transcriptData) {
    res.status(400).json({ error: 'Missing episodeSlug, lang, or transcriptData' });
    return;
  }

  try {
    const result = await saveFullTranscriptToStorage(episodeSlug, lang, transcriptData, provider);
    if (result.success) {
      res.status(200).json({ 
        success: true, 
        url: result.url,
        warning: result.warning 
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Save transcript error:', error);
    res.status(500).json({ error: error.message });
  }
}
