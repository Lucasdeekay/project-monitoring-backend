const { query, getConnection } = require('../config/database');

const safeJsonParse = (str, defaultValue = []) => {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

/**
 * Get all projects (with filters and pagination)
 * GET /api/projects
 */
const getAllProjects = async (req, res) => {
  try {
    const {
      status,
      department,
      studentId,
      supervisorId,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause dynamically
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }

    if (department) {
      conditions.push('p.department = ?');
      params.push(department);
    }

    if (studentId) {
      conditions.push('p.student_id = ?');
      params.push(studentId);
    }

    if (supervisorId) {
      conditions.push('p.supervisor_id = ?');
      params.push(supervisorId);
    }

    if (search) {
      conditions.push('(p.title LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    // Role-based filtering
    if (req.user.role === 'student') {
      conditions.push('p.student_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'supervisor') {
      conditions.push('p.supervisor_id = ?');
      params.push(req.user.id);
    }
    // Admins can see all projects

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM projects p 
      ${whereClause}
    `;
    const [countResult] = await query(countQuery, params);
    const total = countResult.total;

    // Get projects
    const projectsQuery = `
      SELECT 
        p.*,
        s.name as student_name,
        s.email as student_email,
        s.matric_number,
        sup.name as supervisor_name,
        sup.email as supervisor_email,
        sup.title as supervisor_title
      FROM projects p
      LEFT JOIN users s ON p.student_id = s.id
      LEFT JOIN users sup ON p.supervisor_id = sup.id
      ${whereClause}
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const projects = await query(projectsQuery, [
      ...params,
      parseInt(limit),
      offset,
    ]);

    // Parse JSON fields
    const formattedProjects = projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      studentId: project.student_id,
      studentName: project.student_name,
      studentEmail: project.student_email,
      matricNumber: project.matric_number,
      supervisorId: project.supervisor_id,
      supervisorName: project.supervisor_name,
      supervisorEmail: project.supervisor_email,
      supervisorTitle: project.supervisor_title,
      department: project.department,
      status: project.status,
      progress: project.progress,
      startDate: project.start_date,
      submissionDate: project.submission_date,
      expectedCompletionDate: project.expected_completion_date,
      objectives: safeJsonParse(project.objectives),
      technologies: safeJsonParse(project.technologies),
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    }));

    res.json({
      success: true,
      data: formattedProjects,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve projects.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get single project by ID
 * GET /api/projects/:id
 */
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const projects = await query(
      `
      SELECT 
        p.*,
        s.name as student_name,
        s.email as student_email,
        s.matric_number,
        s.phone as student_phone,
        sup.name as supervisor_name,
        sup.email as supervisor_email,
        sup.title as supervisor_title,
        sup.phone as supervisor_phone
      FROM projects p
      LEFT JOIN users s ON p.student_id = s.id
      LEFT JOIN users sup ON p.supervisor_id = sup.id
      WHERE p.id = ?
    `,
      [id]
    );

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const project = projects[0];

    // Check authorization
    if (req.user.role === 'student' && project.student_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own projects.',
      });
    }

    if (
      req.user.role === 'supervisor' &&
      project.supervisor_id !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view projects you supervise.',
      });
    }

    // Get documents
    const documents = await query(
      'SELECT * FROM documents WHERE project_id = ? ORDER BY upload_date DESC',
      [id]
    );

    const formattedProject = {
      id: project.id,
      title: project.title,
      description: project.description,
      student: {
        id: project.student_id,
        name: project.student_name,
        email: project.student_email,
        matricNumber: project.matric_number,
        phone: project.student_phone,
      },
      supervisor: {
        id: project.supervisor_id,
        name: project.supervisor_name,
        email: project.supervisor_email,
        title: project.supervisor_title,
        phone: project.supervisor_phone,
      },
      department: project.department,
      status: project.status,
      progress: project.progress,
      startDate: project.start_date,
      submissionDate: project.submission_date,
      expectedCompletionDate: project.expected_completion_date,
      objectives: safeJsonParse(project.objectives),
      technologies: safeJsonParse(project.technologies),
      documents: documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        filePath: doc.file_path,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        uploadDate: doc.upload_date,
      })),
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    };

    res.json({
      success: true,
      data: formattedProject,
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve project.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Create new project
 * POST /api/projects
 */
const createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      supervisorId,
      department,
      expectedCompletionDate,
      objectives,
      technologies,
    } = req.body;

    // Validation
    if (!title || !supervisorId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and supervisor.',
      });
    }

    // Only students can create projects
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can create projects.',
      });
    }

    // Verify supervisor exists and is a supervisor
    const supervisors = await query(
      'SELECT id, role FROM users WHERE id = ? AND role = ?',
      [supervisorId, 'supervisor']
    );

    if (supervisors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid supervisor ID.',
      });
    }

    // Create project
    const result = await query(
      `INSERT INTO projects 
       (title, description, student_id, supervisor_id, department, 
        expected_completion_date, objectives, technologies, start_date, status, progress) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'draft', 0)`,
      [
        title,
        description || null,
        req.user.id,
        supervisorId,
        department || req.user.department,
        expectedCompletionDate || null,
        objectives ? JSON.stringify(objectives) : null,
        technologies ? JSON.stringify(technologies) : null,
      ]
    );

    // Get created project
    const projects = await query(
      `SELECT p.*, s.name as student_name, sup.name as supervisor_name 
       FROM projects p
       LEFT JOIN users s ON p.student_id = s.id
       LEFT JOIN users sup ON p.supervisor_id = sup.id
       WHERE p.id = ?`,
      [result.insertId]
    );

    const project = projects[0];

    res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      data: {
        id: project.id,
        title: project.title,
        description: project.description,
        studentId: project.student_id,
        studentName: project.student_name,
        supervisorId: project.supervisor_id,
        supervisorName: project.supervisor_name,
        department: project.department,
        status: project.status,
        progress: project.progress,
        startDate: project.start_date,
        expectedCompletionDate: project.expected_completion_date,
        objectives: safeJsonParse(project.objectives),
        technologies: safeJsonParse(project.technologies),
        createdAt: project.created_at,
      },
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update project
 * PUT /api/projects/:id
 */
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      progress,
      expectedCompletionDate,
      objectives,
      technologies,
    } = req.body;

    // Get project
    const projects = await query('SELECT * FROM projects WHERE id = ?', [id]);

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
        message: 'Access denied. You can only update your own projects.',
      });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (title) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (
      status &&
      (req.user.role === 'supervisor' ||
        req.user.role === 'admin' ||
        req.user.id === project.student_id)
    ) {
      updates.push('status = ?');
      values.push(status);

      // Set submission date when status changes to submitted
      if (status === 'submitted' && !project.submission_date) {
        updates.push('submission_date = CURDATE()');
      }
    }
    if (
      progress !== undefined &&
      (req.user.role === 'student' ||
        req.user.role === 'supervisor' ||
        req.user.role === 'admin')
    ) {
      updates.push('progress = ?');
      values.push(Math.min(100, Math.max(0, progress)));
    }
    if (expectedCompletionDate) {
      updates.push('expected_completion_date = ?');
      values.push(expectedCompletionDate);
    }
    if (objectives) {
      updates.push('objectives = ?');
      values.push(JSON.stringify(objectives));
    }
    if (technologies) {
      updates.push('technologies = ?');
      values.push(JSON.stringify(technologies));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update.',
      });
    }

    values.push(id);

    await query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated project
    const updatedProjects = await query(
      `SELECT p.*, s.name as student_name, sup.name as supervisor_name 
       FROM projects p
       LEFT JOIN users s ON p.student_id = s.id
       LEFT JOIN users sup ON p.supervisor_id = sup.id
       WHERE p.id = ?`,
      [id]
    );

    const updatedProject = updatedProjects[0];

    res.json({
      success: true,
      message: 'Project updated successfully.',
      data: {
        id: updatedProject.id,
        title: updatedProject.title,
        description: updatedProject.description,
        studentId: updatedProject.student_id,
        studentName: updatedProject.student_name,
        supervisorId: updatedProject.supervisor_id,
        supervisorName: updatedProject.supervisor_name,
        department: updatedProject.department,
        status: updatedProject.status,
        progress: updatedProject.progress,
        startDate: updatedProject.start_date,
        submissionDate: updatedProject.submission_date,
        expectedCompletionDate: updatedProject.expected_completion_date,
        objectives: safeJsonParse(updatedProject.objectives),
        technologies: safeJsonParse(updatedProject.technologies),
        updatedAt: updatedProject.updated_at,
      },
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Delete project
 * DELETE /api/projects/:id
 */
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    // Get project
    const projects = await query('SELECT * FROM projects WHERE id = ?', [id]);

    if (projects.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    const project = projects[0];

    // Authorization check - only student owner or admin can delete
    if (req.user.role === 'student' && project.student_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own projects.',
      });
    }

    if (req.user.role === 'supervisor') {
      return res.status(403).json({
        success: false,
        message: 'Supervisors cannot delete projects.',
      });
    }

    // Delete project (cascade will delete related documents, feedback, evaluations)
    await query('DELETE FROM projects WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Project deleted successfully.',
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete project.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
