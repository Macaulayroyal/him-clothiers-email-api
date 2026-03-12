const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ddrhpjiaotwtblnlqytw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcmhwamlhb3R3dGJsbmxxeXR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc1MjQyMywiZXhwIjoyMDg4MzI4NDIzfQ._6sPEpJvythGOE8sjM-8m936s4pp96txN7Ze1XBd-yU';

// Mailjet SMTP (hardcoded keys - Render free tier allows this)
const transporter = nodemailer.createTransport({
  host: 'in-v3.mailjet.com',
  port: 587,
  secure: false,
  auth: {
    user: 'b1b8f689b6910d9e70a94e49e4780183',  // Your API_KEY
    pass: '52cf14133f0477a156fd8b0f74908676'   // Your SECRET_KEY
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'HIM.clothiers SMTP Mailjet LIVE' });
});

app.post('/send-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    await transporter.sendMail({
      from: '"HIM.clothiers" <macaulayroyal17@gmail.com>',
      to: email,
      subject: 'Your HIM.clothiers Verification Code',
      html: `<div style="font-family:sans-serif;text-align:center;padding:40px;background:#fdf8f5;">
        <h2 style="color:#6F4D38;">HIM.clothiers</h2>
        <p>Your verification code is:</p>
        <div style="background:white;border:3px solid #6F4D38;border-radius:16px;padding:30px;margin:20px auto;max-width:300px;">
          <span style="color:#6F4D38;font-size:36px;font-weight:bold;letter-spacing:10px;">${otp}</span>
        </div>
        <p style="color:#666;font-size:14px;">Expires in 1 hour.</p>
      </div>`
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('SMTP error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Your existing /create-user endpoint
app.post('/create-user', async (req, res) => {
  try {
    const { email, password, phone, avatar_url } = req.body;
    
    // Delete existing user if any
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
    } catch (e) {
      console.log('No existing user');
    }
    
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { phone: phone || '', avatar_url: avatar_url || '' }
      })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to create user');
    
    res.json({ success: true, user: { id: data.user.id, email: data.user.email } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API on port ${port}`);
});
