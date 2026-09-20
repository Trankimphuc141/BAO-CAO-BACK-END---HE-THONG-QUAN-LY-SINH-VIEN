const Notification = require('../models/Notification');
const User = require('../models/User');
const ClassSection = require('../models/ClassSection');

// POST /api/admin/notifications/send — Admin gửi thông báo đến các đối tượng
exports.sendNotification = async (req, res) => {
    try {
        const {
            targetType = 'all', // 'all' | 'students' | 'teachers' | 'class_section' | 'specific_users'
            classSectionId,
            userIds = [],
            title,
            content,
            type = 'announcement',
            link = ''
        } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập tiêu đề thông báo' });
        }
        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập nội dung thông báo' });
        }

        let recipients = [];
        let targetLabel = 'toàn bộ hệ thống';

        if (targetType === 'all') {
            const users = await User.find({ role: { $in: ['student', 'teacher'] } }).select('_id');
            recipients = users.map(u => u._id.toString());
            targetLabel = 'Toàn bộ Giảng viên & Sinh viên';
        } else if (targetType === 'students') {
            const students = await User.find({ role: 'student' }).select('_id');
            recipients = students.map(s => s._id.toString());
            targetLabel = 'Tất cả Sinh viên';
        } else if (targetType === 'teachers') {
            const teachers = await User.find({ role: 'teacher' }).select('_id');
            recipients = teachers.map(t => t._id.toString());
            targetLabel = 'Tất cả Giảng viên';
        } else if (targetType === 'class_section') {
            if (!classSectionId) {
                return res.status(400).json({ success: false, message: 'Vui lòng chọn lớp học phần' });
            }
            const section = await ClassSection.findById(classSectionId)
                .populate('course', 'name')
                .select('students teacher sectionCode');
            if (!section) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
            }
            const ids = (section.students || []).map(s => s.toString());
            if (section.teacher) {
                ids.push(section.teacher.toString());
            }
            recipients = [...new Set(ids)];
            targetLabel = `Lớp ${section.sectionCode} (${section.course?.name || ''})`;
        } else if (targetType === 'specific_users') {
            if (!Array.isArray(userIds) || userIds.length === 0) {
                return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất một người nhận' });
            }
            recipients = userIds.map(id => id.toString());
            targetLabel = `${recipients.length} người dùng cụ thể`;
        } else {
            return res.status(400).json({ success: false, message: 'Đối tượng nhận thông báo không hợp lệ' });
        }

        if (recipients.length === 0) {
            return res.status(400).json({ success: false, message: 'Không tìm thấy người nhận nào phù hợp với điều kiện đã chọn' });
        }

        // Tạo danh sách bản ghi Notification trong DB
        const now = new Date();
        const docs = recipients.map(recipientId => ({
            recipient: recipientId,
            sender: req.user.id,
            type: type || 'announcement',
            title: title.trim(),
            content: content.trim(),
            link: link ? link.trim() : '',
            classSection: classSectionId || null,
            createdAt: now
        }));

        await Notification.insertMany(docs);

        // Phát WebSocket thời gian thực (Real-time Broadcast)
        const io = req.app ? req.app.get('io') : null;
        if (io) {
            const notifPayload = {
                type: type || 'announcement',
                title: title.trim(),
                content: content.trim(),
                link: link ? link.trim() : '',
                senderName: req.user?.name || 'Phòng Đào Tạo',
                createdAt: now,
                targetLabel
            };

            console.log(`📡 [AdminNotification] Emitting notification: "${notifPayload.title}" to target "${targetType}" (${recipients.length} recipients)`);

            // 1. Luôn phát tới room 'admin' để Admin nhận ngay popup thông báo đã gửi
            io.to('admin').emit('new-notification', {
                ...notifPayload,
                title: `📢 ${notifPayload.title}`
            });

            // 2. Nếu gửi toàn hệ thống -> Broadcast cho toàn bộ socket đang online
            if (targetType === 'all') {
                io.emit('new-notification', notifPayload);
            } else if (targetType === 'students') {
                io.to('student').emit('new-notification', notifPayload);
                recipients.forEach(rId => {
                    io.to(String(rId)).emit('new-notification', notifPayload);
                });
            } else if (targetType === 'teachers') {
                io.to('teacher').emit('new-notification', notifPayload);
                recipients.forEach(rId => {
                    io.to(String(rId)).emit('new-notification', notifPayload);
                });
            } else {
                // Lớp học phần hoặc người dùng cụ thể
                recipients.forEach(rId => {
                    io.to(String(rId)).emit('new-notification', notifPayload);
                });
            }
        } else {
            console.warn('⚠️ [AdminNotification] io instance not found in req.app');
        }

        res.json({
            success: true,
            message: `Đã gửi thông báo thành công tới ${recipients.length} người nhận (${targetLabel})!`,
            count: recipients.length,
            targetLabel
        });
    } catch (err) {
        console.error('Error sending admin notification:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/admin/notifications — Lấy danh sách thông báo đã gửi
exports.getSentNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = (req.query.search || '').trim();

        const query = { sender: req.user.id };
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        // Lấy các thông báo được tạo bởi Admin
        const total = await Notification.countDocuments(query);
        const notifications = await Notification.find(query)
            .populate('recipient', 'name code role email')
            .populate('classSection', 'sectionCode semester')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.json({
            success: true,
            data: notifications,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('Error fetching admin notifications:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /api/admin/notifications/:id — Xóa một thông báo
exports.deleteNotification = async (req, res) => {
    try {
        const notif = await Notification.findById(req.params.id);
        if (!notif) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
        }

        await Notification.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Đã xóa thông báo thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/admin/notifications/targets — Lấy dữ liệu hỗ trợ chọn đối tượng gửi
exports.getNotificationTargets = async (req, res) => {
    try {
        const [totalStudents, totalTeachers, classSections, users] = await Promise.all([
            User.countDocuments({ role: 'student' }),
            User.countDocuments({ role: 'teacher' }),
            ClassSection.find()
                .populate('course', 'name code')
                .populate('teacher', 'name code')
                .select('sectionCode semester course teacher students')
                .sort({ sectionCode: 1 }),
            User.find({ role: { $in: ['student', 'teacher'] } })
                .select('name code role department email')
                .sort({ role: 1, name: 1 })
                .limit(300)
        ]);

        res.json({
            success: true,
            data: {
                totalStudents,
                totalTeachers,
                totalUsers: totalStudents + totalTeachers,
                classSections: classSections.map(cs => ({
                    _id: cs._id,
                    sectionCode: cs.sectionCode,
                    courseName: cs.course?.name || cs.sectionCode,
                    courseCode: cs.course?.code || '',
                    teacherName: cs.teacher?.name || '',
                    studentCount: (cs.students || []).length
                })),
                users
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
