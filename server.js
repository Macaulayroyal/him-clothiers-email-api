const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');

const app = express();
app.use(cors());
app.use(express.json());

// API key from environment variable (hidden!)
const resend = new Resend(process.env.RESEND_API_KEY);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Email API running' });
});

// Send OTP email
app.post('/send-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP required' });
    }

    const { data, error } = await resend.emails.send({
      from: 'HIM.clothiers <onboarding@resend.dev>',
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
      `
    });

    if (error) throw error;

    res.json({ success: true, id: data.id });

  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Email API running on port ${PORT}`);
});