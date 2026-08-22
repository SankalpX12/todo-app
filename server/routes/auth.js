const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { signup, verify, resendVerification, login, logout, me, forgotPassword, resetPassword } = require('../controllers/authController');

router.post('/signup', signup);
router.get('/verify/:token', verify);
router.post('/resend-verification', resendVerification);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
