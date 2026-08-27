const express = require('express');
const router = express.Router();
const { runSeed, clearSeedData } = require('../controllers/seedController');
const { authenticate, authorize } = require('../middlewares/auth');

// POST /api/seed/run  — chỉ Admin mới có quyền tạo dữ liệu mẫu
router.post('/run', authenticate, authorize('admin'), runSeed);

// DELETE /api/seed/clear — chỉ Admin mới có quyền xóa dữ liệu mẫu
router.delete('/clear', authenticate, authorize('admin'), clearSeedData);

module.exports = router;
