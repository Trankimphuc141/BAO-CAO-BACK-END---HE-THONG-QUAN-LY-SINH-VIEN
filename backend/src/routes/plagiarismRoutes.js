const express = require('express');
const router = express.Router();
const plagiarismController = require('../controllers/plagiarismController');

router.get('/', plagiarismController.getAllSubmissions);
router.post('/check', plagiarismController.checkAndSubmitDocument);
router.delete('/:id', plagiarismController.deleteSubmission);

module.exports = router;
