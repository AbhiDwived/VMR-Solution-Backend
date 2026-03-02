const db = require('../config/db');

exports.createReview = async (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    const user_id = req.user?.id || null;

    if (!product_id || !rating || !comment) {
      return res.status(400).json({ message: 'Product ID, rating, and comment are required' });
    }

    const [result] = await db.query(
      'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
      [product_id, user_id, rating, comment]
    );

    res.status(201).json({ message: 'Review created successfully', reviewId: result.insertId });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Failed to create review', error: error.message });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    const [reviews] = await db.query(
      `SELECT r.*, u.full_name as user_name 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.product_id = ? 
       ORDER BY r.created_at DESC`,
      [productId]
    );

    res.json({ data: reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};
