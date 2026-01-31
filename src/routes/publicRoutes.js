const express = require('express');
const { getAllCategories } = require('../controllers/categoryController');

const router = express.Router();

// Public category routes (no authentication required)
router.get('/categories', getAllCategories);

module.exports = router;