const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
} = require('../controllers/notificationController');

router.use(authenticateToken);

router.get('/', getAllNotifications);
router.get('/unread/count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
