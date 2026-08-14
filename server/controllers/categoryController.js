const Category = require('../models/Category');
const { slugify } = require('../utils/helpers');

const listCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, icon = 'wrench', description = '' } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const category = await Category.create({
      name,
      slug: slugify(name),
      icon,
      description,
    });
    res.status(201).json({ category });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const { name, icon, description } = req.body;
    const updates = {};
    if (name) {
      updates.name = name;
      updates.slug = slugify(name);
    }
    if (icon !== undefined) updates.icon = icon;
    if (description !== undefined) updates.description = description;

    const category = await Category.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ category });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
