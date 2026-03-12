const express = require('express');
const cors = require('cors');
const Mailjet = require('node-mailjet');  // ✅ CORRECT IMPORT

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'HIM.clothiers Mailjet API LIVE' });
});

// ✅ CORRECT Mailjet /send-otp
app.post('/send-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const mailjet = new Mailjet({
      apiKey: process.env.MAILJET_API_KEY,
      apiSecretKey: process.env.MAILJET_SECRET_KEY
    });

    const request = await mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [{
          From: {
            Email: 'macaulayroyal17@gmail.com',
            Name: 'HIM.clothiers'
          },
          To: [{ Email: email }],
          Subject: 'Your HIM.clothiers Verification Code',
          HTMLPart: `<div style="font-family:sans-serif;text-align:center;padding:40px;background:#fdf8f5;">
            <h2 style="color:#6F4D38;">HIM.clothiers</h2>
            <p>Your code is:</p>
            <div style="background:white;border:3px solid #6F4D38;border-radius:16px;padding:30px;margin:20px auto;max-width:300px;">
              <span style="color:#6F4D38;font-size:36px;font-weight:bold;letter-spacing:10px;">${otp}</span>
            </div>
          </div>`
        }]
      });

    res.json({ success: true });
  } catch (error) {
    console.error('Mailjet error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// YOUR EXISTING /create-user (unchanged)
app.post('/create-user', async (req, res) => {
  try {
    const { email, password, phone, avatar_url } = req.body;
    
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
      });
    } catch (deleteError) {
      console.log('No existing user to delete:', deleteError.message);
    }
    
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          phone: phone || '',
          avatar_url: avatar_url || ''
        }
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.message && (
        data.message.includes('duplicate') || 
        data.message.includes('already') || 
        data.message.includes('violates unique constraint')
      )) {
        return res.status(409).json({ 
          success: false, 
          error: 'User already exists',
          exists: true 
        });
      }
      throw new Error(data.message || 'Failed to create user');
    }

    res.json({ 
      success: true, 
      user: {
        id: data.user.id,
        email: data.user.email
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Mailjet API running on port ${port}`);
});
