const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const academicRoutes = require('./academicRoutes');
const studentRoutes = require('./studentRoutes');
const examRoutes = require('./examRoutes');
const surveyRoutes = require('./surveyRoutes');
const plagiarismRoutes = require('./plagiarismRoutes');
const internshipRoutes = require('./internshipRoutes');
const thesisRoutes = require('./thesisRoutes');
const reportRoutes = require('./reportRoutes');
const teacherRoutes = require('./teacherRoutes');
const seedRoutes = require('./seedRoutes');

// Định tuyến API theo 9 phân hệ chức năng
router.use('/auth', authRoutes);
router.use('/academic', academicRoutes);
router.use('/student', studentRoutes);
router.use('/exams', examRoutes);
router.use('/surveys', surveyRoutes);
router.use('/plagiarism', plagiarismRoutes);
router.use('/internships', internshipRoutes);
router.use('/theses', thesisRoutes);
router.use('/reports', reportRoutes);
router.use('/teacher', teacherRoutes);
router.use('/seed', seedRoutes);

module.exports = router;
