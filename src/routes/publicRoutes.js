const express = require('express');
const { getAllCategories } = require('../controllers/categoryController');
const { getAllBrands } = require('../controllers/brandController');
const { createSubscription } = require('../controllers/subscriptionController');
const { validateCoupon } = require('../controllers/couponController');
const { getAllProducts, getProductBySlug } = require('../controllers/productController');

const router = express.Router();

// Public category routes (no authentication required)
router.get('/categories', getAllCategories);
router.get('/brands', getAllBrands);
router.post('/subscribe', createSubscription);
router.post('/coupon/validate', validateCoupon);

// Public product routes
router.get('/products', getAllProducts);
router.get('/product/slug/:slug', getProductBySlug);

module.exports = router;