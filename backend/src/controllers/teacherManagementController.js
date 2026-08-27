const User = require('../models/User');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const Note = require('../models/Note');
const Notification = require('../models/Notification');
const ClassSection = require('../models/ClassSection');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { createObjectCsvStringifier } = require('csv-writer');

// --- STUDENT MANAGEMENT ---
exports.getStudents = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const classCode = req.query.classCode || '';
        const status = req.query.status || '';

        const query = { role: 'student' };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (classCode) query.classCode = classCode;
        if (status) query.status = status;

        const total = await User.countDocuments(query);
        const students = await User.find(query)
            .select('-password')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: students,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createStudent = async (req, res) => {
    try {
        const student = await User.create({ ...req.body, role: 'student' });
        res.status(201).json({ success: true, data: student });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getStudentById = async (req, res) => {
    try {
        const student = await User.findById(req.params.id).select('-password');
        if (!student) return res.status(404).json({ success: false, message: 'Not found' });
        
        const grades = await Grade.find({ student: req.params.id }).populate('course');
        const attendance = await Attendance.find({ "records.student": req.params.id });
        const notes = await Note.find({ student: req.params.id, teacher: req.user.id });

        res.json({ success: true, data: { student, grades, attendance, notes } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateStudent = async (req, res) => {
    try {
        const student = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select('-password');
        res.json({ success: true, data: student });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteStudent = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.exportStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }).select('-password');
        
        const csvStringifier = createObjectCsvStringifier({
            header: [
                { id: 'code', title: 'Mã SV' },
                { id: 'name', title: 'Họ Tên' },
                { id: 'email', title: 'Email' },
                { id: 'classCode', title: 'Lớp' },
                { id: 'status', title: 'Trạng Thái' }
            ]
        });
        
        const records = students.map(s => ({
            code: s.code,
            name: s.name,
            email: s.email,
            classCode: s.classCode,
            status: s.status
        }));
        
        const csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=students.csv');
        res.status(200).send(csvContent);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- GRADES ---
exports.addGrade = async (req, res) => {
    try {
        const grade = await Grade.create({ ...req.body, student: req.params.id });
        res.status(201).json({ success: true, data: grade });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateGrade = async (req, res) => {
    try {
        // Find first to trigger pre-save hook
        const grade = await Grade.findById(req.params.gradeId);
        if (!grade) return res.status(404).json({ success: false, message: 'Grade not found' });
        
        Object.assign(grade, req.body);
        await grade.save();
        
        res.json({ success: true, data: grade });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteGrade = async (req, res) => {
    try {
        await Grade.findByIdAndDelete(req.params.gradeId);
        res.json({ success: true, message: 'Grade deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getStudentGrades = async (req, res) => {
    try {
        const grades = await Grade.find({ student: req.params.id }).populate('course');
        res.json({ success: true, data: grades });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- ATTENDANCE ---
exports.createAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.create({ ...req.body, takenBy: req.user.id });
        res.status(201).json({ success: true, data: attendance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getStudentAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find({ "records.student": req.params.id });
        res.json({ success: true, data: attendance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAttendance = async (req, res) => {
    try {
        const { classSection, date } = req.query;
        const query = {};
        if (classSection) query.classSection = classSection;
        if (date) query.date = date;
        
        const attendance = await Attendance.find(query);
        res.json({ success: true, data: attendance });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- NOTES ---
exports.getNotes = async (req, res) => {
    try {
        const notes = await Note.find({ student: req.params.id, teacher: req.user.id }).sort({ date: -1 });
        res.json({ success: true, data: notes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.addNote = async (req, res) => {
    try {
        const note = await Note.create({
            teacher: req.user.id,
            student: req.params.id,
            content: req.body.content
        });
        res.status(201).json({ success: true, data: note });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateNote = async (req, res) => {
    try {
        const note = await Note.findByIdAndUpdate(req.params.noteId, { content: req.body.content }, { new: true });
        res.json({ success: true, data: note });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteNote = async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.noteId);
        res.json({ success: true, message: 'Note deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- GRADE CLASS MANAGEMENT (per ClassSection) ---
// GET /teacher/class-grades/:classSectionId — Toàn bộ điểm của một lớp
exports.getClassGrades = async (req, res) => {
    try {
        const grades = await Grade.find({ classSection: req.params.classSectionId })
            .populate('student', 'code name classCode email avatar')
            .populate('course', 'code name credits')
            .sort({ 'student.code': 1 });
        
        // Tính thống kê
        const stats = {
            total: grades.length,
            passed: grades.filter(g => g.isPassed).length,
            failed: grades.filter(g => !g.isPassed).length,
            published: grades.filter(g => g.isPublished).length,
            locked: grades.filter(g => g.isLocked).length,
            avgScore: grades.length > 0 ? (grades.reduce((s, g) => s + g.totalScore10, 0) / grades.length).toFixed(2) : 0,
            distribution: { A: 0, 'B+': 0, B: 0, 'C+': 0, C: 0, 'D+': 0, D: 0, F: 0 }
        };
        grades.forEach(g => { if (stats.distribution[g.letterGrade] !== undefined) stats.distribution[g.letterGrade]++; });
        
        res.json({ success: true, data: grades, stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /teacher/grades/bulk-update — Cập nhật nhiều điểm cùng lúc
exports.bulkUpdateGrades = async (req, res) => {
    try {
        const { grades } = req.body; // [{ gradeId, attendanceScore, midtermScore, finalScore, teacherComment }]
        if (!grades || !Array.isArray(grades)) return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ' });
        
        const updatePromises = grades.map(async (g) => {
            const grade = await Grade.findById(g.gradeId);
            if (!grade || grade.isLocked) return null;
            if (g.attendanceScore !== undefined) grade.attendanceScore = g.attendanceScore;
            if (g.midtermScore !== undefined) grade.midtermScore = g.midtermScore;
            if (g.finalScore !== undefined) grade.finalScore = g.finalScore;
            if (g.teacherComment !== undefined) grade.teacherComment = g.teacherComment;
            return grade.save();
        });
        await Promise.all(updatePromises);
        res.json({ success: true, message: `Đã cập nhật ${grades.length} điểm thành công` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /teacher/grades/publish — Công bố điểm cho toàn lớp / danh sách gradeIds
exports.publishGrades = async (req, res) => {
    try {
        const { classSectionId, gradeIds } = req.body;
        const query = gradeIds ? { _id: { $in: gradeIds } } : { classSection: classSectionId, isLocked: false };
        
        const result = await Grade.updateMany(query, {
            $set: { isPublished: true, publishedAt: new Date() }
        });

        // Gửi notification cho sinh viên
        if (classSectionId) {
            const affectedGrades = await Grade.find(query).populate('student', '_id');
            const notifPromises = affectedGrades.map(g =>
                Notification.create({
                    recipient: g.student._id,
                    sender: req.user.id,
                    type: 'grade_published',
                    title: '📢 Điểm số đã được công bố',
                    content: 'Giảng viên vừa công bố điểm số. Vào trang Điểm số để xem kết quả.',
                    link: '/grades',
                    classSection: classSectionId
                })
            );
            await Promise.all(notifPromises);

            // Emit socket event if io is available
            const io = req.app.get('io');
            if (io) {
                affectedGrades.forEach(g => {
                    io.to(g.student._id.toString()).emit('new-notification', {
                        type: 'grade_published',
                        title: '📢 Điểm số đã được công bố',
                        content: 'Giảng viên vừa công bố điểm số của bạn!'
                    });
                });
            }
        }

        res.json({ success: true, message: `Đã công bố ${result.modifiedCount} điểm thành công`, count: result.modifiedCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /teacher/grades/lock — Khóa điểm (không thể sửa sau khi khóa)
exports.lockGrades = async (req, res) => {
    try {
        const { classSectionId, gradeIds } = req.body;
        const query = gradeIds ? { _id: { $in: gradeIds } } : { classSection: classSectionId };
        
        const result = await Grade.updateMany(query, {
            $set: { isLocked: true, lockedAt: new Date(), isPublished: true, publishedAt: new Date() }
        });
        res.json({ success: true, message: `Đã khóa ${result.modifiedCount} điểm thành công`, count: result.modifiedCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- QR ATTENDANCE ---
// POST /teacher/attendance/generate-qr — Tạo QR cho buổi điểm danh
exports.generateQRAttendance = async (req, res) => {
    try {
        const { classSectionId, sessionNumber, date, expiresInMinutes = 15 } = req.body;
        
        let attendance = await Attendance.findOne({ classSection: classSectionId, sessionNumber });
        const qrToken = crypto.randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
        
        if (attendance) {
            attendance.qrToken = qrToken;
            attendance.qrExpiresAt = expiresAt;
            attendance.qrIsActive = true;
            if (date) attendance.date = date;
            await attendance.save();
        } else {
            attendance = await Attendance.create({
                classSection: classSectionId,
                sessionNumber,
                date: date || new Date().toISOString().split('T')[0],
                takenBy: req.user.id,
                records: [],
                qrToken,
                qrExpiresAt: expiresAt,
                qrIsActive: true
            });
        }
        
        // Tạo QR data URL (chứa token để sinh viên quét)
        const qrData = JSON.stringify({ token: qrToken, attendanceId: attendance._id, classSectionId, sessionNumber });
        const qrDataUrl = await QRCode.toDataURL(qrData, { width: 400, margin: 2 });
        
        res.json({
            success: true,
            data: { attendance, qrDataUrl, qrToken, expiresAt, expiresInMinutes }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /teacher/attendance/close-qr — Đóng QR điểm danh
exports.closeQRAttendance = async (req, res) => {
    try {
        const { attendanceId } = req.body;
        await Attendance.findByIdAndUpdate(attendanceId, { qrIsActive: false });
        res.json({ success: true, message: 'Đã đóng QR điểm danh' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- NOTIFICATIONS ---
// GET /teacher/notifications — Lấy thông báo của giảng viên
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        const unreadCount = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
        res.json({ success: true, data: notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /teacher/notifications/:id/read — Đánh dấu đã đọc
exports.markNotificationRead = async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /teacher/notifications/read-all — Đánh dấu tất cả đã đọc
exports.markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user.id, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
        res.json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /teacher/notifications/send — Gửi thông báo tới lớp hoặc cá nhân
exports.sendNotification = async (req, res) => {
    try {
        const { classSectionId, studentIds, title, content, type = 'announcement' } = req.body;
        let recipients = [];
        
        if (studentIds && studentIds.length > 0) {
            recipients = studentIds;
        } else if (classSectionId) {
            const section = await ClassSection.findById(classSectionId).select('students');
            recipients = section ? section.students.map(s => s.toString()) : [];
        }
        
        if (recipients.length === 0) return res.status(400).json({ success: false, message: 'Không có người nhận' });
        
        const notifDocs = recipients.map(recipientId => ({
            recipient: recipientId,
            sender: req.user.id,
            type,
            title,
            content,
            classSection: classSectionId || null
        }));
        
        await Notification.insertMany(notifDocs);
        
        // Emit realtime
        const io = req.app.get('io');
        if (io) {
            recipients.forEach(rId => {
                io.to(rId.toString()).emit('new-notification', { type, title, content });
            });
        }
        
        res.json({ success: true, message: `Đã gửi thông báo tới ${recipients.length} sinh viên`, count: recipients.length });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- CLASS ANALYTICS ---
// GET /teacher/analytics/:classSectionId
exports.getClassAnalytics = async (req, res) => {
    try {
        const { classSectionId } = req.params;
        const grades = await Grade.find({ classSection: classSectionId }).populate('student', 'code name');
        const attendances = await Attendance.find({ classSection: classSectionId });
        const section = await ClassSection.findById(classSectionId).populate('course students');
        
        // Distribution điểm chữ
        const gradeDistribution = { A: 0, 'B+': 0, B: 0, 'C+': 0, C: 0, 'D+': 0, D: 0, F: 0 };
        grades.forEach(g => { if (gradeDistribution[g.letterGrade] !== undefined) gradeDistribution[g.letterGrade]++; });
        
        // Tỷ lệ chuyên cần per student
        const totalSessions = attendances.length;
        const attendanceStats = {};
        if (section && section.students) {
            section.students.forEach(s => { attendanceStats[s._id.toString()] = { present: 0, absent: 0, late: 0 }; });
        }
        attendances.forEach(att => {
            att.records.forEach(r => {
                const key = r.student.toString();
                if (attendanceStats[key]) {
                    if (r.status === 'present') attendanceStats[key].present++;
                    else if (r.status === 'late') attendanceStats[key].late++;
                    else attendanceStats[key].absent++;
                }
            });
        });
        
        // Top students by GPA
        const topStudents = grades.filter(g => g.isPassed).sort((a, b) => b.totalScore4 - a.totalScore4).slice(0, 5);
        
        res.json({
            success: true,
            data: {
                section,
                gradeDistribution,
                gradeDistributionArray: Object.entries(gradeDistribution).map(([name, count]) => ({ name, count })),
                stats: {
                    total: grades.length,
                    passed: grades.filter(g => g.isPassed).length,
                    failed: grades.filter(g => !g.isPassed).length,
                    avgScore10: grades.length > 0 ? (grades.reduce((s, g) => s + g.totalScore10, 0) / grades.length).toFixed(2) : 0,
                    avgScore4: grades.length > 0 ? (grades.reduce((s, g) => s + g.totalScore4, 0) / grades.length).toFixed(2) : 0,
                    totalSessions
                },
                topStudents,
                attendanceStats
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

