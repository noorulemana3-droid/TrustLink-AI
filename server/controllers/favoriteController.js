const User = require('../models/User');
const Provider = require('../models/Provider');

const listFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'favorites',
      populate: { path: 'category', select: 'name slug icon' },
    });
    res.json({ favorites: user.favorites || [] });
  } catch (error) {
    next(error);
  }
};

const checkFavorite = async (req, res, next) => {
  try {
    const providerId = req.params.providerId;
    const user = await User.findById(req.user._id);
    const favorited = user.favorites.some((id) => String(id) === String(providerId));
    res.json({ favorited });
  } catch (error) {
    next(error);
  }
};

const addFavorite = async (req, res, next) => {
  try {
    const providerId = req.params.providerId || req.body.providerId;
    if (!providerId) {
      return res.status(400).json({ message: 'providerId is required' });
    }

    const provider = await Provider.findById(providerId);
    if (!provider || provider.status !== 'approved') {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const user = await User.findById(req.user._id);
    const exists = user.favorites.some((id) => String(id) === String(providerId));
    if (!exists) user.favorites.push(providerId);
    await user.save();

    res.json({ favorited: true, favorites: user.favorites });
  } catch (error) {
    next(error);
  }
};

const removeFavorite = async (req, res, next) => {
  try {
    const providerId = req.params.providerId;
    const user = await User.findById(req.user._id);
    user.favorites = user.favorites.filter((id) => String(id) !== String(providerId));
    await user.save();
    res.json({ favorited: false, favorites: user.favorites });
  } catch (error) {
    next(error);
  }
};

const toggleFavorite = async (req, res, next) => {
  try {
    const providerId = req.params.providerId || req.body.providerId;
    if (!providerId) {
      return res.status(400).json({ message: 'providerId is required' });
    }

    const provider = await Provider.findById(providerId);
    if (!provider || provider.status !== 'approved') {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const user = await User.findById(req.user._id);
    const exists = user.favorites.some((id) => String(id) === String(providerId));

    if (exists) {
      user.favorites = user.favorites.filter((id) => String(id) !== String(providerId));
    } else {
      user.favorites.push(providerId);
    }

    await user.save();

    res.json({
      favorited: !exists,
      favorites: user.favorites,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listFavorites,
  checkFavorite,
  addFavorite,
  removeFavorite,
  toggleFavorite,
};
