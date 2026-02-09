const db = require('../config/db');

exports.submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required'
      });
    }

    const query = `
      INSERT INTO contact_inquiries (name, email, phone, subject, message)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.execute(query, [name, email, phone || '', subject, message]);

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.',
      data: { id: result.insertId }
    });

  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again.'
    });
  }
};
