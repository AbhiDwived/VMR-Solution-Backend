const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

router.post('/create', authenticate, orderController.createOrder);
router.get('/user', authenticate, orderController.getUserOrders);
router.get('/user/activity', authenticate, orderController.getUserActivity);
router.get('/user/recommended', authenticate, orderController.getRecommendedProducts);
router.get('/addresses', authenticate, orderController.getUserAddresses);
router.post('/addresses', authenticate, orderController.addAddress);
router.put('/addresses/:addressId/default', authenticate, orderController.setDefaultAddress);
router.get('/:id/invoice', authenticate, orderController.getOrderInvoice);
router.get('/:id', authenticate, orderController.getOrderById);

module.exports = router;
