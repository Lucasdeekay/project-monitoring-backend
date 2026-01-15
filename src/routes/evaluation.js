const express = require("express");
const router = express.Router();
const {
  getEvaluationsByProject,
  getEvaluationById,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
} = require("../controllers/evaluationController");
const { authenticateToken, requireRole } = require("../middleware/auth");

/**
 * @route   GET /api/evaluations/project/:projectId
 * @desc    Get all evaluations for a project
 * @access  Private (Student: own project, Supervisor: supervised project, Admin: all)
 */
router.get("/project/:projectId", authenticateToken, getEvaluationsByProject);

/**
 * @route   GET /api/evaluations/:id
 * @desc    Get single evaluation by ID
 * @access  Private (Student: own project evaluation, Supervisor/Admin: any)
 */
router.get("/:id", authenticateToken, getEvaluationById);

/**
 * @route   POST /api/evaluations
 * @desc    Create new evaluation
 * @access  Private (Supervisors and Admins only)
 */
router.post(
  "/",
  authenticateToken,
  requireRole("supervisor", "admin"),
  createEvaluation
);

/**
 * @route   PUT /api/evaluations/:id
 * @desc    Update evaluation
 * @access  Private (Evaluator who created it, Admin)
 */
router.put(
  "/:id",
  authenticateToken,
  requireRole("supervisor", "admin"),
  updateEvaluation
);

/**
 * @route   DELETE /api/evaluations/:id
 * @desc    Delete evaluation
 * @access  Private (Admins only)
 */
router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  deleteEvaluation
);

/**
 * @route   GET /api/evaluations/statistics/summary
 * @desc    Get evaluation statistics summary
 * @access  Private (Admins only)
 */
router.get(
  "/statistics/summary",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { query } = require("../config/database");

      // Get grade distribution
      const gradeDistribution = await query(`
      SELECT grade, COUNT(*) as count
      FROM evaluations
      WHERE status = 'completed'
      GROUP BY grade
      ORDER BY grade
    `);

      // Get average scores
      const avgScores = await query(`
      SELECT 
        AVG(total_score) as avg_score,
        AVG((total_score / max_total_score) * 100) as avg_percentage
      FROM evaluations
      WHERE status = 'completed'
    `);

      // Get total evaluations
      const [totalResult] = await query(`
      SELECT COUNT(*) as total
      FROM evaluations
      WHERE status = 'completed'
    `);

      // Get evaluations by department
      const departmentStats = await query(`
      SELECT 
        p.department,
        COUNT(e.id) as evaluation_count,
        AVG((e.total_score / e.max_total_score) * 100) as avg_percentage
      FROM evaluations e
      INNER JOIN projects p ON e.project_id = p.id
      WHERE e.status = 'completed'
      GROUP BY p.department
    `);

      res.json({
        success: true,
        data: {
          totalEvaluations: totalResult.total,
          gradeDistribution: gradeDistribution.map((g) => ({
            grade: g.grade,
            count: g.count,
          })),
          averageScore: avgScores[0].avg_score
            ? parseFloat(avgScores[0].avg_score).toFixed(2)
            : 0,
          averagePercentage: avgScores[0].avg_percentage
            ? parseFloat(avgScores[0].avg_percentage).toFixed(2)
            : 0,
          departmentStats: departmentStats.map((d) => ({
            department: d.department,
            evaluationCount: d.evaluation_count,
            averagePercentage: parseFloat(d.avg_percentage).toFixed(2),
          })),
        },
      });
    } catch (error) {
      console.error("Get evaluation statistics error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get statistics.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/evaluations/supervisor/completed
 * @desc    Get evaluations completed by current supervisor
 * @access  Private (Supervisors only)
 */
router.get(
  "/supervisor/completed",
  authenticateToken,
  requireRole("supervisor"),
  async (req, res) => {
    try {
      const { query } = require("../config/database");

      const evaluations = await query(
        `
      SELECT 
        e.*,
        p.title as project_title,
        s.name as student_name
      FROM evaluations e
      INNER JOIN projects p ON e.project_id = p.id
      LEFT JOIN users s ON p.student_id = s.id
      WHERE e.evaluator_id = ?
      ORDER BY e.evaluated_at DESC
    `,
        [req.user.id]
      );

      res.json({
        success: true,
        data: evaluations.map((e) => ({
          id: e.id,
          projectId: e.project_id,
          projectTitle: e.project_title,
          studentName: e.student_name,
          totalScore: e.total_score,
          maxTotalScore: e.max_total_score,
          grade: e.grade,
          status: e.status,
          evaluatedAt: e.evaluated_at,
        })),
      });
    } catch (error) {
      console.error("Get supervisor evaluations error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get evaluations.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/evaluations/student/my-evaluations
 * @desc    Get all evaluations for current student's projects
 * @access  Private (Students only)
 */
router.get(
  "/student/my-evaluations",
  authenticateToken,
  requireRole("student"),
  async (req, res) => {
    try {
      const { query } = require("../config/database");

      const evaluations = await query(
        `
      SELECT 
        e.*,
        p.title as project_title,
        u.name as evaluator_name,
        u.title as evaluator_title
      FROM evaluations e
      INNER JOIN projects p ON e.project_id = p.id
      LEFT JOIN users u ON e.evaluator_id = u.id
      WHERE p.student_id = ?
      ORDER BY e.evaluated_at DESC
    `,
        [req.user.id]
      );

      res.json({
        success: true,
        data: evaluations.map((e) => ({
          id: e.id,
          projectId: e.project_id,
          projectTitle: e.project_title,
          evaluatorId: e.evaluator_id,
          evaluatorName: e.evaluator_name,
          evaluatorTitle: e.evaluator_title,
          criteria: JSON.parse(e.criteria),
          totalScore: e.total_score,
          maxTotalScore: e.max_total_score,
          grade: e.grade,
          generalComment: e.general_comment,
          status: e.status,
          evaluatedAt: e.evaluated_at,
        })),
      });
    } catch (error) {
      console.error("Get student evaluations error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get evaluations.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
