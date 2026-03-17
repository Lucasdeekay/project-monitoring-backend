const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'project_monitoring_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Execute query with error handling
const query = async (sql, params) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

// Get a connection from pool
const getConnection = async () => {
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error('Failed to get database connection:', error.message);
    throw error;
  }
};

// Initialize database tables
const initializeDatabase = async () => {
  try {
    console.log('📦 Initializing database tables...');

    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('student', 'supervisor', 'admin') NOT NULL,
        department VARCHAR(255),
        phone VARCHAR(50),
        matric_number VARCHAR(50),
        title VARCHAR(50),
        specialization VARCHAR(255),
        level VARCHAR(10),
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Projects table
    await query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        student_id INT NOT NULL,
        supervisor_id INT NOT NULL,
        department VARCHAR(255),
        status ENUM('draft', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected') DEFAULT 'draft',
        progress INT DEFAULT 0,
        start_date DATE,
        submission_date DATE,
        expected_completion_date DATE,
        objectives TEXT,
        technologies TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_student (student_id),
        INDEX idx_supervisor (supervisor_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Documents table
    await query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        name VARCHAR(500) NOT NULL,
        type ENUM('proposal', 'chapter', 'final', 'other') DEFAULT 'other',
        file_path VARCHAR(500) NOT NULL,
        file_size VARCHAR(50),
        mime_type VARCHAR(100),
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Feedback table
    await query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        supervisor_id INT NOT NULL,
        type ENUM('general', 'chapter', 'milestone') DEFAULT 'general',
        subject VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        status ENUM('unread', 'read') DEFAULT 'unread',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_project (project_id),
        INDEX idx_supervisor (supervisor_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Evaluations table
    await query(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        evaluator_id INT NOT NULL,
        evaluator_role ENUM('supervisor', 'admin') NOT NULL,
        criteria JSON NOT NULL,
        total_score INT NOT NULL,
        max_total_score INT NOT NULL,
        grade VARCHAR(10),
        general_comment TEXT,
        status ENUM('pending', 'completed') DEFAULT 'pending',
        evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (evaluator_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_project (project_id),
        INDEX idx_evaluator (evaluator_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Notifications table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('feedback', 'evaluation', 'submission', 'reminder', 'other') DEFAULT 'other',
        title VARCHAR(500) NOT NULL,
        message TEXT,
        read_status BOOLEAN DEFAULT FALSE,
        action_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_read (read_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  query,
  getConnection,
  testConnection,
  initializeDatabase,
};
