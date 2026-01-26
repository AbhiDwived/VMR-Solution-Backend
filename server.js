const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./src/config/db');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to VMR Solution Backend API' });
});

// Routes
const authRoutes = require('./src/routes/authRoutes');
const protectedRoutes = require('./src/routes/protectedRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);


// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
