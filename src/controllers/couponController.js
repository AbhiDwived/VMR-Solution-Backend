const db = require('../config/db');

const createCoupon = async (req, res) => {
  try {
    const {
      code, name, description, type, value, minimum_amount, maximum_discount,
      usage_limit, user_limit, applicable_to, applicable_ids, start_date, end_date
    } = req.body;

    if (!code || !name || !type || !value || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Code, name, type, value, start_date, and end_date are required'
      });
    }

    const [result] = await db.execute(`
      INSERT INTO coupons (
        code, name, description, type, value, minimum_amount, maximum_discount,
        usage_limit, user_limit, applicable_to, applicable_ids, start_date, end_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      code.toUpperCase(), name, description, type, value, minimum_amount || 0,
      maximum_discount, usage_limit, user_limit || 1, applicable_to || 'all',
      applicable_ids ? JSON.stringify(applicable_ids) : null, start_date, end_date
    ]);

    const [newCoupon] = await db.execute('SELECT * FROM coupons WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: newCoupon[0]
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create coupon',
      error: error.message
    });
  }
};

const getAllCoupons = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [];

    if (status) {
      whereClause += ' WHERE status = ?';
      params.push(status);
    }

    if (type) {
      whereClause += status ? ' AND type = ?' : ' WHERE type = ?';
      params.push(type);
    }

    const [rows] = await db.query(`
      SELECT *, 
        CASE 
          WHEN end_date < NOW() THEN 'expired'
          ELSE status 
        END as current_status
      FROM coupons${whereClause} 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countResult] = await db.query(`SELECT COUNT(*) as total FROM coupons${whereClause}`, params);

    res.status(200).json({
      success: true,
      message: 'Coupons retrieved successfully',
      data: rows,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupons',
      error: error.message
    });
  }
};

const getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute('SELECT * FROM coupons WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon retrieved successfully',
      data: rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon',
      error: error.message
    });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code, name, description, type, value, minimum_amount, maximum_discount,
      usage_limit, user_limit, applicable_to, applicable_ids, start_date, end_date, status
    } = req.body;

    const [result] = await db.execute(`
      UPDATE coupons SET 
        code = ?, name = ?, description = ?, type = ?, value = ?, 
        minimum_amount = ?, maximum_discount = ?, usage_limit = ?, 
        user_limit = ?, applicable_to = ?, applicable_ids = ?, 
        start_date = ?, end_date = ?, status = ?
      WHERE id = ?
    `, [
      code?.toUpperCase(), name, description, type, value, minimum_amount,
      maximum_discount, usage_limit, user_limit, applicable_to,
      applicable_ids ? JSON.stringify(applicable_ids) : null,
      start_date, end_date, status, id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    const [updatedCoupon] = await db.execute('SELECT * FROM coupons WHERE id = ?', [id]);

    res.status(200).json({
      success: true,
      message: 'Coupon updated successfully',
      data: updatedCoupon[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update coupon',
      error: error.message
    });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute('DELETE FROM coupons WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete coupon',
      error: error.message
    });
  }
};

const validateCoupon = async (req, res) => {
  try {
    const { code, cart_total, user_id, applicable_items } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code is required'
      });
    }

    const [couponRows] = await db.execute(`
      SELECT * FROM coupons 
      WHERE code = ? AND status = 'active' AND start_date <= NOW() AND end_date >= NOW()
    `, [code.toUpperCase()]);

    if (couponRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired coupon code'
      });
    }

    const coupon = couponRows[0];

    // Check usage limit
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({
        success: false,
        message: 'Coupon usage limit exceeded'
      });
    }

    // Check user usage limit
    if (user_id && coupon.user_limit) {
      const [userUsage] = await db.execute(
        'SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = ? AND user_id = ?',
        [coupon.id, user_id]
      );
      
      if (userUsage[0].count >= coupon.user_limit) {
        return res.status(400).json({
          success: false,
          message: 'You have already used this coupon'
        });
      }
    }

    // Check minimum amount
    if (cart_total < coupon.minimum_amount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${coupon.minimum_amount} required`
      });
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (cart_total * coupon.value) / 100;
      if (coupon.maximum_discount && discount > coupon.maximum_discount) {
        discount = coupon.maximum_discount;
      }
    } else if (coupon.type === 'fixed') {
      discount = coupon.value;
    } else if (coupon.type === 'free_shipping') {
      discount = coupon.value; // shipping amount
    }

    res.status(200).json({
      success: true,
      message: 'Coupon is valid',
      data: {
        coupon_id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        discount_amount: discount,
        coupon_details: coupon
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate coupon',
      error: error.message
    });
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { coupon_id, user_id, order_id, discount_amount } = req.body;

    await db.execute(`
      INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount)
      VALUES (?, ?, ?, ?)
    `, [coupon_id, user_id, order_id, discount_amount]);

    await db.execute(
      'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?',
      [coupon_id]
    );

    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to apply coupon',
      error: error.message
    });
  }
};

const getCouponStats = async (req, res) => {
  try {
    const [totalCoupons] = await db.query('SELECT COUNT(*) as total FROM coupons');
    const [activeCoupons] = await db.query('SELECT COUNT(*) as count FROM coupons WHERE status = "active"');
    const [expiredCoupons] = await db.query('SELECT COUNT(*) as count FROM coupons WHERE end_date < NOW()');
    const [totalUsage] = await db.query('SELECT COUNT(*) as count FROM coupon_usage');
    const [totalDiscount] = await db.query('SELECT SUM(discount_amount) as total FROM coupon_usage');

    res.status(200).json({
      success: true,
      message: 'Coupon stats retrieved successfully',
      data: {
        totalCoupons: totalCoupons[0].total,
        activeCoupons: activeCoupons[0].count,
        expiredCoupons: expiredCoupons[0].count,
        totalUsage: totalUsage[0].count,
        totalDiscountGiven: totalDiscount[0].total || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coupon stats',
      error: error.message
    });
  }
};

module.exports = {
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  applyCoupon,
  getCouponStats
};