const { query } = require("../config/database");

/**
 * Get all feedback for a project
 * GET /api/feedback/project/:projectId
 */
const getFeedbackByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get project to check authorization
    const projects = await query("SELECT * FROM projects WHERE id = ?", [
      projectId,
    ]);

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    const project = projects[0];

    // Authorization check
    if (req.user.role === "student" && project.student_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You can only view feedback for your own projects.",
      });
    }

    if (
      req.user.role === "supervisor" &&
      project.supervisor_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You can only view feedback for projects you supervise.",
      });
    }

    // Get feedback
    const feedback = await query(
      `
      SELECT 
        f.*,
        u.name as supervisor_name,
        u.email as supervisor_email,
        u.title as supervisor_title
      FROM feedback f
      LEFT JOIN users u ON f.supervisor_id = u.id
      WHERE f.project_id = ?
      ORDER BY f.created_at DESC
    `,
      [projectId]
    );

    res.json({
      success: true,
      data: feedback.map((f) => ({
        id: f.id,
        projectId: f.project_id,
        supervisorId: f.supervisor_id,
        supervisorName: f.supervisor_name,
        supervisorEmail: f.supervisor_email,
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
    console.error("Get feedback error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve feedback.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get single feedback by ID
 * GET /api/feedback/:id
 */
const getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;

    const feedbackList = await query(
      `
      SELECT 
        f.*,
        u.name as supervisor_name,
        u.email as supervisor_email,
        u.title as supervisor_title,
        p.title as project_title,
        p.student_id
      FROM feedback f
      LEFT JOIN users u ON f.supervisor_id = u.id
      LEFT JOIN projects p ON f.project_id = p.id
      WHERE f.id = ?
    `,
      [id]
    );

    if (feedbackList.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found.",
      });
    }

    const feedback = feedbackList[0];

    // Authorization check
    if (req.user.role === "student" && feedback.student_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    if (
      req.user.role === "supervisor" &&
      feedback.supervisor_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    // Mark as read if student is viewing
    if (req.user.role === "student" && feedback.status === "unread") {
      await query("UPDATE feedback SET status = ? WHERE id = ?", ["read", id]);
    }

    res.json({
      success: true,
      data: {
        id: feedback.id,
        projectId: feedback.project_id,
        projectTitle: feedback.project_title,
        supervisorId: feedback.supervisor_id,
        supervisorName: feedback.supervisor_name,
        supervisorEmail: feedback.supervisor_email,
        supervisorTitle: feedback.supervisor_title,
        type: feedback.type,
        subject: feedback.subject,
        message: feedback.message,
        rating: feedback.rating,
        status: feedback.status,
        createdAt: feedback.created_at,
      },
    });
  } catch (error) {
    console.error("Get feedback error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve feedback.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Create feedback (Supervisors only)
 * POST /api/feedback
 */
const createFeedback = async (req, res) => {
  try {
    const { projectId, type, subject, message, rating } = req.body;

    // Validation
    if (!projectId || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide projectId, subject, and message.",
      });
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5.",
      });
    }

    // Get project to verify supervisor
    const projects = await query("SELECT * FROM projects WHERE id = ?", [
      projectId,
    ]);

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    const project = projects[0];

    // Only the assigned supervisor can give feedback
    if (
      req.user.role === "supervisor" &&
      project.supervisor_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You can only provide feedback for projects you supervise.",
      });
    }

    // Create feedback
    const result = await query(
      `INSERT INTO feedback 
       (project_id, supervisor_id, type, subject, message, rating, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'unread')`,
      [
        projectId,
        req.user.id,
        type || "general",
        subject,
        message,
        rating || null,
      ]
    );

    // Create notification for student
    await query(
      `INSERT INTO notifications 
       (user_id, type, title, message, action_url) 
       VALUES (?, 'feedback', ?, ?, ?)`,
      [
        project.student_id,
        "New Feedback Received",
        `You have received feedback on "${project.title}"`,
        `/student/projects/${projectId}`,
      ]
    );

    // Get created feedback
    const feedbackList = await query(
      `SELECT f.*, u.name as supervisor_name 
       FROM feedback f
       LEFT JOIN users u ON f.supervisor_id = u.id
       WHERE f.id = ?`,
      [result.insertId]
    );

    const feedback = feedbackList[0];

    res.status(201).json({
      success: true,
      message: "Feedback created successfully.",
      data: {
        id: feedback.id,
        projectId: feedback.project_id,
        supervisorId: feedback.supervisor_id,
        supervisorName: feedback.supervisor_name,
        type: feedback.type,
        subject: feedback.subject,
        message: feedback.message,
        rating: feedback.rating,
        status: feedback.status,
        createdAt: feedback.created_at,
      },
    });
  } catch (error) {
    console.error("Create feedback error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create feedback.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update feedback
 * PUT /api/feedback/:id
 */
const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message, rating, type } = req.body;

    // Get feedback
    const feedbackList = await query("SELECT * FROM feedback WHERE id = ?", [
      id,
    ]);

    if (feedbackList.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found.",
      });
    }

    const feedback = feedbackList[0];

    // Only the supervisor who created the feedback can update it
    if (feedback.supervisor_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only update your own feedback.",
      });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (subject) {
      updates.push("subject = ?");
      values.push(subject);
    }
    if (message) {
      updates.push("message = ?");
      values.push(message);
    }
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5.",
        });
      }
      updates.push("rating = ?");
      values.push(rating);
    }
    if (type) {
      updates.push("type = ?");
      values.push(type);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update.",
      });
    }

    values.push(id);

    await query(
      `UPDATE feedback SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    // Get updated feedback
    const updatedFeedback = await query(
      `SELECT f.*, u.name as supervisor_name 
       FROM feedback f
       LEFT JOIN users u ON f.supervisor_id = u.id
       WHERE f.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: "Feedback updated successfully.",
      data: {
        id: updatedFeedback[0].id,
        projectId: updatedFeedback[0].project_id,
        supervisorId: updatedFeedback[0].supervisor_id,
        supervisorName: updatedFeedback[0].supervisor_name,
        type: updatedFeedback[0].type,
        subject: updatedFeedback[0].subject,
        message: updatedFeedback[0].message,
        rating: updatedFeedback[0].rating,
        status: updatedFeedback[0].status,
        createdAt: updatedFeedback[0].created_at,
      },
    });
  } catch (error) {
    console.error("Update feedback error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update feedback.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Delete feedback
 * DELETE /api/feedback/:id
 */
const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;

    // Get feedback
    const feedbackList = await query("SELECT * FROM feedback WHERE id = ?", [
      id,
    ]);

    if (feedbackList.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found.",
      });
    }

    const feedback = feedbackList[0];

    // Only the supervisor who created the feedback or admin can delete it
    if (feedback.supervisor_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own feedback.",
      });
    }

    await query("DELETE FROM feedback WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Feedback deleted successfully.",
    });
  } catch (error) {
    console.error("Delete feedback error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete feedback.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Mark feedback as read
 * PUT /api/feedback/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const feedbackList = await query(
      `SELECT f.*, p.student_id 
       FROM feedback f
       LEFT JOIN projects p ON f.project_id = p.id
       WHERE f.id = ?`,
      [id]
    );

    if (feedbackList.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found.",
      });
    }

    const feedback = feedbackList[0];

    // Only the student can mark feedback as read
    if (req.user.role !== "student" || feedback.student_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    await query("UPDATE feedback SET status = ? WHERE id = ?", ["read", id]);

    res.json({
      success: true,
      message: "Feedback marked as read.",
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark feedback as read.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getFeedbackByProject,
  getFeedbackById,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  markAsRead,
};
