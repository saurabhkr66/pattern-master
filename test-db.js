const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Attempting to connect to:', process.env.DATABASE_URL.replace(/:[^@]+@/, ':****@'));
    await client.connect();
    console.log('✅ Successfully connected to the database!');
    const res = await client.query('SELECT NOW()');
    console.log('Server time:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    console.error('Full error details:', err);
  } finally {
    await client.end();
  }
}

testConnection();
