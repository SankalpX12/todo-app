const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

async function signup(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + TOKEN_TTL_MS);

    await pool.query(
      `INSERT INTO users (email, password_hash, verification_token, verification_token_expires)
       VALUES ($1, $2, $3, $4)`,
      [email.toLowerCase(), passwordHash, token, tokenExpires]
    );

    try {
      await sendVerificationEmail(email.toLowerCase(), token);
    } catch (emailErr) {
      // Fall back to console in development so auth can be tested without Gmail
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Verify URL: ${process.env.BASE_URL}/verify.html?token=${token}`);
      }
    }

    return res.status(201).json({ message: 'Account created. Please check your email to verify your account.' });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

async function verify(req, res) {
  const { token } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, verification_token_expires FROM users WHERE verification_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or already used verification link.' });
    }

    const user = result.rows[0];
    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).json({ error: 'Verification link has expired.', code: 'TOKEN_EXPIRED' });
    }

    await pool.query(
      'UPDATE users SET is_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = $1',
      [user.id]
    );

    return res.status(200).json({ message: 'Email verified. You can now log in.' });
  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

async function resendVerification(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Generic response either way — don't reveal whether account exists
  const genericOk = { message: 'If that email has an unverified account, a new verification email has been sent.' };

  try {
    const result = await pool.query(
      'SELECT id, is_verified FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0 || result.rows[0].is_verified) {
      return res.status(200).json(genericOk);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + TOKEN_TTL_MS);

    await pool.query(
      'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3',
      [token, tokenExpires, result.rows[0].id]
    );

    try {
      await sendVerificationEmail(email.toLowerCase(), token);
    } catch (emailErr) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV] Verify URL: ${process.env.BASE_URL}/verify.html?token=${token}`);
      }
    }

    return res.status(200).json(genericOk);
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.', code: 'UNVERIFIED' });
    }

    req.session.userId = user.id;
    req.session.email = user.email;

    return res.status(200).json({ message: 'Logged in successfully.' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

function logout(req, res) {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out. Please try again.' });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Logged out successfully.' });
  });
}

async function me(req, res) {
  try {
    const result = await pool.query('SELECT email FROM users WHERE id = $1', [req.session.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Session invalid.' });
    }
    return res.status(200).json({ email: result.rows[0].email });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const genericOk = { message: 'If an account with that email exists, a reset link has been sent.' };

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (result.rows.length === 0) return res.status(200).json(genericOk);

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_token_expires = $2 WHERE id = $3',
      [token, expires, result.rows[0].id]
    );

    try {
      await sendPasswordResetEmail(email.toLowerCase(), token);
    } catch {
      if (process.env.NODE_ENV !== 'production')
        console.log(`[DEV] Reset URL: ${process.env.BASE_URL}/reset-password.html?token=${token}`);
    }

    return res.status(200).json(genericOk);
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  try {
    const result = await pool.query(
      'SELECT id, password_reset_token_expires FROM users WHERE password_reset_token = $1',
      [token]
    );
    if (result.rows.length === 0)
      return res.status(400).json({ error: 'Invalid or already used reset link.' });

    if (new Date() > new Date(result.rows[0].password_reset_token_expires))
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.', code: 'TOKEN_EXPIRED' });

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_token_expires = NULL WHERE id = $2',
      [passwordHash, result.rows[0].id]
    );

    return res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

module.exports = { signup, verify, resendVerification, login, logout, me, forgotPassword, resetPassword };
