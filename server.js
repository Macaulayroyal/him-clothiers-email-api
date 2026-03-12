const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ddrhpjiaotwtblnlqytw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('🚨 Missing RESEND_API_KEY or SUPABASE_SERVICE_KEY!');
  process.exit(1);
}

app.get('/', (req, res) => {
  res.json({ status: 'HIM.clothiers RESEND API LIVE', timestamp: new Date().toISOString() });
});

app.post('/send-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and OTP required' });
    }

    console.log(`📧 Sending OTP ${otp} to ${email}`);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@resend.dev',
        to: email,
        subject: 'Your HIM.clothiers Verification Code',
        html: `
          <div style="font-family:sans-serif;text-align:center;padding:40px;background:#fdf8f5">
            <h2 style="color:#6F4D38">HIM.clothiers</h2>
            <p>Your verification code is:</p>
            <div style="background:white;border:3px solid #6F4D38;border-radius:16px;padding:30px;margin:20px auto;max-width:300px">
              <span style="color:#6F4D38;font-size:36px;font-weight:bold;letter-spacing:10px">${otp}</span>
            </div>
            <p style="color:#666;font-size:14px">Expires in 1 hour.</p>
          </div>
        `
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Resend failed:', data);
      throw new Error(data.message || 'Failed to send email');
    }
    
    console.log('✅ RESEND: Email sent to', email);
    res.json({ success: true });
  } catch (error) {
    console.error('🚨 RESEND ERROR:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/create-user', async (req, res) => {
  try {
    const { email, password, phone, avatar_url } = req.body;
    
    console.log('👤 Creating user:', email);

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    // 1. Check if user exists
    console.log('🔍 Checking existing users...');
    const listResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!listResponse.ok) {
      throw new Error(`List users failed: ${listResponse.status}`);
    }

    const usersData = await listResponse.json();
    console.log('📋 Found users:', usersData.users?.length || 0);
    
    const existingUser = usersData.users?.find(u => u.email === email);
    if (existingUser) {
      console.log('🗑️ Deleting existing user:', existingUser.id);
      const deleteResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existingUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY
        }
      });
      console.log('Delete result:', deleteResponse.status);
    }

    // 2. Create new user
    console.log('➕ Creating new user...');
    const createResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          phone: phone || '',
          avatar_url: avatar_url || ''
        }
      })
    });

    const createData = await createResponse.json();
    
    if (!createResponse.ok) {
      console.error('🚨 SUPABASE CREATE ERROR:', createData);
      throw new Error(createData.message || `Create failed: ${createResponse.status} - ${JSON.stringify(createData)}`);
    }

    console.log('✅ USER CREATED:', createData.user?.id);

    res.json({
      success: true,
      user: {
        id: createData.user?.id || 'unknown',
        email: createData.user?.email || email,
        avatar_url: createData.user?.user_metadata?.avatar_url || ''
      }
    });

  } catch (error) {
    console.error('🚨 CREATE-USER FULL ERROR:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      raw: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 HIM.clothiers RESEND API LIVE on port ${port}`);
});
