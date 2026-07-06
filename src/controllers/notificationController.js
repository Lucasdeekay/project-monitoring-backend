const { query } = require('../config/database');
const logger = require('../utils/logger');

const getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = await query(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
      [req.user.id]
    );
    const total = countResult[0].total;

    const notifications = await query(
      `SELECT * FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [req.user.id, parseInt(limit), offset]
    );

    res.json({
      success: true,
      data: notifications.map(n => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        readStatus: !!n.read_status,
        actionUrl: n.action_url,
        createdAt: n.created_at,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get notifications error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE notifications SET read_status = TRUE WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    logger.error('Mark notification read error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await query(
      'UPDATE notifications SET read_status = TRUE WHERE user_id = ? AND read_status = FALSE',
      [req.user.id]
    );

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    logger.error('Mark all read error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update notifications.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const [result] = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_status = FALSE',
      [req.user.id]
    );

    res.json({ success: true, data: { count: result.count } });
  } catch (error) {
    logger.error('Get unread count error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    res.json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    logger.error('Delete notification error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
};
