const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticate, authorize } = require('../middlewares/auth');

// Sinh viên xem thông tin học vụ và thông báo
router.get('/portal', authenticate, studentController.getStudentPortalInfo);
router.get('/portal/:studentId', authenticate, studentController.getStudentPortalInfo);
router.get('/announcements', authenticate, studentController.getAnnouncements);

// Chỉ Giảng viên hoặc Quản trị viên mới có quyền tạo và xóa thông báo (Sinh viên bị chặn)
router.post('/announcements', authenticate, authorize('teacher', 'admin'), studentController.createAnnouncement);
router.delete('/announcements/:id', authenticate, authorize('teacher', 'admin'), studentController.deleteAnnouncement);

// Sinh viên lấy và quản lý thông báo cá nhân gửi từ giảng viên
router.get('/notifications', authenticate, studentController.getNotifications);
router.put('/notifications/:id/read', authenticate, studentController.markNotificationRead);
router.put('/notifications/read-all', authenticate, studentController.markAllNotificationsRead);

module.exports = router;
