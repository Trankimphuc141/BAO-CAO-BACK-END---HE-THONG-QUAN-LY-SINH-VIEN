const express = require('express');
const router = express.Router();
const internshipController = require('../controllers/internshipController');

router.get('/', internshipController.getInternships);
router.post('/', internshipController.registerInternship);
router.put('/:id/evaluate', internshipController.evaluateInternship);

module.exports = router;
