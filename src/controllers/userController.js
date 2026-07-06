const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get all users (with filters)
 * GET /api/users
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, department, search, page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause
    const conditions = [];
    const params = [];

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }

    if (department) {
      conditions.push('department = ?');
      params.push(department);
    }

    if (search) {
      conditions.push('(name LIKE ? OR email LIKE ? OR matric_number LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const [countResult] = await query(countQuery, params);
    const total = countResult.total;

    // Get users
    const usersQuery = `
      SELECT 
        id, name, email, role, department, phone, matric_number,
        title, specialization, level, avatar, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const users = await query(usersQuery, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        phone: u.phone,
        matricNumber: u.matric_number,
        title: u.title,
        specialization: u.specialization,
        level: u.level,
        avatar: u.avatar,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get user by ID
 * GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const users = await query(
      `SELECT 
        id, name, email, role, department, phone, matric_number,
        title, specialization, level, avatar, created_at, updated_at
       FROM users WHERE id = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const user = users[0];

    // Get additional stats based on role
    let stats = {};

    if (user.role === 'student') {
      const [projectCount] = await query(
        'SELECT COUNT(*) as count FROM projects WHERE student_id = ?',
        [id]
      );
      const [feedbackCount] = await query(
        `SELECT COUNT(*) as count FROM feedback f
         INNER JOIN projects p ON f.project_id = p.id
         WHERE p.student_id = ?`,
        [id]
      );
      stats = {
        projectCount: projectCount.count,
        feedbackReceived: feedbackCount.count,
      };
    } else if (user.role === 'supervisor') {
      const [projectCount] = await query(
        'SELECT COUNT(*) as count FROM projects WHERE supervisor_id = ?',
        [id]
      );
      const [feedbackCount] = await query(
        'SELECT COUNT(*) as count FROM feedback WHERE supervisor_id = ?',
        [id]
      );
      const [evaluationCount] = await query(
        'SELECT COUNT(*) as count FROM evaluations WHERE evaluator_id = ?',
        [id]
      );
      stats = {
        projectsSupervised: projectCount.count,
        feedbackGiven: feedbackCount.count,
        evaluationsCompleted: evaluationCount.count,
      };
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        matricNumber: user.matric_number,
        title: user.title,
        specialization: user.specialization,
        level: user.level,
        avatar: user.avatar,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        stats,
      },
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Create new user (Admin only)
 * POST /api/users
 */
const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department,
      phone,
      matricNumber,
      title,
      specialization,
      level,
    } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and role.',
      });
    }

    // Validate role
    const validRoles = ['student', 'supervisor', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role.',
      });
    }

    // Check if email exists
    const existingUsers = await query('SELECT id FROM users WHERE email = ?', [
      email,
    ]);

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists.',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const result = await query(
      `INSERT INTO users 
       (name, email, password, role, department, phone, matric_number, 
        title, specialization, level) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        hashedPassword,
        role,
        department || null,
        phone || null,
        matricNumber || null,
        title || null,
        specialization || null,
        level || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: {
        id: result.insertId,
        name,
        email,
        role,
      },
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update user (Admin only)
 * PUT /api/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      role,
      department,
      phone,
      matricNumber,
      title,
      specialization,
      level,
    } = req.body;

    // Check if user exists
    const users = await query('SELECT * FROM users WHERE id = ?', [id]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Check if email is being changed to an existing email
    if (email && email !== users[0].email) {
      const existingUsers = await query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use.',
        });
      }
    }

    // Build update query
    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    if (role) {
      const validRoles = ['student', 'supervisor', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role.',
        });
      }
      updates.push('role = ?');
      values.push(role);
    }
    if (department !== undefined) {
      updates.push('department = ?');
      values.push(department);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (matricNumber !== undefined) {
      updates.push('matric_number = ?');
      values.push(matricNumber);
    }
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (specialization !== undefined) {
      updates.push('specialization = ?');
      values.push(specialization);
    }
    if (level !== undefined) {
      updates.push('level = ?');
      values.push(level);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update.',
      });
    }

    values.push(id);

    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    // Get updated user
    const updatedUsers = await query(
      `SELECT id, name, email, role, department, phone, matric_number,
              title, specialization, level
       FROM users WHERE id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'User updated successfully.',
      data: updatedUsers[0],
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Delete user (Admin only)
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const users = await query('SELECT * FROM users WHERE id = ?', [id]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    // Delete user (cascade will handle related records)
    await query('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'User deleted successfully.',
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get supervisors list
 * GET /api/users/supervisors/list
 */
const getSupervisorsList = async (req, res) => {
  try {
    const supervisors = await query(
      `SELECT 
        id, name, email, department, title, specialization, phone
       FROM users 
       WHERE role = 'supervisor'
       ORDER BY name ASC`
    );

    res.json({
      success: true,
      data: supervisors.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        department: s.department,
        title: s.title,
        specialization: s.specialization,
        phone: s.phone,
      })),
    });
  } catch (error) {
    logger.error('Get supervisors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve supervisors.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getSupervisorsList,
};
