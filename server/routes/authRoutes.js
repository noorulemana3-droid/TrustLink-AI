const express = require('express');
const {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
} = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/change-password', authenticateUser, changePassword);
router.get('/me', authenticateUser, getMe);
router.put('/profile', authenticateUser, updateProfile);

module.exports = router;
