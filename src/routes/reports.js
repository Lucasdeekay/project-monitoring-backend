const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getDepartmentReport,
  getStudentReport,
  getSupervisorReport,
  getTimelineReport,
} = require('../controllers/reportController');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @route   GET /api/reports/dashboard
 * @desc    Get overall system statistics
 * @access  Private (Admins only)
 */
router.get(
  '/dashboard',
  authenticateToken,
  requireRole('admin'),
  getDashboardStats
);

/**
 * @route   GET /api/reports/department/:department
 * @desc    Get department-specific report
 * @access  Private (Admins only)
 */
router.get(
  '/department/:department',
  authenticateToken,
  requireRole('admin'),
  getDepartmentReport
);

/**
 * @route   GET /api/reports/student/:studentId
 * @desc    Get student performance report
 * @access  Private (Student: own report, Supervisor: supervised students, Admin: all)
 */
router.get('/student/:studentId', authenticateToken, getStudentReport);

/**
 * @route   GET /api/reports/supervisor/:supervisorId
 * @desc    Get supervisor performance report
 * @access  Private (Supervisor: own report, Admin: all)
 */
router.get('/supervisor/:supervisorId', authenticateToken, getSupervisorReport);

/**
 * @route   GET /api/reports/timeline
 * @desc    Get project timeline report
 * @access  Private (Admins only)
 * @query   startDate, endDate
 */
router.get(
  '/timeline',
  authenticateToken,
  requireRole('admin'),
  getTimelineReport
);

module.exports = router;

