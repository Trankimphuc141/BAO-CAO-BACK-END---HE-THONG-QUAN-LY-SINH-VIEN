const express = require('express');
const router = express.Router();
const thesisController = require('../controllers/thesisController');
const { upload } = require('../middlewares/upload');

router.get('/advisors', thesisController.getAdvisors);
router.get('/', thesisController.getTheses);
router.post('/', upload.any(), thesisController.registerThesis);
router.post('/:id/upload', upload.any(), thesisController.uploadAdditionalFiles);
router.post('/:id/milestone/:milestoneIndex/upload', upload.any(), thesisController.uploadMilestoneFile);
router.get('/download/:id', thesisController.downloadThesisFile);
router.get('/download/:id/milestone/:milestoneIndex', thesisController.downloadMilestoneFile);
router.put('/:id', thesisController.updateThesisMilestoneOrScore);
router.patch('/:id/milestone/:milestoneIndex', thesisController.updateMilestoneInfo);

module.exports = router;
