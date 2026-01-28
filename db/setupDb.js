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

        // Create products table
        const createProductsTableQuery = `
            CREATE TABLE IF NOT EXISTS products (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL UNIQUE,
                description TEXT NOT NULL,
                long_description TEXT,
                materials VARCHAR(255),
                care_instructions TEXT,
                specifications TEXT,
                additional_info TEXT,
                weight DECIMAL(10,2) DEFAULT 0,
                warranty VARCHAR(255),
                admin_email VARCHAR(255),
                admin_name VARCHAR(255),
                admin_number VARCHAR(20),
                price DECIMAL(10,2) NOT NULL,
                discount_price DECIMAL(10,2) NOT NULL,
                stock_quantity INT NOT NULL,
                category VARCHAR(255) NOT NULL,
                brand VARCHAR(255),
                video_url TEXT,
                type ENUM('own', 'affiliate') DEFAULT 'own',
                affiliate_link TEXT,
                product_images JSON,
                tags JSON,
                colors JSON,
                sizes JSON,
                features JSON,
                variants JSON,
                delivery_charges JSON,
                default_delivery_charge DECIMAL(10,2) DEFAULT 0,
                is_featured BOOLEAN DEFAULT FALSE,
                is_new_arrival BOOLEAN DEFAULT FALSE,
                status ENUM('active', 'inactive', 'draft') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `;

        await connection.query(createProductsTableQuery);
        console.log('Products table checked/created.');

    } catch (error) {
        console.error('Error setting up database:', error);
    } finally {
        await connection.end();
    }
}

setupDatabase();
