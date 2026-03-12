const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ddrhpjiaotwtblnlqytw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('Missing RESEND_API_KEY or SUPABASE_SERVICE_KEY!');
  process.exit(1);
}

app.get('/', (req, res) => {
  res.json({ status: 'HIM.clothiers RESEND API LIVE', timestamp: new Date().toISOString() });
});

app.post('/send-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, error: 'Email and OTP required' });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'macaulayroyal17@gmail.com',
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
    if (!response.ok) throw new Error(data.message || 'Failed to send email');
    
    console.log('✅ RESEND: Email sent to', email);
    res.json({ success: true });
  } catch (error) {
    console.error('RESEND error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/create-user', async (req, res) => {
  try {
    const { email, password, phone, avatar_url } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password required' });

    const listUsersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY }
    });
    const users = await listUsersResponse.json();
    const existingUser = users.users?.find(u => u.email === email);

    if (existingUser) {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existingUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY }
      });
    }

    const createResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        email, password, email_confirm: true,
        user_metadata: { phone: phone || '', avatar_url: avatar_url || '' }
      })
    });

    const data = await createResponse.json();
    if (!createResponse.ok) throw new Error(JSON.stringify(data));

    res.json({
      success: true,
      user: { id: data.user.id, email: data.user.email, avatar_url: data.user.user_metadata?.avatar_url }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 HIM.clothiers RESEND API on port ${port}`);
});
