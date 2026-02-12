const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

router.post('/create', authenticate, orderController.createOrder);
router.get('/addresses', authenticate, orderController.getUserAddresses);
router.post('/addresses', authenticate, orderController.addAddress);

module.exports = router;
