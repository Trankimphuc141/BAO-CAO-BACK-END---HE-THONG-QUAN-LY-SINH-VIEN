const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const surveyController = require('../controllers/surveyController');
const { authenticate, authorize } = require('../middlewares/auth');

// Middleware trích xuất req.user nếu có token nhưng không bắt buộc (để sinh viên vẫn truy cập được nếu dùng session token)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'SECRET_KEY');
            req.user = decoded;
        } catch (e) {}
    }
    next();
};

// 1. Lấy danh sách phiếu đánh giá (Học kỳ / Môn học)
router.get('/', optionalAuth, surveyController.getSurveys);

// 2. Admin tạo đợt đánh giá giảng viên mới
router.post('/', authenticate, authorize('admin'), surveyController.createSurvey);

// 3. Sinh viên gửi ý kiến đánh giá & số sao (0-5 sao)
router.post('/:surveyId/respond', optionalAuth, surveyController.submitSurveyResponse);
router.post('/:surveyId/responses', optionalAuth, surveyController.submitSurveyResponse);

// 4. Admin đóng/mở đợt đánh giá
router.patch('/:surveyId/toggle', authenticate, authorize('admin'), surveyController.toggleSurveyStatus);

// 5. Admin xóa đợt đánh giá
router.delete('/:surveyId', authenticate, authorize('admin'), surveyController.deleteSurvey);

// 6. Báo cáo đánh giá của giảng viên
router.get('/teacher/:teacherId', surveyController.getTeacherSurveyReport);

module.exports = router;
