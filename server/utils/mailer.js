const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendVerificationEmail(toEmail, token) {
  const verifyUrl = `${process.env.BASE_URL}/verify.html?token=${token}`;
  await transporter.sendMail({
    from: `"To-Do App" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Verify your email address',
    html: `<p>Click below to verify your account (link expires in 24 hours):</p>
           <p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });
}

async function sendPasswordResetEmail(toEmail, token) {
  const resetUrl = `${process.env.BASE_URL}/reset-password.html?token=${token}`;
  await transporter.sendMail({
    from: `"To-Do App" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Reset your password',
    html: `<p>Click below to reset your password (link expires in 1 hour):</p>
           <p><a href="${resetUrl}">${resetUrl}</a></p>
           <p>If you didn't request this, ignore this email.</p>`,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
