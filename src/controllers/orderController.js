const db = require('../config/db');

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

    for (const item of items) {
      await db.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
        [orderId, item.id, item.quantity, item.price]
      );
    }

    res.status(201).json({ success: true, orderId });
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
