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

exports.getAnalyticsSummary = async (req, res) => {
  try {
    const [kpiRows] = await db.execute(
      `SELECT 
         COUNT(*) AS total_orders,
         COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS total_revenue,
         COALESCE(AVG(CASE WHEN status != 'cancelled' THEN total ELSE NULL END), 0) AS avg_order_value,
         COALESCE(SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END), 0) AS delivered_orders
       FROM orders`
    );

    const [monthlyRows] = await db.execute(
      `SELECT
         DATE_FORMAT(created_at, '%Y-%m') AS month_key,
         DATE_FORMAT(created_at, '%b') AS month_label,
         COUNT(*) AS orders,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS refunds,
         COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS revenue
       FROM orders
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
       GROUP BY month_key, month_label
       ORDER BY month_key ASC`
    );

    const [categoryRows] = await db.execute(
      `SELECT
         COALESCE(NULLIF(TRIM(p.category), ''), 'Uncategorized') AS name,
         COALESCE(SUM(oi.quantity * oi.price), 0) AS value
       FROM order_items oi
       INNER JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE o.status != 'cancelled'
       GROUP BY name
       ORDER BY value DESC
       LIMIT 5`
    );

    const [statusRows] = await db.execute(
      `SELECT
         COALESCE(NULLIF(TRIM(status), ''), 'unknown') AS source,
         COUNT(*) AS visitors
       FROM orders
       GROUP BY source
       ORDER BY visitors DESC`
    );

    const monthMap = new Map(
      monthlyRows.map((row) => [
        row.month_key,
        {
          month: row.month_label,
          revenue: Number(row.revenue || 0),
          orders: Number(row.orders || 0),
          refunds: Number(row.refunds || 0),
        },
      ])
    );

    const monthlySalesData = [];
    const now = new Date();
    now.setDate(1);

    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'short' });

      monthlySalesData.push(
        monthMap.get(monthKey) || {
          month: monthLabel,
          revenue: 0,
          orders: 0,
          refunds: 0,
        }
      );
    }

    const kpi = kpiRows[0] || {};
    const totalOrders = Number(kpi.total_orders || 0);
    const deliveredOrders = Number(kpi.delivered_orders || 0);
    const conversionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

    res.json({
      success: true,
      data: {
        kpis: {
          totalRevenue: Number(kpi.total_revenue || 0),
          totalOrders,
          conversionRate: Number(conversionRate.toFixed(1)),
          avgOrderValue: Number(kpi.avg_order_value || 0),
        },
        monthlySalesData,
        categoryData: categoryRows.map((row) => ({
          name: row.name,
          value: Number(row.value || 0),
        })),
        trafficSourceData: statusRows.map((row) => ({
          source: String(row.source || 'unknown'),
          visitors: Number(row.visitors || 0),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
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
    const orderNumber = `ORD-${String(orderId).padStart(3, '0')}`;

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
