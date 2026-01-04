import { Client } from 'ssh2';
import 'dotenv/config';

(async () => {
  const config = {
    host: process.env.VPS_IP || '72.61.186.175',
    user: process.env.VPS_USER || 'root',
    password: process.env.VPS_PASSWORD || 'Qazsxdc@1234',
    port: 22
  };

  console.log('Testing VPS SSH connection to:', config.host);

  const conn = new Client();

  conn.on('ready', () => {
    console.log('SSH Connection successful!');
    conn.end();
  });

  conn.on('error', (err) => {
    console.error('SSH Connection failed:', err.message);
  });

  conn.connect(config);
})();
