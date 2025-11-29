import http from 'http';

const testData = {
  episodeSlug: 'test-vps-' + Date.now(),
  lang: 'en',
  transcriptData: {
    text: 'VPS bucket test transcript',
    utterances: [{ start: 0, end: 5, text: 'Test utterance', speaker: 'Test' }],
    words: [{ start: 0, end: 1, text: 'test', confidence: 1.0 }]
  }
};

console.log('Testing VPS save-transcript endpoint...');
console.log('Episode slug:', testData.episodeSlug);

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 5174,
  path: '/api/save-transcript',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);

  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('Response:', result);
    } catch (e) {
      console.log('Raw response:', data);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
  process.exit(1);
});

req.write(postData);
req.end();
