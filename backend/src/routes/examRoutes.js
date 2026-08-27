const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');

router.get('/', examController.getExamSchedules);
router.post('/check-collision', examController.checkCollision);
router.post('/', examController.createExamSchedule);
router.delete('/:id', examController.deleteExamSchedule);

module.exports = router;
