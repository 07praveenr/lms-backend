// ================================================================
// EMAIL SERVICE — Uses Gmail SMTP to send OTP emails
// Uses your Gmail account: rpr8364@gmail.com
// ================================================================

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // rpr8364@gmail.com
    pass: process.env.EMAIL_PASS, // Gmail App Password (not your normal password)
  },
});

// ── Send OTP email ───────────────────────────────────────────────
async function sendOTPEmail(toEmail, otp, name) {
  const mailOptions = {
    from: `"LearnHub" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Verify your LearnHub account — OTP inside",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
        
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: #0d1b4b; color: #f0b429; width: 48px; height: 48px; border-radius: 10px; line-height: 48px; font-size: 1.5rem; font-weight: 700; text-align: center;">L</div>
          <h1 style="color: #0d1b4b; margin: 12px 0 4px; font-size: 1.4rem;">LearnHub</h1>
        </div>

        <h2 style="color: #0d1b4b; font-size: 1.2rem; margin-bottom: 8px;">Hi ${name || "there"} 👋</h2>
        <p style="color: #555; font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px;">
          Thank you for signing up on <strong>LearnHub</strong>! To complete your registration, please verify your email address using the OTP below.
        </p>

        <div style="background: #0d1b4b; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="color: rgba(255,255,255,0.6); font-size: 0.85rem; margin: 0 0 8px;">Your verification code</p>
          <div style="font-size: 2.5rem; font-weight: 700; letter-spacing: 12px; color: #f0b429; font-family: monospace;">${otp}</div>
          <p style="color: rgba(255,255,255,0.5); font-size: 0.78rem; margin: 12px 0 0;">This OTP expires in <strong style="color: #fff;">10 minutes</strong></p>
        </div>

        <p style="color: #888; font-size: 0.82rem; line-height: 1.6;">
          If you did not create an account on LearnHub, please ignore this email. 
          Your email address will not be used without verification.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
        <p style="color: #aaa; font-size: 0.78rem; text-align: center;">
          Built with ❤️ by <strong>Praveen Rathod</strong> · 
          <a href="mailto:rpr8364@gmail.com" style="color: #0d1b4b;">rpr8364@gmail.com</a>
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ OTP email sent to ${toEmail}`);
}

module.exports = { sendOTPEmail };
