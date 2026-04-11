const { Client } = require('pg');

const connectionString = 'postgresql://postgres.gsvmgbdfdbcpoikpbrwp:Saurabh%40123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres';

const client = new Client({
  connectionString: connectionString,
});

client.connect()
  .then(() => {
    console.log('✅ Connected to database successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection error', err.stack);
    process.exit(1);
  });
