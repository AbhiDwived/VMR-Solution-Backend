const db = require('../config/db');
const multer = require('multer');
const { uploadImage } = require('../utils/imagekit');

const upload = multer({ storage: multer.memoryStorage() });

// Create category
const createCategory = async (req, res) => {
    try {
        const { name, status = 'active' } = req.body;
        const image = req.file ? await uploadImage(req.file, 'categories') : null;
        
        if (!name) {
            return res.status(400).json({ message: 'Category name is required' });
        }

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        
        const [result] = await db.execute(
            'INSERT INTO categories (name, slug, image, status) VALUES (?, ?, ?, ?)',
            [name, slug, image, status]
        );

        res.status(201).json({
            message: 'Category created successfully',
            category: { id: result.insertId, name, slug, image, status }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Category name already exists' });
        }
        res.status(500).json({ message: 'Error creating category', error: error.message });
    }
};

// Get all categories
const getAllCategories = async (req, res) => {
    try {
        const [categories] = await db.execute('SELECT * FROM categories ORDER BY created_at DESC');
        res.json({ categories });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error: error.message });
    }
};

// Get category by ID
const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;
        const [categories] = await db.execute('SELECT * FROM categories WHERE id = ?', [id]);
        
        if (categories.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        
        res.json({ category: categories[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching category', error: error.message });
    }
};

// Update category
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, status } = req.body;
        const image = req.file ? await uploadImage(req.file, 'categories') : null;
        
        const [existing] = await db.execute('SELECT * FROM categories WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : existing[0].slug;
        
        await db.execute(
            'UPDATE categories SET name = ?, slug = ?, image = ?, status = ? WHERE id = ?',
            [name || existing[0].name, slug, image || existing[0].image, status || existing[0].status, id]
        );

        res.json({ message: 'Category updated successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Category name already exists' });
        }
        res.status(500).json({ message: 'Error updating category', error: error.message });
    }
};

// Delete category
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await db.execute('DELETE FROM categories WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }
        
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting category', error: error.message });
    }
};

module.exports = {
    upload,
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};