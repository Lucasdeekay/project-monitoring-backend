const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get overall system statistics
 * GET /api/reports/dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    // Total counts
    const [projectCount] = await query('SELECT COUNT(*) as count FROM projects');
    const [userCount] = await query('SELECT COUNT(*) as count FROM users');
    const [studentCount] = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', [
      'student',
    ]);
    const [supervisorCount] = await query('SELECT COUNT(*) as count FROM users WHERE role = ?', [
      'supervisor',
    ]);

    // Projects by status
    const projectsByStatus = await query(`
      SELECT status, COUNT(*) as count
      FROM projects
      GROUP BY status
    `);

    // Projects by department
    const projectsByDepartment = await query(`
      SELECT department, COUNT(*) as count
      FROM projects
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY count DESC
    `);

    // Average progress
    const [avgProgress] = await query(`
      SELECT AVG(progress) as avg_progress
      FROM projects
    `);

    // Recent submissions
    const recentSubmissions = await query(`
      SELECT COUNT(*) as count
      FROM projects
      WHERE submission_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `);

    // Pending reviews
    const [pendingReviews] = await query(`
      SELECT COUNT(*) as count
      FROM projects
      WHERE status IN ('submitted', 'under_review')
    `);

    res.json({
      success: true,
      data: {
        totalProjects: projectCount.count,
        totalUsers: userCount.count,
        totalStudents: studentCount.count,
        totalSupervisors: supervisorCount.count,
        projectsByStatus: projectsByStatus.reduce((acc, p) => {
          acc[p.status] = p.count;
          return acc;
        }, {}),
        projectsByDepartment: projectsByDepartment.map(d => ({
          department: d.department,
          count: d.count,
        })),
        averageProgress: avgProgress.avg_progress
          ? parseFloat(avgProgress.avg_progress).toFixed(2)
          : 0,
        recentSubmissions: recentSubmissions[0].count,
        pendingReviews: pendingReviews.count,
      },
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get department-specific report
 * GET /api/reports/department/:department
 */
const getDepartmentReport = async (req, res) => {
  try {
    const { department } = req.params;

    // Total projects in department
    const [projectCount] = await query(
      'SELECT COUNT(*) as count FROM projects WHERE department = ?',
      [department]
    );

    // Students in department
    const [studentCount] = await query(
      'SELECT COUNT(*) as count FROM users WHERE department = ? AND role = ?',
      [department, 'student']
    );

    // Supervisors in department
    const [supervisorCount] = await query(
      'SELECT COUNT(*) as count FROM users WHERE department = ? AND role = ?',
      [department, 'supervisor']
    );

    // Projects by status
    const projectsByStatus = await query(
      `
      SELECT status, COUNT(*) as count
      FROM projects
      WHERE department = ?
      GROUP BY status
    `,
      [department]
    );

    // Average progress
    const [avgProgress] = await query(
      `
      SELECT AVG(progress) as avg_progress
      FROM projects
      WHERE department = ?
    `,
      [department]
    );

    // Grade distribution
    const gradeDistribution = await query(
      `
      SELECT e.grade, COUNT(*) as count
      FROM evaluations e
      INNER JOIN projects p ON e.project_id = p.id
      WHERE p.department = ?
      GROUP BY e.grade
      ORDER BY e.grade
    `,
      [department]
    );

    res.json({
      success: true,
      data: {
        department,
        totalProjects: projectCount.count,
        totalStudents: studentCount.count,
        totalSupervisors: supervisorCount.count,
        projectsByStatus: projectsByStatus.reduce((acc, p) => {
          acc[p.status] = p.count;
          return acc;
        }, {}),
        averageProgress: avgProgress.avg_progress
          ? parseFloat(avgProgress.avg_progress).toFixed(2)
          : 0,
        gradeDistribution: gradeDistribution.map(g => ({
          grade: g.grade,
          count: g.count,
        })),
      },
    });
  } catch (error) {
    logger.error('Get department report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department report.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get student performance report
 * GET /api/reports/student/:studentId
 */
const getStudentReport = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get student info
    const students = await query(
      'SELECT id, name, email, matric_number, department FROM users WHERE id = ? AND role = ?',
      [studentId, 'student']
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    const student = students[0];

    // Get projects
    const projects = await query(
      `
      SELECT 
        p.*,
        u.name as supervisor_name
      FROM projects p
      LEFT JOIN users u ON p.supervisor_id = u.id
      WHERE p.student_id = ?
      ORDER BY p.created_at DESC
    `,
      [studentId]
    );

    // Get feedback count
    const [feedbackCount] = await query(
      `
      SELECT COUNT(*) as count
      FROM feedback f
      INNER JOIN projects p ON f.project_id = p.id
      WHERE p.student_id = ?
    `,
      [studentId]
    );

    // Get evaluations
    const evaluations = await query(
      `
      SELECT 
        e.*,
        p.title as project_title
      FROM evaluations e
      INNER JOIN projects p ON e.project_id = p.id
      WHERE p.student_id = ?
    `,
      [studentId]
    );

    // Calculate average grade
    let averageGrade = null;
    if (evaluations.length > 0) {
      const totalScore = evaluations.reduce((sum, e) => sum + e.total_score, 0);
      const maxScore = evaluations.reduce((sum, e) => sum + e.max_total_score, 0);
      averageGrade = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(2) : 0;
    }

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          matricNumber: student.matric_number,
          department: student.department,
        },
        statistics: {
          totalProjects: projects.length,
          feedbackReceived: feedbackCount.count,
          evaluationsCompleted: evaluations.length,
          averageGrade,
        },
        projects: projects.map(p => ({
          id: p.id,
          title: p.title,
          status: p.status,
          progress: p.progress,
          supervisorName: p.supervisor_name,
          startDate: p.start_date,
          submissionDate: p.submission_date,
        })),
        evaluations: evaluations.map(e => ({
          id: e.id,
          projectTitle: e.project_title,
          grade: e.grade,
          totalScore: e.total_score,
          maxTotalScore: e.max_total_score,
          evaluatedAt: e.evaluated_at,
        })),
      },
    });
  } catch (error) {
    logger.error('Get student report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve student report.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get supervisor performance report
 * GET /api/reports/supervisor/:supervisorId
 */
const getSupervisorReport = async (req, res) => {
  try {
    const { supervisorId } = req.params;

    // Get supervisor info
    const supervisors = await query(
      'SELECT id, name, email, title, department, specialization FROM users WHERE id = ? AND role = ?',
      [supervisorId, 'supervisor']
    );

    if (supervisors.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supervisor not found.',
      });
    }

    const supervisor = supervisors[0];

    // Get supervised projects
    const [projectCount] = await query(
      'SELECT COUNT(*) as count FROM projects WHERE supervisor_id = ?',
      [supervisorId]
    );

    // Get projects by status
    const projectsByStatus = await query(
      `
      SELECT status, COUNT(*) as count
      FROM projects
      WHERE supervisor_id = ?
      GROUP BY status
    `,
      [supervisorId]
    );

    // Get feedback given
    const [feedbackCount] = await query(
      'SELECT COUNT(*) as count FROM feedback WHERE supervisor_id = ?',
      [supervisorId]
    );

    // Get evaluations completed
    const [evaluationCount] = await query(
      'SELECT COUNT(*) as count FROM evaluations WHERE evaluator_id = ?',
      [supervisorId]
    );

    // Get students supervised
    const students = await query(
      `
      SELECT DISTINCT
        u.id,
        u.name,
        u.email,
        u.matric_number,
        p.title as project_title,
        p.status as project_status,
        p.progress
      FROM users u
      INNER JOIN projects p ON u.id = p.student_id
      WHERE p.supervisor_id = ?
      ORDER BY u.name
    `,
      [supervisorId]
    );

    res.json({
      success: true,
      data: {
        supervisor: {
          id: supervisor.id,
          name: supervisor.name,
          email: supervisor.email,
          title: supervisor.title,
          department: supervisor.department,
          specialization: supervisor.specialization,
        },
        statistics: {
          projectsSupervised: projectCount.count,
          feedbackGiven: feedbackCount.count,
          evaluationsCompleted: evaluationCount.count,
          studentsSupervised: students.length,
        },
        projectsByStatus: projectsByStatus.reduce((acc, p) => {
          acc[p.status] = p.count;
          return acc;
        }, {}),
        students: students.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email,
          matricNumber: s.matric_number,
          projectTitle: s.project_title,
          projectStatus: s.project_status,
          progress: s.progress,
        })),
      },
    });
  } catch (error) {
    logger.error('Get supervisor report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve supervisor report.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get project timeline report
 * GET /api/reports/timeline
 */
const getTimelineReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    // Projects created over time
    const projectTimeline = await query(
      `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM projects
      ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `,
      params
    );

    // Submissions over time
    const submissionParams = startDate && endDate ? [startDate, endDate] : [];
    const submissionTimeline = await query(
      `
      SELECT 
        DATE(submission_date) as date,
        COUNT(*) as count
      FROM projects
      WHERE submission_date IS NOT NULL
      ${startDate && endDate ? 'AND submission_date BETWEEN ? AND ?' : ''}
      GROUP BY DATE(submission_date)
      ORDER BY date DESC
      LIMIT 30
    `,
      submissionParams
    );

    res.json({
      success: true,
      data: {
        projectsCreated: projectTimeline.map(p => ({
          date: p.date,
          count: p.count,
        })),
        projectsSubmitted: submissionTimeline.map(s => ({
          date: s.date,
          count: s.count,
        })),
      },
    });
  } catch (error) {
    logger.error('Get timeline report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve timeline report.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getDashboardStats,
  getDepartmentReport,
  getStudentReport,
  getSupervisorReport,
  getTimelineReport,
};
