const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getSupervisorsList,
} = require("../controllers/userController");
const { authenticateToken, requireRole } = require("../middleware/auth");

/**
 * @route   GET /api/users/supervisors/list
 * @desc    Get list of all supervisors (for dropdowns)
 * @access  Private (Students, Supervisors, Admins)
 */
router.get("/supervisors/list", authenticateToken, getSupervisorsList);

/**
 * @route   GET /api/users
 * @desc    Get all users (with filters and pagination)
 * @access  Private (Admins only)
 * @query   role, department, search, page, limit
 */
router.get("/", authenticateToken, requireRole("admin"), getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admins only)
 */
router.get("/:id", authenticateToken, requireRole("admin"), getUserById);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private (Admins only)
 */
router.post("/", authenticateToken, requireRole("admin"), createUser);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admins only)
 */
router.put("/:id", authenticateToken, requireRole("admin"), updateUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private (Admins only)
 */
router.delete("/:id", authenticateToken, requireRole("admin"), deleteUser);

/**
 * @route   GET /api/users/statistics/overview
 * @desc    Get user statistics overview
 * @access  Private (Admins only)
 */
router.get(
  "/statistics/overview",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { query } = require("../config/database");

      // Get counts by role
      const roleCounts = await query(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
    `);

      // Get department distribution
      const departmentCounts = await query(`
      SELECT department, COUNT(*) as count
      FROM users
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY count DESC
    `);

      // Get recent registrations
      const recentUsers = await query(`
      SELECT 
        id, name, email, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);

      // Get total count
      const [totalCount] = await query("SELECT COUNT(*) as total FROM users");

      res.json({
        success: true,
        data: {
          totalUsers: totalCount.total,
          byRole: roleCounts.reduce((acc, r) => {
            acc[r.role] = r.count;
            return acc;
          }, {}),
          byDepartment: departmentCounts.map((d) => ({
            department: d.department,
            count: d.count,
          })),
          recentRegistrations: recentUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.created_at,
          })),
        },
      });
    } catch (error) {
      console.error("Get user statistics error:", error);
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
 * @route   POST /api/users/:id/reset-password
 * @desc    Reset user password (Admin only)
 * @access  Private (Admins only)
 */
router.post(
  "/:id/reset-password",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long.",
        });
      }

      const { query } = require("../config/database");
      const bcrypt = require("bcryptjs");

      // Check if user exists
      const users = await query("SELECT id FROM users WHERE id = ?", [id]);

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      await query("UPDATE users SET password = ? WHERE id = ?", [
        hashedPassword,
        id,
      ]);

      res.json({
        success: true,
        message: "Password reset successfully.",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reset password.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

/**
 * @route   GET /api/users/role/:role/count
 * @desc    Get count of users by role
 * @access  Private (Admins only)
 */
router.get(
  "/role/:role/count",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { role } = req.params;
      const { query } = require("../config/database");

      const validRoles = ["student", "supervisor", "admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role.",
        });
      }

      const [result] = await query(
        "SELECT COUNT(*) as count FROM users WHERE role = ?",
        [role]
      );

      res.json({
        success: true,
        data: {
          role,
          count: result.count,
        },
      });
    } catch (error) {
      console.error("Get role count error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get count.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

module.exports = router;
