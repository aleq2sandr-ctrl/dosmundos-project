import fetch from 'node-fetch';

(async () => {
  try {
    console.log('Testing API call...');
    const response = await fetch('http://localhost:3000/api/save-transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        episodeSlug: '2020-02-19',
        lang: 'RU',
        transcriptData: { test: 'data' },
        provider: 'deepgram'
      })
    });

    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);

    // Try to parse as JSON
    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON:', json);
    } catch (parseError) {
      console.log('Failed to parse as JSON:', parseError.message);
      console.log('Response starts with:', text.substring(0, 200));
    }
  } catch (error) {
    console.error('Error:', error);
  }
})();
