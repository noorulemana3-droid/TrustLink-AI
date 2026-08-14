const express = require('express');
const {
  listProviders,
  getProvider,
  getMyProvider,
  createProvider,
  updateProvider,
  updateProviderById,
  deleteProviderById,
  deleteMyProvider,
} = require('../controllers/providerController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', listProviders);
router.get('/me/profile', protect, getMyProvider);
router.delete('/me', protect, deleteMyProvider);
router.put('/me', protect, upload.array('images', 5), updateProvider);

router.post('/', protect, upload.array('images', 5), createProvider);
router.get('/:id', optionalAuth, getProvider);
router.put('/:id', protect, upload.array('images', 5), updateProviderById);
router.delete('/:id', protect, deleteProviderById);

module.exports = router;
