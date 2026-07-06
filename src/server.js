const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const logger = require('./utils/logger');
const { testConnection, initializeDatabase } = require('./config/database');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'https://project-monitoring-backend-ix33.onrender.com',
  'https://project-monitoring-system.vercel.app',
];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(process.env.UPLOAD_PATH || path.join(__dirname, '../uploads')));

// Request logging middleware
app.use(logger.request);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Project Monitoring API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/evaluations', require('./routes/evaluations'));
app.use('/api/users', require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/documents', require('./routes/documents'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Project Monitoring & Evaluation System API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      projects: '/api/projects',
      feedback: '/api/feedback',
      evaluations: '/api/evaluations',
      users: '/api/users',
      reports: '/api/reports',
      notifications: '/api/notifications',
      documents: '/api/documents',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  logger.error(err.message, err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Server configuration
const PORT = process.env.PORT || 5000;

// Start server function
const startServer = async () => {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.error('Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Initialize database tables
    logger.info('Initializing database...');
    await initializeDatabase();

    // Start Express server
    const serverUrl = `http://0.0.0.0:${PORT}`;
    app.listen(PORT, () => {
      logger.info('');
      logger.info('═══════════════════════════════════════════════════════');
      logger.info('🚀 Project Monitoring API Server');
      logger.info('═══════════════════════════════════════════════════════');
      logger.info(`📡 Server running on: ${serverUrl}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📊 Health check: ${serverUrl}/api/health`);
      logger.info(`🔗 Frontend URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      logger.info('═══════════════════════════════════════════════════════');
      logger.info('');
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', error => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
