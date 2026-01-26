const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function setupDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || ''
    });

    try {
        const dbName = process.env.DB_NAME || 'vmrsolution';

        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`Database '${dbName}' checked/created.`);

        // Use the database
        await connection.changeUser({ database: dbName });

        // Create users table
        const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        mobile VARCHAR(20) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        is_verified BOOLEAN DEFAULT FALSE,
        otp VARCHAR(6),
        otp_expiry DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;

        await connection.query(createUsersTableQuery);
        console.log('Users table checked/created.');

    } catch (error) {
        console.error('Error setting up database:', error);
    } finally {
        await connection.end();
    }
}

setupDatabase();
