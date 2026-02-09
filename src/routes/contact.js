const express = require('express');
const router = express.Router();
const { submitContactForm } = require('../controllers/contactController');

router.post('/', submitContactForm);
router.get('/all', async (req, res) => {
  try {
    const db = require('../config/db');
    const [rows] = await db.execute('SELECT * FROM contact_inquiries ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch inquiries' });
  }
});

module.exports = router;
