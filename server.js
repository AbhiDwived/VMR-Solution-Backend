const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const db = require('./src/config/db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to VMR Solution Backend API' });
});

// Unauthorized endpoint
app.get('/unauthorized', (req, res) => {
    res.status(401).json({ message: 'Unauthorized access' });
});

// Routes
const authRoutes = require('./src/routes/authRoutes');
const protectedRoutes = require('./src/routes/protectedRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const bulkOrderRoutes = require('./src/routes/bulkOrders');
const contactRoutes = require('./src/routes/contact');
const publicRoutes = require('./src/routes/publicRoutes');
const blogRoutes = require('./src/routes/blogRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bulk-orders', bulkOrderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api', publicRoutes);
app.use('/api/blogs', blogRoutes);


// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
