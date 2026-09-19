const User = require('../models/User');
const Grade = require('../models/Grade');
const GradeAppeal = require('../models/GradeAppeal');
const Attendance = require('../models/Attendance');
const Note = require('../models/Note');
const Notification = require('../models/Notification');
const ClassSection = require('../models/ClassSection');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { createObjectCsvStringifier } = require('csv-writer');
const { syncAttendanceToGradesInternal } = require('./academicController');

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
        // Kiểm tra số điện thoại nếu có nhập
        if (req.body.phone && !/^0[0-9]{9}$/.test(req.body.phone)) {
            return res.status(400).json({ success: false, message: 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0 (VD: 0912345678)' });
        }
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
        // Kiểm tra số điện thoại nếu có cập nhật
        if (req.body.phone && !/^0[0-9]{9}$/.test(req.body.phone)) {
            return res.status(400).json({ success: false, message: 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0 (VD: 0912345678)' });
        }
        const student = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('-password');
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
        const existing = await Grade.findOne({ student: req.params.id, classSection: req.body.classSection });
        if (existing) {
            return res.status(400).json({ 
                success: false, 
                message: 'Điểm môn học này đã được nhập vào hệ thống. Theo quy chế đào tạo, điểm đã nhập không thể chỉnh sửa hay nhập lại!' 
            });
        }
        // Khi đã nhập điểm vào rồi thì tự động khóa (isLocked: true) không cho phép chỉnh sửa
        const grade = await Grade.create({ 
            ...req.body, 
            student: req.params.id,
            isLocked: true,
            lockedAt: new Date()
        });
        res.status(201).json({ success: true, data: grade });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateGrade = async (req, res) => {
    try {
        const grade = await Grade.findById(req.params.gradeId).populate('student course');
        if (!grade) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy điểm' });
        }

        // Nếu điểm chưa được Admin mở khóa để xử lý phúc khảo và đang bị khóa
        if (grade.unlockStatus !== 'unlocked_for_edit' && grade.isLocked) {
            return res.status(403).json({ 
                success: false, 
                message: 'Điểm môn học này đã được lưu vào hệ thống và đã bị khóa. Để chỉnh sửa sau phúc khảo, vui lòng gửi yêu cầu xin Admin mở khóa bảng điểm!' 
            });
        }

        const { attendanceScore, midtermScore, finalScore, teacherComment, sessionScores } = req.body;
        if (attendanceScore !== undefined) grade.attendanceScore = Number(attendanceScore);
        if (midtermScore !== undefined) grade.midtermScore = Number(midtermScore);
        if (finalScore !== undefined) grade.finalScore = Number(finalScore);
        if (teacherComment !== undefined) grade.teacherComment = teacherComment;
        if (sessionScores && Array.isArray(sessionScores) && sessionScores.length === 15) {
            grade.sessionScores = sessionScores;
        }

        await grade.save();

        const io = req.app ? req.app.get('io') : null;
        if (io) {
            io.emit('grade-updated', { classSectionId: grade.classSection, gradeId: grade._id });
        }

        res.json({ success: true, message: 'Cập nhật điểm thành công!', data: grade });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteGrade = async (req, res) => {
    try {
        // Không cho xóa điểm đã nhập
        return res.status(403).json({ 
            success: false, 
            message: 'Điểm môn học đã nhập vào hệ thống không thể xóa theo quy chế đào tạo!' 
        });
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
        const { classSectionId } = req.params;
        const io = req.app ? req.app.get('io') : null;

        // Tự động đồng bộ / khởi tạo dữ liệu điểm & chuyên cần cho tất cả sinh viên trong lớp
        await syncAttendanceToGradesInternal(classSectionId, io);

        const grades = await Grade.find({ classSection: classSectionId })
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
        
        const attendance = await Attendance.find({ classSection: req.params.classSectionId });
        
        res.json({ success: true, data: grades, attendance, stats });
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

// POST /teacher/grades/submit-to-admin — Giảng viên nộp bảng điểm lớp học phần cho Admin kiểm tra
exports.submitGradesToAdmin = async (req, res) => {
    try {
        const { classSectionId } = req.body;
        const section = await ClassSection.findById(classSectionId).populate('course');
        if (!section) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });

        await Grade.updateMany(
            { classSection: classSectionId },
            {
                $set: {
                    submissionStatus: 'submitted',
                    submittedAt: new Date(),
                    submittedBy: req.user.id,
                    isLocked: true,
                    unlockStatus: 'locked'
                }
            }
        );

        // Thông báo đến các Quản trị viên (Admin)
        const admins = await User.find({ role: 'admin' });
        const notifPromises = admins.map(a =>
            Notification.create({
                recipient: a._id,
                sender: req.user.id,
                type: 'system',
                title: '📥 Bảng điểm mới cần kiểm tra & công bố',
                content: `Giảng viên đã nộp bảng điểm lớp ${section.sectionCode} (${section.course?.name}) để Admin kiểm tra và công bố.`,
                link: '/grades',
                classSection: classSectionId
            })
        );
        await Promise.all(notifPromises);

        const io = req.app.get('io');
        if (io) {
            admins.forEach(a => {
                io.to(a._id.toString()).emit('new-notification', {
                    type: 'system',
                    title: '📥 Bảng điểm mới cần kiểm tra',
                    content: `Giảng viên đã nộp bảng điểm lớp ${section.sectionCode}!`
                });
            });
        }

        res.json({ success: true, message: `Bảng điểm lớp ${section.sectionCode} đã được gửi đến Admin để kiểm tra và công bố!` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /teacher/grades/request-unlock — Giảng viên gửi yêu cầu xin Admin mở khóa bảng điểm để xử lý phúc khảo
exports.requestUnlockForAppeal = async (req, res) => {
    try {
        const { classSectionId, appealId, reason } = req.body;
        const section = await ClassSection.findById(classSectionId).populate('course');
        if (!section) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp' });

        await Grade.updateMany(
            { classSection: classSectionId },
            {
                $set: {
                    unlockStatus: 'requested_unlock',
                    unlockRequestedReason: reason || 'Giảng viên xin mở bảng điểm để xử lý phúc khảo sinh viên',
                    unlockRequestedAt: new Date()
                }
            }
        );

        if (appealId) {
            await GradeAppeal.findByIdAndUpdate(appealId, {
                status: 'teacher_request_unlock',
                teacherUnlockRequestReason: reason || 'Giảng viên xem xét và xin Admin mở khóa bảng điểm để chấm lại'
            });
        }

        const admins = await User.find({ role: 'admin' });
        const notifPromises = admins.map(a =>
            Notification.create({
                recipient: a._id,
                sender: req.user.id,
                type: 'system',
                title: '🔓 Yêu cầu mở khóa bảng điểm lớp học phần',
                content: `Giảng viên lớp ${section.sectionCode} (${section.course?.name}) yêu cầu mở khóa bảng điểm để xử lý phúc khảo điểm sinh viên: ${reason}`,
                link: '/grades',
                classSection: classSectionId
            })
        );
        await Promise.all(notifPromises);

        const io = req.app.get('io');
        if (io) {
            admins.forEach(a => {
                io.to(a._id.toString()).emit('new-notification', {
                    type: 'system',
                    title: '🔓 Yêu cầu mở khóa bảng điểm',
                    content: `Lớp ${section.sectionCode} có yêu cầu mở khóa để sửa phúc khảo.`
                });
            });
        }

        res.json({ success: true, message: 'Đã gửi yêu cầu mở khóa bảng điểm lên Admin thành công!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /teacher/grades/re-submit — Giảng viên chốt điểm sau khi sửa phúc khảo và gửi lại cho Admin
exports.reSubmitGradesToAdmin = async (req, res) => {
    try {
        const { classSectionId, appealId } = req.body;
        const section = await ClassSection.findById(classSectionId).populate('course');
        if (!section) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp' });

        await Grade.updateMany(
            { classSection: classSectionId },
            {
                $set: {
                    submissionStatus: 're_submitted',
                    isLocked: true,
                    unlockStatus: 'locked',
                    submittedAt: new Date()
                }
            }
        );

        if (appealId) {
            await GradeAppeal.findByIdAndUpdate(appealId, {
                status: 'teacher_re_submitted',
                teacherFeedback: req.body.feedback || 'Giảng viên đã rà soát, chấm lại và cập nhật điểm phúc khảo gửi Admin duyệt'
            });
        }

        const admins = await User.find({ role: 'admin' });
        const notifPromises = admins.map(a =>
            Notification.create({
                recipient: a._id,
                sender: req.user.id,
                type: 'system',
                title: '📥 Bảng điểm sau phúc khảo đã được nộp lại',
                content: `Giảng viên đã chốt lại điểm lớp ${section.sectionCode} (${section.course?.name}) sau khi sửa phúc khảo, chờ Admin công bố.`,
                link: '/grades',
                classSection: classSectionId
            })
        );
        await Promise.all(notifPromises);

        res.json({ success: true, message: 'Đã chốt điểm phúc khảo và gửi lại cho Admin để công bố chính thức!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /teacher/appeals — Giảng viên xem danh sách các đơn phúc khảo các lớp của mình
exports.getTeacherAppeals = async (req, res) => {
    try {
        const appeals = await GradeAppeal.find({ teacher: req.user.id })
            .populate('student', 'code name email classCode avatar')
            .populate('course', 'code name credits')
            .populate('classSection', 'sectionCode')
            .populate('grade')
            .populate('messages.sender', 'name code role avatar')
            .sort({ createdAt: -1 });
        res.json({ success: true, data: appeals });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /teacher/appeals/:appealId/respond — Giảng viên phản hồi đơn phúc khảo (từ chối hoặc chấp thuận)
exports.respondToAppeal = async (req, res) => {
    try {
        const { appealId } = req.params;
        const { action, feedback } = req.body; // action: 'reject' | 'reply' | 'feedback' | 'forward_to_admin'
        const appeal = await GradeAppeal.findById(appealId).populate('student course classSection');
        if (!appeal) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn phúc khảo' });

        if (action === 'reject') {
            appeal.status = 'teacher_rejected';
            appeal.teacherFeedback = feedback || 'Giảng viên đã rà soát lại bài thi, kết quả giữ nguyên theo barem chấm.';
            appeal.resolvedAt = new Date();
            appeal.messages.push({
                sender: req.user.id,
                role: 'teacher',
                content: `[Từ chối phúc khảo - Giữ điểm] ${appeal.teacherFeedback}`
            });
            await appeal.save();

            // Thông báo đến sinh viên
            const teacherUser = await User.findById(req.user.id).select('name code');
            await Notification.create({
                recipient: appeal.student._id,
                sender: req.user.id,
                type: 'system',
                title: '📋 Giảng viên đã phản hồi thắc mắc về điểm',
                content: `GV ${teacherUser?.name || 'phụ trách'} phản hồi: ${appeal.teacherFeedback}`,
                link: '/profile'
            });

            const io = req.app ? req.app.get('io') : null;
            if (io) {
                io.to(appeal.student._id.toString()).emit('new-notification', {
                    type: 'system',
                    title: '📋 Giảng viên đã phản hồi thắc mắc về điểm',
                    content: `GV ${teacherUser?.name || 'phụ trách'} phản hồi: ${appeal.teacherFeedback}`
                });
            }

            const populated = await GradeAppeal.findById(appealId)
                .populate('student', 'code name email classCode avatar')
                .populate('course', 'code name credits')
                .populate('classSection', 'sectionCode')
                .populate('messages.sender', 'name code role avatar');

            return res.json({ success: true, message: 'Đã gửi phản hồi giữ nguyên điểm cho sinh viên.', data: populated });
        }

        if (action === 'reply' || action === 'feedback') {
            appeal.teacherFeedback = feedback || '';
            if (appeal.status === 'pending_teacher') {
                appeal.status = 'teacher_replied';
            }
            if (feedback && feedback.trim()) {
                appeal.messages.push({
                    sender: req.user.id,
                    role: 'teacher',
                    content: feedback.trim()
                });
            }
            await appeal.save();

            // Thông báo đến sinh viên
            const teacherUser = await User.findById(req.user.id).select('name code');
            await Notification.create({
                recipient: appeal.student._id,
                sender: req.user.id,
                type: 'system',
                title: '💬 Giảng viên đã trả lời phản hồi của bạn',
                content: `GV ${teacherUser?.name || 'phụ trách'} môn ${appeal.course?.name} nhắn: "${appeal.teacherFeedback}"`,
                link: '/profile'
            });

            const io = req.app ? req.app.get('io') : null;
            if (io) {
                io.to(appeal.student._id.toString()).emit('new-notification', {
                    type: 'system',
                    title: '💬 Giảng viên đã trả lời phản hồi của bạn',
                    content: `GV ${teacherUser?.name || 'phụ trách'} môn ${appeal.course?.name} nhắn: "${appeal.teacherFeedback}"`
                });
            }

            const populated = await GradeAppeal.findById(appealId)
                .populate('student', 'code name email classCode avatar')
                .populate('course', 'code name credits')
                .populate('classSection', 'sectionCode')
                .populate('messages.sender', 'name code role avatar');

            return res.json({ success: true, message: 'Đã gửi câu trả lời đến sinh viên thành công!', data: populated });
        }

        // Giảng viên xem xét đơn phúc khảo và gửi ý kiến / phản hồi lên Admin để Admin quyết định
        if (action === 'forward_to_admin') {
            appeal.status = 'teacher_request_unlock';
            appeal.teacherFeedback = feedback || '';
            appeal.teacherUnlockRequestReason = feedback || 'Giảng viên xem xét và đề xuất Admin kiểm tra đơn phúc khảo này';
            await appeal.save();

            // Cập nhật unlockStatus trên bảng điểm nếu có gradeId
            if (appeal.grade) {
                await Grade.findByIdAndUpdate(appeal.grade, {
                    unlockStatus: 'requested_unlock',
                    unlockRequestedReason: feedback || 'Giảng viên xem xét đơn phúc khảo và yêu cầu Admin kiểm tra',
                    unlockRequestedAt: new Date()
                });
            }

            // Thông báo tới tất cả Admin
            const admins = await User.find({ role: 'admin' });
            const teacher = await User.findById(req.user.id).select('name code');
            const notifPromises = admins.map(a =>
                Notification.create({
                    recipient: a._id,
                    sender: req.user.id,
                    type: 'system',
                    title: '📬 Giảng viên gửi ý kiến về đơn phúc khảo điểm',
                    content: `GV ${teacher?.name || req.user.id} đã xem xét đơn phúc khảo môn ${appeal.course?.name} của SV ${appeal.student?.name} và gửi ý kiến: "${feedback || '(không có nội dung)'}". Admin vui lòng kiểm tra và quyết định.`,
                    link: '/grades',
                    classSection: appeal.classSection?._id || appeal.classSection
                })
            );
            await Promise.all(notifPromises);

            const io = req.app ? req.app.get('io') : null;
            if (io) {
                admins.forEach(a => {
                    io.to(a._id.toString()).emit('new-notification', {
                        type: 'system',
                        title: '📬 Giảng viên gửi ý kiến phúc khảo lên Admin',
                        content: `GV ${teacher?.name} gửi ý kiến về đơn phúc khảo môn ${appeal.course?.name}`
                    });
                });
            }

            // Thông báo cho sinh viên biết đơn đang được chuyển lên Admin
            await Notification.create({
                recipient: appeal.student._id,
                sender: req.user.id,
                type: 'system',
                title: '📤 Đơn phúc khảo đã được chuyển lên Admin',
                content: `Giảng viên đã xem xét đơn phúc khảo môn ${appeal.course?.name} và chuyển lên Admin để kiểm tra. Bạn sẽ được thông báo khi có kết quả chính thức.`,
                link: '/profile'
            });

            return res.json({ success: true, message: 'Đã gửi ý kiến phản hồi phúc khảo lên Admin thành công!', data: appeal });
        }

        res.json({ success: true, data: appeal });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// POST /teacher/appeals/:appealId/message — Giảng viên gửi tin nhắn phản hồi trong thread hội thoại
exports.sendAppealMessage = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { appealId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được để trống' });
        }

        const appeal = await GradeAppeal.findById(appealId).populate('student course classSection');
        if (!appeal) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn phúc khảo' });
        if (String(appeal.teacher) !== String(teacherId)) {
            return res.status(403).json({ success: false, message: 'Bạn không phải giảng viên phụ trách đơn phúc khảo này' });
        }

        // Thêm tin nhắn vào thread
        appeal.messages.push({
            sender: teacherId,
            role: 'teacher',
            content: content.trim()
        });

        // Cập nhật teacherFeedback (legacy) và status
        appeal.teacherFeedback = content.trim();
        if (appeal.status === 'pending_teacher') {
            appeal.status = 'teacher_replied';
        }
        await appeal.save();

        // Thông báo tới sinh viên
        const teacher = await User.findById(teacherId).select('name code');
        await Notification.create({
            recipient: appeal.student._id,
            sender: teacherId,
            type: 'system',
            title: '💬 Giảng viên đã trả lời phản hồi của bạn',
            content: `GV ${teacher?.name} môn ${appeal.course?.name} nhắn: "${content.trim().substring(0, 80)}${content.length > 80 ? '...' : ''}"`,
            link: '/profile'
        });

        const io = req.app ? req.app.get('io') : null;
        if (io) {
            io.to(appeal.student._id.toString()).emit('new-notification', {
                type: 'system',
                title: '💬 Giảng viên đã trả lời phản hồi của bạn',
                content: `GV ${teacher?.name}: "${content.trim().substring(0, 60)}..."`
            });
        }

        // Trả về appeal đã populate messages
        const updated = await GradeAppeal.findById(appealId)
            .populate('student', 'code name email classCode avatar')
            .populate('course', 'code name credits')
            .populate('classSection', 'sectionCode')
            .populate('messages.sender', 'name code role avatar');
        res.json({ success: true, message: 'Tin nhắn đã được gửi đến sinh viên!', data: updated });
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

