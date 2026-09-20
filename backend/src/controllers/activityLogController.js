const ActivityLog = require('../models/ActivityLog');

/**
 * Ghi một activity log entry
 * @param {Object} params
 * @param {Object} params.actor   - { userId, name, code, role }
 * @param {string} params.action  - ACTION enum
 * @param {Object} params.target  - { type, id, label }
 * @param {string} params.description
 * @param {string} params.module
 * @param {Object} params.meta
 * @param {string} params.status
 * @param {string} params.ip
 */
const logActivity = async (params) => {
    try {
        await ActivityLog.create({
            actor: params.actor || { name: 'Hệ thống', role: 'system' },
            action: params.action || 'OTHER',
            target: params.target || {},
            description: params.description || '',
            module: params.module || 'other',
            meta: params.meta || {},
            status: params.status || 'success',
            ip: params.ip || ''
        });
    } catch (err) {
        // Không để log lỗi ảnh hưởng đến flow chính
        console.warn('[ActivityLog] Failed to write log:', err.message);
    }
};

// ============================================================
// Controller lấy danh sách log (dành cho Admin)
// ============================================================
exports.getActivityLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            role,
            action,
            module: mod,
            status,
            search,
            from,
            to
        } = req.query;

        const filter = {};

        if (role) filter['actor.role'] = role;
        if (action) filter.action = action;
        if (mod) filter.module = mod;
        if (status) filter.status = status;

        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to)   filter.createdAt.$lte = new Date(to + 'T23:59:59.999Z');
        }

        if (search) {
            filter.$or = [
                { description: { $regex: search, $options: 'i' } },
                { 'actor.name': { $regex: search, $options: 'i' } },
                { 'actor.code': { $regex: search, $options: 'i' } },
                { 'target.label': { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const total = await ActivityLog.countDocuments(filter);
        const logs = await ActivityLog.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        return res.json({
            success: true,
            data: logs,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Ghi log trực tiếp từ client (theo dõi sự kiện click & thao tác giao diện)
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.recordActivity = async (req, res) => {
    try {
        let user = req.user;
        const authHeader = req.headers.authorization;
        if (!user && authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                user = jwt.verify(token, process.env.JWT_SECRET || 'SECRET_KEY');
            } catch(e) {
                try { user = jwt.decode(token); } catch(e2) {}
            }
        }

        const { action, description, module: mod, target, meta, status, actor } = req.body;

        let actorName = actor?.name || user?.name;
        let actorCode = actor?.code || user?.code;
        let actorRole = actor?.role || user?.role || 'system';

        if (!actorName && (user?.id || user?._id || actor?.userId)) {
            try {
                const dbUser = await User.findById(user?.id || user?._id || actor?.userId).select('name code role');
                if (dbUser) {
                    actorName = dbUser.name;
                    actorCode = dbUser.code;
                    actorRole = dbUser.role;
                }
            } catch(e) {}
        }

        const newLog = await ActivityLog.create({
            actor: {
                userId: user?.id || user?._id || actor?.userId,
                name: actorName || 'Người dùng',
                code: actorCode || '',
                role: actorRole
            },
            action: action || 'CLICK',
            target: target || {},
            description: description || 'Thao tác click trên giao diện',
            module: mod || 'other',
            meta: meta || {},
            status: status || 'success',
            ip: req.ip || req.connection?.remoteAddress || ''
        });

        return res.status(201).json({ success: true, data: newLog });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Xóa log cũ (admin)
exports.clearOldLogs = async (req, res) => {
    try {
        const { daysOld = 30 } = req.body;
        if (Number(daysOld) === 0) {
            const result = await ActivityLog.deleteMany({});
            return res.json({ success: true, deleted: result.deletedCount });
        }
        const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
        const result = await ActivityLog.deleteMany({ createdAt: { $lt: cutoff } });
        return res.json({ success: true, deleted: result.deletedCount });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Xóa toàn bộ log
exports.clearAllLogs = async (req, res) => {
    try {
        const result = await ActivityLog.deleteMany({});
        return res.json({ success: true, deleted: result.deletedCount });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Stats tổng quan
exports.getActivityStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [total, todayCount, byRole, byAction, recentErrors] = await Promise.all([
            ActivityLog.countDocuments(),
            ActivityLog.countDocuments({ createdAt: { $gte: today } }),
            ActivityLog.aggregate([
                { $group: { _id: '$actor.role', count: { $sum: 1 } } }
            ]),
            ActivityLog.aggregate([
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            ActivityLog.find({ status: 'failed' })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()
        ]);

        return res.json({
            success: true,
            stats: { total, todayCount, byRole, byAction, recentErrors }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports.logActivity = logActivity;

