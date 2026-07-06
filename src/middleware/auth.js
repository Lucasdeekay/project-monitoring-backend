const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Verify JWT token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const users = await query(
      'SELECT id, name, email, role, department, phone, matric_number, title, specialization, level FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
      });
    }

    // Attach user to request
    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
      });
    }

    logger.error('Auth middleware error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
};

/**
 * Check if user has required role(s)
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        requiredRole: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Optional authentication - attach user if token exists, but don't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const users = await query(
      'SELECT id, name, email, role, department, phone, matric_number, title, specialization, level FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length > 0) {
      req.user = users[0];
    }

    next();
  } catch {
    // Continue without user if token is invalid
    next();
  }
};

/**
 * Check if user owns the resource or is admin
 */
const requireOwnershipOrAdmin = (resourceUserIdField = 'student_id') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Admins can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const _resourceId = req.params.id;

    try {
      // Get resource from database to check ownership
      // This will be customized based on the resource type
      const isOwner = req.user.id === req[resourceUserIdField];

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.',
        });
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Error checking resource ownership.',
      });
    }
  };
};

/**
 * Rate limiting middleware (basic implementation)
 */
const requestLog = {};

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const userKey = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'global';
    const now = Date.now();

    if (!requestLog[userKey]) {
      requestLog[userKey] = [];
    }

    // Remove old requests outside the time window
    requestLog[userKey] = requestLog[userKey].filter(timestamp => now - timestamp < windowMs);

    if (requestLog[userKey].length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    requestLog[userKey].push(now);
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth,
  requireOwnershipOrAdmin,
  rateLimit,
};
