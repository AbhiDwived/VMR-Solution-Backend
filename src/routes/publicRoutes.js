const express = require('express');
const { getAllCategories } = require('../controllers/categoryController');
const { getAllBrands } = require('../controllers/brandController');

const router = express.Router();

// Public category routes (no authentication required)
router.get('/categories', getAllCategories);
router.get('/brands', getAllBrands);

module.exports = router;