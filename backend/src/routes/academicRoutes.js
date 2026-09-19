const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academicController');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/timetable', academicController.getTimetable);
router.get('/class-sections', authenticate, academicController.getClassSections);

// Điểm danh
router.post('/attendance', authenticate, academicController.recordAttendance);
router.post('/attendance/check-in', authenticate, academicController.qrCheckIn);

// Chốt điểm danh (Giảng viên hoặc Admin)
router.post('/attendance/finalize', authenticate, authorize('teacher', 'admin'), academicController.finalizeAttendance);

// Bỏ chốt điểm danh (Admin only)
router.post('/attendance/unfinalize', authenticate, authorize('admin'), academicController.unfinalizeAttendance);

// Admin sửa điểm danh (kể cả sau khi chốt)
router.put('/attendance/admin-edit', authenticate, authorize('admin'), academicController.adminEditAttendance);

// Lịch sử điểm danh của một lớp (mọi role đều xem được nếu đủ quyền)
router.get('/attendance-history/:classSectionId', authenticate, academicController.getAttendanceHistory);

router.get('/attendance-report/:classSectionId', academicController.getAttendanceReport);
router.get('/section-grades/:classSectionId', academicController.getSectionGrades);
router.post('/section-grades', academicController.updateSectionGrades);

// Đồng bộ hệ thống chuyên cần 15 buổi sang bảng điểm (Grade)
router.post('/attendance/sync', authenticate, authorize('teacher', 'admin'), academicController.syncAttendanceToGrades);
router.post('/attendance/sync-all', authenticate, authorize('teacher', 'admin'), academicController.syncAllAttendanceToGrades);

module.exports = router;
