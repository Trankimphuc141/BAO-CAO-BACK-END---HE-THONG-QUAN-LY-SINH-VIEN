const express = require('express');
const router = express.Router();
const thesisController = require('../controllers/thesisController');

router.get('/', thesisController.getTheses);
router.post('/', thesisController.registerThesis);
router.put('/:id', thesisController.updateThesisMilestoneOrScore);

module.exports = router;
