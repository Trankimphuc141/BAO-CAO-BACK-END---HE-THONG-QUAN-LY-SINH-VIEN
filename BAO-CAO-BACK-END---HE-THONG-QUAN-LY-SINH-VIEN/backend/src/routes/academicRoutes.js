const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academicController');

router.get('/timetable', academicController.getTimetable);
router.get('/class-sections', academicController.getClassSections);
router.post('/attendance', academicController.recordAttendance);
router.get('/attendance-report/:classSectionId', academicController.getAttendanceReport);
router.get('/section-grades/:classSectionId', academicController.getSectionGrades);
router.post('/section-grades', academicController.updateSectionGrades);

module.exports = router;
