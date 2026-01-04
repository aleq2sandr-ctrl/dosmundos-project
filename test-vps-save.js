import http from 'http';

const testData = {
  episodeSlug: 'test-vps-' + Date.now(),
  lang: 'en',
  transcriptData: {
    text: 'VPS bucket test transcript '.repeat(100000), // ~1.2MB
    utterances: Array.from({length: 10000}, (_, i) => ({
      start: i * 100, 
      end: i * 100 + 50, 
      text: `Test utterance ${i}`,
      speaker: `Speaker ${i % 5}`
    })),
    words: Array.from({length: 50000}, (_, i) => ({
      start: i * 10,
      end: i * 10 + 5,
      text: 'test',
      confidence: 1.0
    }))
  }
};

console.log('Testing VPS save-transcript endpoint...');
console.log('Episode slug:', testData.episodeSlug);

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
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
