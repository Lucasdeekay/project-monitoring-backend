const { query } = require('../config/database');

const safeJsonParse = (str, defaultValue = null) => {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

/**
 * Get evaluations for a project
 * GET /api/evaluations/project/:projectId
 */
const getEvaluationsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get project to check authorization
    const projects = await query('SELECT * FROM projects WHERE id = ?', [
      projectId,
    ]);

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const project = projects[0];

    // Authorization check
    if (req.user.role === 'student' && project.student_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message:
          'Access denied. You can only view evaluations for your own projects.',
      });
    }

    if (
      req.user.role === 'supervisor' &&
      project.supervisor_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Access denied. You can only view evaluations for projects you supervise.',
      });
    }

    // Get evaluations
    const evaluations = await query(
      `
      SELECT 
        e.*,
        u.name as evaluator_name,
        u.email as evaluator_email,
        u.title as evaluator_title
      FROM evaluations e
      LEFT JOIN users u ON e.evaluator_id = u.id
      WHERE e.project_id = ?
      ORDER BY e.evaluated_at DESC
    `,
      [projectId]
    );

    res.json({
      success: true,
      data: evaluations.map((e) => ({
        id: e.id,
        projectId: e.project_id,
        evaluatorId: e.evaluator_id,
        evaluatorName: e.evaluator_name,
        evaluatorEmail: e.evaluator_email,
        evaluatorTitle: e.evaluator_title,
        evaluatorRole: e.evaluator_role,
        criteria: safeJsonParse(e.criteria, []),
        totalScore: e.total_score,
        maxTotalScore: e.max_total_score,
        grade: e.grade,
        generalComment: e.general_comment,
        status: e.status,
        evaluatedAt: e.evaluated_at,
      })),
    });
  } catch (error) {
    console.error('Get evaluations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve evaluations.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get single evaluation by ID
 * GET /api/evaluations/:id
 */
const getEvaluationById = async (req, res) => {
  try {
    const { id } = req.params;

    const evaluations = await query(
      `
      SELECT 
        e.*,
        u.name as evaluator_name,
        u.email as evaluator_email,
        u.title as evaluator_title,
        p.title as project_title,
        p.student_id
      FROM evaluations e
      LEFT JOIN users u ON e.evaluator_id = u.id
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.id = ?
    `,
      [id]
    );

    if (evaluations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found.',
      });
    }

    const evaluation = evaluations[0];

    // Authorization check
    if (req.user.role === 'student' && evaluation.student_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    if (
      req.user.role === 'supervisor' &&
      evaluation.evaluator_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.',
      });
    }

    res.json({
      success: true,
      data: {
        id: evaluation.id,
        projectId: evaluation.project_id,
        projectTitle: evaluation.project_title,
        evaluatorId: evaluation.evaluator_id,
        evaluatorName: evaluation.evaluator_name,
        evaluatorEmail: evaluation.evaluator_email,
        evaluatorTitle: evaluation.evaluator_title,
        evaluatorRole: evaluation.evaluator_role,
        criteria: safeJsonParse(evaluation.criteria, []),
        totalScore: evaluation.total_score,
        maxTotalScore: evaluation.max_total_score,
        grade: evaluation.grade,
        generalComment: evaluation.general_comment,
        status: evaluation.status,
        evaluatedAt: evaluation.evaluated_at,
      },
    });
  } catch (error) {
    console.error('Get evaluation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve evaluation.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Create evaluation (Supervisors and Admins only)
 * POST /api/evaluations
 */
const createEvaluation = async (req, res) => {
  try {
    const { projectId, criteria, generalComment } = req.body;

    // Validation
    if (!projectId || !criteria || !Array.isArray(criteria)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide projectId and criteria array.',
      });
    }

    // Validate criteria structure
    for (const criterion of criteria) {
      if (
        !criterion.name ||
        criterion.score === undefined ||
        criterion.maxScore === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: 'Each criterion must have name, score, and maxScore.',
        });
      }

      if (criterion.score > criterion.maxScore) {
        return res.status(400).json({
          success: false,
          message: `Score cannot exceed maxScore for criterion: ${criterion.name}`,
        });
      }
    }

    // Get project to verify
    const projects = await query('SELECT * FROM projects WHERE id = ?', [
      projectId,
    ]);

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const project = projects[0];

    // Only the assigned supervisor or admin can evaluate
    if (
      req.user.role === 'supervisor' &&
      project.supervisor_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only evaluate projects you supervise.',
      });
    }

    // Check if project has been submitted
    if (project.status !== 'submitted' && project.status !== 'under_review') {
      return res.status(400).json({
        success: false,
        message: 'Project must be submitted before evaluation.',
      });
    }

    // Calculate total score
    const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
    const maxTotalScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);

    // Calculate grade
    const percentage = (totalScore / maxTotalScore) * 100;
    let grade;
    if (percentage >= 70) grade = 'A';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 45) grade = 'D';
    else if (percentage >= 40) grade = 'E';
    else grade = 'F';

    // Create evaluation
    const result = await query(
      `INSERT INTO evaluations 
       (project_id, evaluator_id, evaluator_role, criteria, total_score, 
        max_total_score, grade, general_comment, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
      [
        projectId,
        req.user.id,
        req.user.role,
        JSON.stringify(criteria),
        totalScore,
        maxTotalScore,
        grade,
        generalComment || null,
      ]
    );

    // Update project status to approved
    await query('UPDATE projects SET status = ? WHERE id = ?', [
      'approved',
      projectId,
    ]);

    // Create notification for student
    await query(
      `INSERT INTO notifications 
       (user_id, type, title, message, action_url) 
       VALUES (?, 'evaluation', ?, ?, ?)`,
      [
        project.student_id,
        'Project Evaluated',
        `Your project "${project.title}" has been evaluated. Grade: ${grade}`,
        `/student/projects/${projectId}`,
      ]
    );

    // Get created evaluation
    const evaluations = await query(
      `SELECT e.*, u.name as evaluator_name 
       FROM evaluations e
       LEFT JOIN users u ON e.evaluator_id = u.id
       WHERE e.id = ?`,
      [result.insertId]
    );

    const evaluation = evaluations[0];

    res.status(201).json({
      success: true,
      message: 'Evaluation created successfully.',
      data: {
        id: evaluation.id,
        projectId: evaluation.project_id,
        evaluatorId: evaluation.evaluator_id,
        evaluatorName: evaluation.evaluator_name,
        evaluatorRole: evaluation.evaluator_role,
        criteria: safeJsonParse(evaluation.criteria, []),
        totalScore: evaluation.total_score,
        maxTotalScore: evaluation.max_total_score,
        grade: evaluation.grade,
        percentage: percentage.toFixed(2),
        generalComment: evaluation.general_comment,
        status: evaluation.status,
        evaluatedAt: evaluation.evaluated_at,
      },
    });
  } catch (error) {
    console.error('Create evaluation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create evaluation.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update evaluation
 * PUT /api/evaluations/:id
 */
const updateEvaluation = async (req, res) => {
  try {
    const { id } = req.params;
    const { criteria, generalComment } = req.body;

    // Get evaluation
    const evaluations = await query('SELECT * FROM evaluations WHERE id = ?', [
      id,
    ]);

    if (evaluations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found.',
      });
    }

    const evaluation = evaluations[0];

    // Only the evaluator who created it or admin can update
    if (evaluation.evaluator_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own evaluations.',
      });
    }

    const updates = [];
    const values = [];

    if (criteria && Array.isArray(criteria)) {
      // Validate criteria
      for (const criterion of criteria) {
        if (
          !criterion.name ||
          criterion.score === undefined ||
          criterion.maxScore === undefined
        ) {
          return res.status(400).json({
            success: false,
            message: 'Each criterion must have name, score, and maxScore.',
          });
        }
      }

      // Recalculate scores
      const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);
      const maxTotalScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);
      const percentage = (totalScore / maxTotalScore) * 100;

      // Recalculate grade
      let grade;
      if (percentage >= 70) grade = 'A';
      else if (percentage >= 60) grade = 'B';
      else if (percentage >= 50) grade = 'C';
      else if (percentage >= 45) grade = 'D';
      else if (percentage >= 40) grade = 'E';
      else grade = 'F';

      updates.push(
        'criteria = ?',
        'total_score = ?',
        'max_total_score = ?',
        'grade = ?'
      );
      values.push(JSON.stringify(criteria), totalScore, maxTotalScore, grade);
    }

    if (generalComment !== undefined) {
      updates.push('general_comment = ?');
      values.push(generalComment);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update.',
      });
    }

    values.push(id);

    await query(
      `UPDATE evaluations SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated evaluation
    const updatedEvaluations = await query(
      `SELECT e.*, u.name as evaluator_name 
       FROM evaluations e
       LEFT JOIN users u ON e.evaluator_id = u.id
       WHERE e.id = ?`,
      [id]
    );

    const updatedEvaluation = updatedEvaluations[0];

    res.json({
      success: true,
      message: 'Evaluation updated successfully.',
      data: {
        id: updatedEvaluation.id,
        projectId: updatedEvaluation.project_id,
        evaluatorId: updatedEvaluation.evaluator_id,
        evaluatorName: updatedEvaluation.evaluator_name,
        evaluatorRole: updatedEvaluation.evaluator_role,
        criteria: safeJsonParse(updatedEvaluation.criteria, []),
        totalScore: updatedEvaluation.total_score,
        maxTotalScore: updatedEvaluation.max_total_score,
        grade: updatedEvaluation.grade,
        generalComment: updatedEvaluation.general_comment,
        status: updatedEvaluation.status,
        evaluatedAt: updatedEvaluation.evaluated_at,
      },
    });
  } catch (error) {
    console.error('Update evaluation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update evaluation.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Delete evaluation
 * DELETE /api/evaluations/:id
 */
const deleteEvaluation = async (req, res) => {
  try {
    const { id } = req.params;

    // Get evaluation
    const evaluations = await query('SELECT * FROM evaluations WHERE id = ?', [
      id,
    ]);

    if (evaluations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Evaluation not found.',
      });
    }

    const evaluation = evaluations[0];

    // Only admin can delete evaluations
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can delete evaluations.',
      });
    }

    await query('DELETE FROM evaluations WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Evaluation deleted successfully.',
    });
  } catch (error) {
    console.error('Delete evaluation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete evaluation.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getEvaluationsByProject,
  getEvaluationById,
  createEvaluation,
  updateEvaluation,
  deleteEvaluation,
};
