const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/statistics', reportController.getDashboardStatistics);

module.exports = router;
