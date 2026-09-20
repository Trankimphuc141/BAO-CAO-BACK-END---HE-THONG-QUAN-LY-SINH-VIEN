const express = require('express');
const router = express.Router();
const { getActivityLogs, recordActivity, clearOldLogs, clearAllLogs, getActivityStats } = require('../controllers/activityLogController');

// GET /api/activity-logs           - Lấy danh sách logs (có filter, phân trang)
router.get('/', getActivityLogs);

// POST /api/activity-logs          - Ghi nhận sự kiện click / thao tác từ client
router.post('/', recordActivity);

// GET /api/activity-logs/stats     - Thống kê tổng quan
router.get('/stats', getActivityStats);

// POST /api/activity-logs/clear    - Xóa log cũ (daysOld: X)
router.post('/clear', clearOldLogs);

// POST & DELETE /api/activity-logs/clear-all - Xóa toàn bộ nhật ký
router.post('/clear-all', clearAllLogs);
router.delete('/all', clearAllLogs);

module.exports = router;
