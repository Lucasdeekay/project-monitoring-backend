const express = require('express');
const router = express.Router();
const {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @route   GET /api/projects
 * @desc    Get all projects (with filters and pagination)
 * @access  Private (All roles)
 * @query   status, department, studentId, supervisorId, search, page, limit
 */
router.get('/', authenticateToken, getAllProjects);

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project by ID
 * @access  Private (Student: own project, Supervisor: supervised project, Admin: all)
 */
router.get('/:id', authenticateToken, getProjectById);

/**
 * @route   POST /api/projects
 * @desc    Create new project
 * @access  Private (Students only)
 */
router.post('/', authenticateToken, requireRole('student'), createProject);

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Private (Student: own project, Supervisor/Admin: any project)
 */
router.put('/:id', authenticateToken, updateProject);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Private (Student: own project, Admin: any project)
 */
router.delete('/:id', authenticateToken, deleteProject);

/**
 * @route   POST /api/projects/:id/submit
 * @desc    Submit project for review
 * @access  Private (Students only - own project)
 */
router.post(
  '/:id/submit',
  authenticateToken,
  requireRole('student'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { query } = require('../config/database');

      // Get project
      const projects = await query(
        'SELECT * FROM projects WHERE id = ? AND student_id = ?',
        [id, req.user.id]
      );

      if (projects.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Project not found or access denied.',
        });
      }

      const project = projects[0];

      // Check if project can be submitted
      if (
        project.status === 'submitted' ||
        project.status === 'under_review' ||
        project.status === 'approved'
      ) {
        return res.status(400).json({
          success: false,
          message: `Project is already ${project.status}. Cannot submit again.`,
        });
      }

      // Update status to submitted
      await query(
        'UPDATE projects SET status = ?, submission_date = CURDATE() WHERE id = ?',
        ['submitted', id]
      );

      res.json({
        success: true,
        message: 'Project submitted successfully for review.',
      });
    } catch (error) {
      console.error('Submit project error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit project.',
        error:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/projects/:id/statistics
 * @desc    Get project statistics
 * @access  Private
 */
router.get('/:id/statistics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { query } = require('../config/database');

    // Get project
    const projects = await query('SELECT * FROM projects WHERE id = ?', [id]);

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const project = projects[0];

    // Authorization
    if (req.user.role === 'student' && project.student_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    if (
      req.user.role === 'supervisor' &&
      project.supervisor_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    // Get statistics
    const [documentCount] = await query(
      'SELECT COUNT(*) as count FROM documents WHERE project_id = ?',
      [id]
    );

    const [feedbackCount] = await query(
      'SELECT COUNT(*) as count FROM feedback WHERE project_id = ?',
      [id]
    );

    const [evaluationCount] = await query(
      'SELECT COUNT(*) as count FROM evaluations WHERE project_id = ?',
      [id]
    );

    const feedbackList = await query(
      'SELECT AVG(rating) as avgRating FROM feedback WHERE project_id = ? AND rating IS NOT NULL',
      [id]
    );

    res.json({
      success: true,
      data: {
        documents: documentCount.count,
        feedback: feedbackCount.count,
        evaluations: evaluationCount.count,
        averageRating: feedbackList[0].avgRating
          ? parseFloat(feedbackList[0].avgRating).toFixed(1)
          : null,
        progress: project.progress,
        status: project.status,
        daysActive: project.start_date
          ? Math.floor(
            (new Date() - new Date(project.start_date)) /
                (1000 * 60 * 60 * 24)
          )
          : 0,
      },
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
