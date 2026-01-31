const express = require('express');
const { addProduct, getAllProducts, getProductById, updateProduct, deleteProduct } = require('../controllers/productController');
const { upload, createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory } = require('../controllers/categoryController');
const { upload: brandUpload, createBrand, getAllBrands, getBrandById, updateBrand, deleteBrand } = require('../controllers/brandController');
const { getAllSubscriptions, deleteSubscription } = require('../controllers/subscriptionController');
const { getAllInventory, updateStock, getLowStockProducts, getInventoryStats } = require('../controllers/inventoryController');
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

// Brand routes
router.post('/brand', authenticate, brandUpload.single('image'), createBrand);
router.get('/brands', authenticate, getAllBrands);
router.get('/brand/:id', authenticate, getBrandById);
router.put('/brand/:id', authenticate, brandUpload.single('image'), updateBrand);
router.delete('/brand/:id', authenticate, deleteBrand);

// Subscription routes
router.get('/subscriptions', authenticate, getAllSubscriptions);
router.delete('/subscription/:id', authenticate, deleteSubscription);

// Inventory routes
router.get('/inventory', authenticate, getAllInventory);
router.put('/inventory/:id/stock', authenticate, updateStock);
router.get('/inventory/low-stock', authenticate, getLowStockProducts);
router.get('/inventory/stats', authenticate, getInventoryStats);

module.exports = router;