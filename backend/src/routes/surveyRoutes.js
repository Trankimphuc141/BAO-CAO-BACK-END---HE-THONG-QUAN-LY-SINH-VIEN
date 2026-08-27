const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/surveyController');

router.get('/', surveyController.getSurveys);
router.post('/:surveyId/respond', surveyController.submitSurveyResponse);
router.get('/teacher/:teacherId', surveyController.getTeacherSurveyReport);

module.exports = router;
