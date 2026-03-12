const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// API keys from environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service role key!

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'HIM.clothiers Email & Auth API' });
});

// Send OTP email
app.post('/send-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'HIM.clothiers <macaulayroyal17@gmail.com>',
        to: email,
        subject: 'Your Verification Code',
        html: `
          <div style="font-family:sans-serif;text-align:center;padding:40px;background:#fdf8f5;">
            <h2 style="color:#6F4D38;">HIM.clothiers</h2>
            <p>Your verification code is:</p>
            <div style="background:white;border:3px solid #6F4D38;border-radius:16px;padding:30px;margin:20px auto;max-width:300px;">
              <span style="color:#6F4D38;font-size:36px;font-weight:bold;letter-spacing:10px;">${otp}</span>
            </div>
            <p style="color:#666;font-size:14px;">Expires in 1 hour.</p>
          </div>
        `,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message);

    res.json({ success: true, id: data.id });

  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🔥 FIXED: Create user with ghost record cleanup + perfect error handling
app.post('/create-user', async (req, res) => {
  try {
    const { email, password, phone, avatar_url } = req.body;
    
    // STEP 1: Delete any existing/partial records (ghost cleanup)
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email
        })
      });
    } catch (deleteError) {
      // Ignore delete errors - user might not exist
      console.log('No existing user to delete:', deleteError.message);
    }
    
    // STEP 2: Create fresh user
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
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          phone: phone || '',
          avatar_url: avatar_url || ''
        }
      }),
    });

    const data = await response.json();

    // PERFECT ERROR HANDLING
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
