const express = require('express');
const { addProduct, getAllProducts, getProductById, updateProduct, deleteProduct } = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/product', authenticate, addProduct);
router.get('/products', authenticate, getAllProducts);
router.get('/product/:id', authenticate, getProductById);
router.put('/product/:id', authenticate, updateProduct);
router.delete('/product/:id', authenticate, deleteProduct);

module.exports = router;