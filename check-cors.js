// import fetch from 'node-fetch'; // Using native fetch

const audioUrl = 'https://silver-lemur-512881.hostingersite.com/files/audio/2025-10-29_RU-1762981066683.mp3';
const logoUrl = 'https://silver-lemur-512881.hostingersite.com/wp-content/uploads/2025/02/logo-5-120x120.png';

async function checkUrl(url, label) {
  console.log(`\nChecking ${label}: ${url}`);
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'Origin': 'http://localhost:4173'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    const corsHeader = response.headers.get('access-control-allow-origin');
    if (corsHeader) {
      console.log(`✅ CORS Header found: ${corsHeader}`);
    } else {
      console.log('❌ CORS Header MISSING!');
    }
  } catch (error) {
    console.error('Error fetching URL:', error);
  }
}

async function run() {
  await checkUrl(audioUrl, 'Audio URL');
  // Note: The logo URL might also be 404 if I guessed the date/path wrong from the grep, 
  // but let's try to find a valid one if possible. 
  // Actually, the grep showed: src="https://silver-lemur-512881.hostingersite.com/wp-content/uploads/2025/02/logo-5-120x120.png"
  // Wait, the current date is Nov 2025. "2025/02" is in the past relative to Nov 2025? No, Feb 2025 is past.
  // So the logo might exist.
  await checkUrl(logoUrl, 'Logo URL');
}

run();
