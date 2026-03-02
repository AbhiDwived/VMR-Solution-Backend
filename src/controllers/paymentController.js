const db = require('../config/db');

exports.createPayment = async (req, res) => {
  try {
    const { order_id, gateway, amount, payment_method, gateway_order_id } = req.body;
    const user_id = req.user?.id;

    const [result] = await db.execute(
      `INSERT INTO payments (order_id, user_id, gateway, amount, payment_method, gateway_order_id, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [order_id, user_id, gateway, amount, payment_method, gateway_order_id]
    );

    res.status(201).json({ success: true, paymentId: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, gateway_payment_id, gateway_signature, gateway_response } = req.body;

    const [result] = await db.execute(
      `UPDATE payments SET status = ?, gateway_payment_id = ?, gateway_signature = ?, 
       gateway_response = ?, paid_at = IF(? = 'paid', NOW(), paid_at) WHERE id = ?`,
      [status, gateway_payment_id, gateway_signature, JSON.stringify(gateway_response), status, id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrderPayments = async (req, res) => {
  try {
    const { orderId } = req.params;
    const [payments] = await db.execute('SELECT * FROM payments WHERE order_id = ?', [orderId]);
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
