const express = require('express');
const {
  listFavorites,
  checkFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
} = require('../controllers/favoriteController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, listFavorites);
router.get('/check/:providerId', protect, checkFavorite);
router.post('/toggle', protect, toggleFavorite);
router.post('/:providerId', protect, addFavorite);
router.delete('/:providerId', protect, removeFavorite);

module.exports = router;
