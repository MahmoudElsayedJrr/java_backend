require('dotenv').config();
const { sendVerificationEmail } = require('./services/email.service');

console.log('Testing Email Sending via Brevo HTTP API...');
console.log('Sender Email (SMTP_FROM):', process.env.SMTP_FROM);

// Temporary fallback: if BREVO_API_KEY is not defined, try using SMTP_PASS to see if it works as an API key
if (!process.env.BREVO_API_KEY && process.env.SMTP_PASS) {
  console.log('Note: BREVO_API_KEY not found. Attempting fallback using SMTP_PASS key...');
  process.env.BREVO_API_KEY = process.env.SMTP_PASS;
}

if (!process.env.BREVO_API_KEY) {
  console.error('❌ Error: Neither BREVO_API_KEY nor SMTP_PASS is configured in .env!');
  process.exit(1);
}

sendVerificationEmail(process.env.SMTP_FROM, 'Test User', '999888')
  .then(() => {
    console.log('✅ Success! The email was sent successfully using the HTTP API.');
  })
  .catch(err => {
    console.error('❌ Failed to send email via HTTP API:');
    console.error(err.message);
  });
