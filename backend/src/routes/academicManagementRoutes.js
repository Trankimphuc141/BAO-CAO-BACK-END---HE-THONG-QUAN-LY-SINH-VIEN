const express = require('express');
const router = express.Router();
const controller = require('../controllers/academicManagementController');
const { authenticate, authorize } = require('../middlewares/auth');

// ═══════════════════════════════════════════════
// ADMIN ROUTES (Quản lý Danh mục, Học phần, Phân công)
// ═══════════════════════════════════════════════

// 1. Ngành học
router.get('/majors', authenticate, controller.getMajors);
router.post('/majors', authenticate, authorize('admin'), controller.createMajor);
router.put('/majors/:id', authenticate, authorize('admin'), controller.updateMajor);
router.delete('/majors/:id', authenticate, authorize('admin'), controller.deleteMajor);

// 2. Môn học (với số tín chỉ)
router.get('/courses', authenticate, controller.getCourses);
router.post('/courses', authenticate, authorize('admin'), controller.createCourse);
router.put('/courses/:id', authenticate, authorize('admin'), controller.updateCourse);
router.delete('/courses/:id', authenticate, authorize('admin'), controller.deleteCourse);

// 3. Chương trình đào tạo & Hiển thị theo kỳ
router.get('/curriculums', authenticate, controller.getCurriculums);
router.post('/curriculums', authenticate, authorize('admin'), controller.createCurriculum);
router.put('/curriculums/:id', authenticate, authorize('admin'), controller.updateCurriculum);
router.put('/curriculums/:id/semesters/:semesterIndex/visibility', authenticate, authorize('admin'), controller.toggleSemesterVisibility);
router.post('/curriculums/:id/semesters/:semesterIndex/courses', authenticate, authorize('admin'), controller.addCourseToSemester);
router.delete('/curriculums/:id/semesters/:semesterIndex/courses/:courseId', authenticate, authorize('admin'), controller.removeCourseFromSemester);

// 4. Lớp học phần & Phân công giảng dạy
router.get('/sections', authenticate, controller.getClassSections);
router.post('/sections', authenticate, authorize('admin'), controller.createClassSection);
router.put('/sections/:id', authenticate, authorize('admin'), controller.updateClassSection);
router.delete('/sections/:id', authenticate, authorize('admin'), controller.deleteClassSection);

// ═══════════════════════════════════════════════
// TEACHER ROUTES (Xem lịch dạy, xác nhận & đề xuất lịch)
// ═══════════════════════════════════════════════
router.get('/teacher/my-schedule', authenticate, authorize('teacher', 'admin'), controller.getTeacherSchedule);
router.put('/sections/:id/teacher-response', authenticate, authorize('teacher', 'admin'), controller.respondTeacherSchedule);

// ═══════════════════════════════════════════════
// STUDENT ROUTES (Xem CTĐT, Đăng ký & Hủy học phần)
// ═══════════════════════════════════════════════
router.get('/student/curriculum', authenticate, controller.getStudentCurriculumView);
router.get('/registration/available', authenticate, controller.getAvailableSections);
router.post('/registration/register', authenticate, authorize('student'), controller.registerSection);
router.post('/registration/drop', authenticate, authorize('student'), controller.dropSection);
router.get('/registration/my-courses', authenticate, authorize('student'), controller.getMyRegisteredSections);

module.exports = router;
