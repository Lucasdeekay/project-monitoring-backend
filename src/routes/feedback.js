const express = require("express");
const router = express.Router();
const {
  getFeedbackByProject,
  getFeedbackById,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  markAsRead,
} = require("../controllers/feedbackController");
const { authenticateToken, requireRole } = require("../middleware/auth");

/**
 * @route   GET /api/feedback/project/:projectId
 * @desc    Get all feedback for a project
 * @access  Private (Student: own project, Supervisor: supervised project, Admin: all)
 */
router.get("/project/:projectId", authenticateToken, getFeedbackByProject);

/**
 * @route   GET /api/feedback/:id
 * @desc    Get single feedback by ID
 * @access  Private (Student: own project feedback, Supervisor: own feedback, Admin: all)
 */
router.get("/:id", authenticateToken, getFeedbackById);

/**
 * @route   POST /api/feedback
 * @desc    Create new feedback
 * @access  Private (Supervisors and Admins only)
 */
router.post(
  "/",
  authenticateToken,
  requireRole("supervisor", "admin"),
  createFeedback
);

/**
 * @route   PUT /api/feedback/:id
 * @desc    Update feedback
 * @access  Private (Supervisor who created it, Admin)
 */
router.put(
  "/:id",
  authenticateToken,
  requireRole("supervisor", "admin"),
  updateFeedback
);

/**
 * @route   DELETE /api/feedback/:id
 * @desc    Delete feedback
 * @access  Private (Supervisor who created it, Admin)
 */
router.delete(
  "/:id",
  authenticateToken,
  requireRole("supervisor", "admin"),
  deleteFeedback
);

/**
 * @route   PUT /api/feedback/:id/read
 * @desc    Mark feedback as read
 * @access  Private (Students only - for their own project feedback)
 */
router.put("/:id/read", authenticateToken, requireRole("student"), markAsRead);

/**
 * @route   GET /api/feedback/unread/count
 * @desc    Get count of unread feedback for current student
 * @access  Private (Students only)
 */
router.get(
  "/unread/count",
  authenticateToken,
  requireRole("student"),
  async (req, res) => {
    try {
      const { query } = require("../config/database");

      const result = await query(
        `
      SELECT COUNT(*) as count
      FROM feedback f
      INNER JOIN projects p ON f.project_id = p.id
      WHERE p.student_id = ? AND f.status = 'unread'
    `,
        [req.user.id]
      );

      res.json({
        success: true,
        data: {
          unreadCount: result[0].count,
        },
      });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get unread count.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/feedback/student/all
 * @desc    Get all feedback for current student (across all projects)
 * @access  Private (Students only)
 */
router.get(
  "/student/all",
  authenticateToken,
  requireRole("student"),
  async (req, res) => {
    try {
      const { query } = require("../config/database");

      const feedback = await query(
        `
      SELECT 
        f.*,
        u.name as supervisor_name,
        u.title as supervisor_title,
        p.title as project_title,
        p.id as project_id
      FROM feedback f
      INNER JOIN projects p ON f.project_id = p.id
      LEFT JOIN users u ON f.supervisor_id = u.id
      WHERE p.student_id = ?
      ORDER BY f.created_at DESC
    `,
        [req.user.id]
      );

      res.json({
        success: true,
        data: feedback.map((f) => ({
          id: f.id,
          projectId: f.project_id,
          projectTitle: f.project_title,
          supervisorId: f.supervisor_id,
          supervisorName: f.supervisor_name,
          supervisorTitle: f.supervisor_title,
          type: f.type,
          subject: f.subject,
          message: f.message,
          rating: f.rating,
          status: f.status,
          createdAt: f.created_at,
        })),
      });
    } catch (error) {
      console.error("Get student feedback error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get feedback.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/feedback/supervisor/given
 * @desc    Get all feedback given by current supervisor
 * @access  Private (Supervisors only)
 */
router.get(
  "/supervisor/given",
  authenticateToken,
  requireRole("supervisor"),
  async (req, res) => {
    try {
      const { query } = require("../config/database");

      const feedback = await query(
        `
      SELECT 
        f.*,
        p.title as project_title,
        p.id as project_id,
        s.name as student_name
      FROM feedback f
      INNER JOIN projects p ON f.project_id = p.id
      LEFT JOIN users s ON p.student_id = s.id
      WHERE f.supervisor_id = ?
      ORDER BY f.created_at DESC
    `,
        [req.user.id]
      );

      res.json({
        success: true,
        data: feedback.map((f) => ({
          id: f.id,
          projectId: f.project_id,
          projectTitle: f.project_title,
          studentName: f.student_name,
          type: f.type,
          subject: f.subject,
          message: f.message,
          rating: f.rating,
          status: f.status,
          createdAt: f.created_at,
        })),
      });
    } catch (error) {
      console.error("Get supervisor feedback error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get feedback.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
