const express = require('express');
const { getAllCategories } = require('../controllers/categoryController');
const { getAllBrands } = require('../controllers/brandController');
const { createSubscription } = require('../controllers/subscriptionController');

const router = express.Router();

// Public category routes (no authentication required)
router.get('/categories', getAllCategories);
router.get('/brands', getAllBrands);
router.post('/subscribe', createSubscription);

module.exports = router;