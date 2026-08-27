const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academicController');
const { authenticate } = require('../middlewares/auth');

router.get('/timetable', academicController.getTimetable);
router.get('/class-sections', authenticate, academicController.getClassSections);
router.post('/attendance', authenticate, academicController.recordAttendance);
router.post('/attendance/check-in', authenticate, academicController.qrCheckIn);
router.get('/attendance-report/:classSectionId', academicController.getAttendanceReport);
router.get('/section-grades/:classSectionId', academicController.getSectionGrades);
router.post('/section-grades', academicController.updateSectionGrades);

module.exports = router;

