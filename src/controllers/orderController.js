const db = require('../config/db');
const { notifyNewOrder, createNotification } = require('../utils/notificationService');

exports.getAllOrders = async (req, res) => {
  try {
    const [orders] = await db.execute(
      `SELECT o.*, u.full_name, u.email, u.mobile, COUNT(oi.id) as item_count,
       GROUP_CONCAT(p.name SEPARATOR ', ') as product_names,
       GROUP_CONCAT(p.slug SEPARATOR ',') as product_slugs
       FROM orders o 
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       GROUP BY o.id 
       ORDER BY o.created_at DESC`
    );
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const [orders] = await db.execute(
      `SELECT o.*, u.full_name, u.email, u.mobile 
       FROM orders o 
       LEFT JOIN users u ON o.user_id = u.id 
       WHERE o.id = ?`,
      [id]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const [items] = await db.execute(
      `SELECT oi.*, p.id as product_id, p.name, p.slug, p.product_images 
       FROM order_items oi 
       LEFT JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [id]
    );
    
    res.json({ success: true, order: { ...orders[0], items } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const [result] = await db.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    const [order] = await db.execute('SELECT user_id FROM orders WHERE id = ?', [id]);
    const { notifyOrderStatusChange } = require('../utils/notificationService');
    await notifyOrderStatusChange(id, status, order[0].user_id);
    
    res.json({ success: true, message: 'Order status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { items, address, paymentMethod, subtotal, gst, deliveryCharges, discount, total } = req.body;
    const userId = req.user.id;

    const [result] = await db.execute(
      `INSERT INTO orders (user_id, address, payment_method, subtotal, gst, delivery_charges, discount, total, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [userId, JSON.stringify(address), paymentMethod, subtotal, gst, deliveryCharges, discount, total]
    );

    const orderId = result.insertId;
    const orderNumber = `VMR-${String(orderId).padStart(3, '0')}`;

    for (const item of items) {
      await db.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
        [orderId, item.id, item.quantity, item.price]
      );
    }
    
    // Get user info for notification
    const [user] = await db.execute('SELECT full_name FROM users WHERE id = ?', [userId]);
    await notifyNewOrder(orderNumber, user[0].full_name, total);
    await createNotification({
      user_id: userId,
      type: 'order',
      title: 'Order Placed Successfully',
      message: `Your order ${orderNumber} has been placed. Total amount: Rs ${total}.`,
      priority: 'medium',
      link: '/dashboard/user-dashboard/orders'
    });

    res.status(201).json({ success: true, orderId, orderNumber });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserAddresses = async (req, res) => {
  try {
    const userId = req.user.id;
    const [addresses] = await db.execute('SELECT * FROM addresses WHERE user_id = ?', [userId]);
    res.json({ success: true, addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addAddress = async (req, res) => {
  try {
    const { name, phone, addressLine1, addressLine2, city, state, pincode, isDefault } = req.body;
    const userId = req.user.id;

    if (isDefault) {
      await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    }

    const [result] = await db.execute(
      `INSERT INTO addresses (user_id, name, phone, address_line1, address_line2, city, state, pincode, is_default) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, phone, addressLine1, addressLine2, city, state, pincode, isDefault ? 1 : 0]
    );

    res.status(201).json({ success: true, addressId: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const userId = req.user.id;

    await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
    await db.execute('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [addressId, userId]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
