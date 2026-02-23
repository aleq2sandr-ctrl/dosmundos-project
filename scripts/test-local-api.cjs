const http = require('http');

const data = JSON.stringify({
  episodeSlug: 'test-episode',
  lang: 'ru',
  transcriptData: { test: true },
  provider: 'test'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/save-transcript',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Testing local API server at http://localhost:3000/api/save-transcript...');

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    console.log('BODY:', body);
    if (res.statusCode === 200) {
        console.log('✅ API Test Passed');
    } else {
        console.log('❌ API Test Failed');
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Problem with request: ${e.message}`);
  console.log('HINT: Is the server running? (npm run server)');
});

req.write(data);
req.end();
