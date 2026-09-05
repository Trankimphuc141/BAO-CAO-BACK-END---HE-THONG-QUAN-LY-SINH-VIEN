const express = require('express');
const router = express.Router();
const c = require('../controllers/teacherManagementController');
const { authenticate, authorize } = require('../middlewares/auth');

// Protect all routes — Teacher + Admin only
router.use(authenticate);
router.use(authorize('teacher', 'admin'));

// --- STUDENTS ---
router.get('/students', c.getStudents);
router.get('/students/export', c.exportStudents);
router.post('/students', c.createStudent);
router.get('/students/:id', c.getStudentById);
router.put('/students/:id', c.updateStudent);
router.delete('/students/:id', c.deleteStudent);

// --- GRADES (per student) ---
router.post('/students/:id/grades', c.addGrade);
router.put('/grades/:gradeId', c.updateGrade);
router.delete('/grades/:gradeId', c.deleteGrade);
router.get('/students/:id/grades', c.getStudentGrades);

// --- GRADES (per class) ---
router.get('/class-grades/:classSectionId', c.getClassGrades);
router.post('/grades/bulk-update', c.bulkUpdateGrades);
router.post('/grades/publish', c.publishGrades);
router.post('/grades/lock', c.lockGrades);

// --- ATTENDANCE ---
router.post('/attendance', c.createAttendance);
router.get('/attendance', c.getAttendance);
router.get('/students/:id/attendance', c.getStudentAttendance);
router.post('/attendance/generate-qr', c.generateQRAttendance);
router.post('/attendance/close-qr', c.closeQRAttendance);

// --- NOTES ---
router.get('/students/:id/notes', c.getNotes);
router.post('/students/:id/notes', c.addNote);
router.put('/notes/:noteId', c.updateNote);
router.delete('/notes/:noteId', c.deleteNote);

// --- NOTIFICATIONS ---
router.get('/notifications', c.getNotifications);
router.put('/notifications/read-all', c.markAllNotificationsRead);
router.put('/notifications/:id/read', c.markNotificationRead);
router.post('/notifications/send', c.sendNotification);

// --- ANALYTICS ---
router.get('/analytics/:classSectionId', c.getClassAnalytics);

module.exports = router;
