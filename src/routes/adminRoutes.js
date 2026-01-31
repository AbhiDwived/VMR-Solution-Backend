const express = require('express');
const { addProduct, getAllProducts, getProductById, updateProduct, deleteProduct } = require('../controllers/adminController');
const { upload, createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Product routes
router.post('/product', authenticate, addProduct);
router.get('/products', authenticate, getAllProducts);
router.get('/product/:id', authenticate, getProductById);
router.put('/product/:id', authenticate, updateProduct);
router.delete('/product/:id', authenticate, deleteProduct);

// Category routes
router.post('/category', authenticate, upload.single('image'), createCategory);
router.get('/categories', authenticate, getAllCategories);
router.get('/category/:id', authenticate, getCategoryById);
router.put('/category/:id', authenticate, upload.single('image'), updateCategory);
router.delete('/category/:id', authenticate, deleteCategory);

module.exports = router;