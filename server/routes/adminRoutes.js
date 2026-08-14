const express = require('express');
const {
  getStats,
  listUsers,
  updateUser,
  deleteUser,
  listAllProviders,
  updateProviderStatus,
  adminDeleteProvider,
  listAllReviews,
  adminDeleteReview,
  adminClearReports,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/stats', getStats);
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/providers', listAllProviders);
router.patch('/providers/:id', updateProviderStatus);
router.delete('/providers/:id', adminDeleteProvider);
router.get('/reviews', listAllReviews);
router.delete('/reviews/:id', adminDeleteReview);
router.patch('/reviews/:id/clear-reports', adminClearReports);

module.exports = router;
