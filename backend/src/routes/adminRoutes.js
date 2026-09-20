const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminGradeController = require('../controllers/adminGradeController');
const adminNotificationController = require('../controllers/adminNotificationController');
const { authenticate, authorize } = require('../middlewares/auth');

// Protect all admin routes
router.use(authenticate);
router.use(authorize('admin'));

// User management endpoints
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// --- GRADE MANAGEMENT & APPEALS ENDPOINTS ---
router.get('/grades/classes', adminGradeController.getAdminGradeClasses);
router.get('/grades/classes/:classSectionId', adminGradeController.getAdminClassGrades);
router.put('/grades/:gradeId', adminGradeController.adminUpdateGrade);
router.post('/grades/publish', adminGradeController.adminPublishGrades);
router.post('/grades/unlock', adminGradeController.adminUnlockGradeForTeacher);
router.get('/grades/appeals', adminGradeController.getAdminAppeals);
router.post('/grades/appeals/:appealId/decide', adminGradeController.adminDecideAppeal);
router.post('/grades/sync-all', adminGradeController.adminSyncAllGrades);
router.post('/grades/sync-section', adminGradeController.adminSyncSectionGrades);

// --- NOTIFICATION MANAGEMENT ENDPOINTS ---
router.post('/notifications/send', adminNotificationController.sendNotification);
router.get('/notifications', adminNotificationController.getSentNotifications);
router.delete('/notifications/:id', adminNotificationController.deleteNotification);
router.get('/notifications/targets', adminNotificationController.getNotificationTargets);

module.exports = router;
