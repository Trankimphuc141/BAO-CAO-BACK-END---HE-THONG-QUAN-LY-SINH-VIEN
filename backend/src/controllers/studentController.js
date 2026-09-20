const mongoose = require('mongoose');
const User = require('../models/User');
const Grade = require('../models/Grade');
const GradeAppeal = require('../models/GradeAppeal');
const ClassSection = require('../models/ClassSection');
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');

// 1. Lấy thông tin hồ sơ học tập và tổng kết GPA/CPA
exports.getStudentPortalInfo = async (req, res) => {
    try {
        const studentId = req.params.studentId || (req.user ? req.user.id : null);
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin sinh viên' });
        }

        const student = await User.findById(studentId).select('-password');
        if (!student) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên' });
        }

        // Lấy danh sách các lớp học phần sinh viên đang theo học
        const enrolledSections = await ClassSection.find({ students: studentId })
            .populate('course')
            .populate('teacher', 'name email phone avatar');

        // Tự động đảm bảo mỗi lớp học phần sinh viên đang học đều có bản ghi điểm (Grade)
        let hasNewGrade = false;
        for (const sec of enrolledSections) {
            const exists = await Grade.exists({ student: studentId, classSection: sec._id });
            if (!exists) {
                try {
                    await Grade.create({
                        student: studentId,
                        classSection: sec._id,
                        course: sec.course?._id || sec.course,
                        semester: sec.semester || 'HK1-2026-2027',
                        sessionScores: Array(15).fill(10),
                        attendanceScore: 10,
                        midtermScore: 0,
                        finalScore: 0,
                        isBannedFromExam: false,
                        isPublished: false
                    });
                    hasNewGrade = true;
                } catch (e) {
                    // Ignore duplicate key if created concurrently
                }
            }
        }

        // Lấy tất cả bảng điểm của sinh viên (gồm cả đã công bố và đang cập nhật điểm)
        let grades = await Grade.find({ student: studentId })
            .populate('course')
            .populate({
                path: 'classSection',
                populate: { path: 'teacher', select: 'code name email phone avatar' }
            });

        // Lấy danh sách các phản hồi / phúc khảo của sinh viên kèm thông tin giảng viên và môn học
        const appeals = await GradeAppeal.find({ student: studentId })
            .populate('course', 'code name credits')
            .populate('classSection', 'sectionCode semester year')
            .populate('teacher', 'name email phone')
            .sort({ createdAt: -1 });

        // Xử lý bảo đảm nguyên tắc: Sinh viên chỉ nhìn thấy điểm mới khi Admin đã chốt và công bố!
        // Nếu môn học đang có đơn phúc khảo chưa được Admin chốt công bố (status !== 'admin_approved_published'),
        // sinh viên sẽ tiếp tục thấy điểm ban đầu (oldScore) của môn học đó.
        const processedGrades = grades.map(g => {
            const gObj = g.toObject ? g.toObject() : { ...g };
            const activeAppeal = appeals.find(a => 
                (String(a.grade?._id || a.grade) === String(g._id) ||
                 String(a.classSection?._id || a.classSection) === String(g.classSection?._id || g.classSection)) &&
                a.status !== 'admin_approved_published'
            );

            if (activeAppeal && activeAppeal.oldScore !== null && activeAppeal.oldScore !== undefined) {
                // Khôi phục điểm hiển thị về điểm ban đầu cho sinh viên xem
                if (activeAppeal.scoreType === 'midterm') {
                    gObj.midtermScore = activeAppeal.oldScore;
                } else if (activeAppeal.scoreType === 'attendance') {
                    gObj.attendanceScore = activeAppeal.oldScore;
                } else {
                    gObj.finalScore = activeAppeal.oldScore;
                }

                // Tính lại điểm tổng kết hiển thị cho sinh viên theo điểm ban đầu
                const att = gObj.attendanceScore || 0;
                const mid = gObj.midtermScore || 0;
                const fin = gObj.finalScore || 0;
                gObj.totalScore10 = Number((att * 0.1 + mid * 0.3 + fin * 0.6).toFixed(2));
                if (gObj.totalScore10 >= 8.5) { gObj.letterGrade = 'A'; gObj.totalScore4 = 4.0; gObj.isPassed = true; }
                else if (gObj.totalScore10 >= 8.0) { gObj.letterGrade = 'B+'; gObj.totalScore4 = 3.5; gObj.isPassed = true; }
                else if (gObj.totalScore10 >= 7.0) { gObj.letterGrade = 'B'; gObj.totalScore4 = 3.0; gObj.isPassed = true; }
                else if (gObj.totalScore10 >= 6.5) { gObj.letterGrade = 'C+'; gObj.totalScore4 = 2.5; gObj.isPassed = true; }
                else if (gObj.totalScore10 >= 5.5) { gObj.letterGrade = 'C'; gObj.totalScore4 = 2.0; gObj.isPassed = true; }
                else if (gObj.totalScore10 >= 5.0) { gObj.letterGrade = 'D+'; gObj.totalScore4 = 1.5; gObj.isPassed = true; }
                else if (gObj.totalScore10 >= 4.0) { gObj.letterGrade = 'D'; gObj.totalScore4 = 1.0; gObj.isPassed = true; }
                else { gObj.letterGrade = 'F'; gObj.totalScore4 = 0.0; gObj.isPassed = false; }

                if (gObj.isBannedFromExam) {
                    gObj.letterGrade = 'F';
                    gObj.totalScore4 = 0.0;
                    gObj.isPassed = false;
                }

                gObj.isUnderAppeal = true;
                gObj.appealStatus = activeAppeal.status;
                gObj.appealScoreType = activeAppeal.scoreType;
                gObj.appealOldScore = activeAppeal.oldScore;
            } else {
                const resolvedAppeal = appeals.find(a => 
                    (String(a.grade?._id || a.grade) === String(g._id) ||
                     String(a.classSection?._id || a.classSection) === String(g.classSection?._id || g.classSection)) &&
                    a.status === 'admin_approved_published'
                );
                if (resolvedAppeal) {
                    gObj.isAppealResolved = true;
                    gObj.appealNewScore = resolvedAppeal.newScore;
                }
            }

            return gObj;
        });

        // Tính GPA và CPA dựa trên các môn đã chính thức công bố điểm
        const publishedGrades = processedGrades.filter(g => g.isPublished);
        let totalCredits = 0;
        let totalWeightedScore4 = 0;
        let totalWeightedScore10 = 0;
        let passedCredits = 0;
        let totalTuition = 0;

        publishedGrades.forEach(g => {
            const credits = g.course?.credits || 3;
            totalCredits += credits;
            totalWeightedScore4 += (g.totalScore4 || 0) * credits;
            totalWeightedScore10 += (g.totalScore10 || 0) * credits;
            if (g.isPassed) passedCredits += credits;
            totalTuition += (g.course?.tuitionFeePerCredit || 450000) * credits;
        });

        const gpa4 = totalCredits > 0 ? Number((totalWeightedScore4 / totalCredits).toFixed(2)) : 0;
        const gpa10 = totalCredits > 0 ? Number((totalWeightedScore10 / totalCredits).toFixed(2)) : 0;

        // Xếp loại học lực
        let academicStanding = 'Chưa xếp loại';
        if (gpa4 >= 3.6) academicStanding = 'Xuất sắc';
        else if (gpa4 >= 3.2) academicStanding = 'Giỏi';
        else if (gpa4 >= 2.5) academicStanding = 'Khá';
        else if (gpa4 >= 2.0) academicStanding = 'Trung bình';
        else if (totalCredits > 0) academicStanding = 'Yếu / Kém';

        // Lấy thông báo mới nhất
        const announcements = await Announcement.find().sort({ isPinned: -1, createdAt: -1 }).limit(20);

        return res.status(200).json({
            success: true,
            student,
            academicSummary: {
                totalCredits,
                passedCredits,
                gpa4,
                gpa10,
                academicStanding,
                totalTuition,
                tuitionPaid: totalTuition,
                tuitionRemaining: 0
            },
            grades: processedGrades,
            enrolledSections,
            appeals,
            announcements
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 2. Lấy thông báo chung
exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .populate('author', 'name role')
            .sort({ isPinned: -1, createdAt: -1 });
        return res.status(200).json({ success: true, count: announcements.length, data: announcements });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3. Tạo thông báo mới (Chỉ Giảng viên hoặc Quản trị viên)
exports.createAnnouncement = async (req, res) => {
    try {
        const { title, content, category, isPinned } = req.body;
        const authorId = req.user ? req.user.id : null;
        if (!title || !content) {
            return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung là bắt buộc' });
        }
        const announcement = await Announcement.create({
            title,
            content,
            category: category || 'Chung',
            isPinned: isPinned || false,
            author: authorId
        });
        return res.status(201).json({ success: true, message: 'Đã tạo thông báo thành công', data: announcement });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 4. Xóa thông báo (Chỉ Giảng viên hoặc Quản trị viên)
exports.deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo' });
        }
        await Announcement.findByIdAndDelete(req.params.id);
        return res.status(200).json({ success: true, message: 'Đã xóa thông báo thành công' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 5. Lấy danh sách thông báo cá nhân của sinh viên
exports.getNotifications = async (req, res) => {
    try {
        const studentId = req.user ? req.user.id : null;
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin người dùng' });
        }
        const notifications = await Notification.find({ recipient: studentId })
            .populate('sender', 'name avatar code')
            .sort({ createdAt: -1 });
        return res.status(200).json({ success: true, count: notifications.length, data: notifications });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 6. Đánh dấu thông báo đã đọc
exports.markNotificationRead = async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
        return res.status(200).json({ success: true, message: 'Đã đọc thông báo' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 7. Đánh dấu tất cả thông báo là đã đọc
exports.markAllNotificationsRead = async (req, res) => {
    try {
        const studentId = req.user ? req.user.id : null;
        await Notification.updateMany({ recipient: studentId, isRead: false }, { $set: { isRead: true, readAt: new Date() } });
        return res.status(200).json({ success: true, message: 'Đã đọc tất cả thông báo' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 8. Sinh viên gửi phản hồi / phúc khảo điểm đến Giảng viên
exports.submitGradeAppeal = async (req, res) => {
    try {
        const studentId = req.user.id;
        let gradeId = req.params.gradeId || req.body.gradeId;
        const { classSectionId, scoreType, reason, studentNote, proposedScore } = req.body;

        if (!reason || !reason.trim()) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do / nội dung xin phúc khảo điểm số' });
        }

        let grade = null;
        if (gradeId && mongoose.Types.ObjectId.isValid(gradeId)) {
            grade = await Grade.findById(gradeId).populate('classSection course');
        }
        if (!grade && classSectionId && mongoose.Types.ObjectId.isValid(classSectionId)) {
            grade = await Grade.findOne({ classSection: classSectionId, student: studentId }).populate('classSection course');
            if (!grade) {
                const sec = await ClassSection.findById(classSectionId);
                if (sec) {
                    grade = await Grade.create({
                        student: studentId,
                        course: sec.course,
                        classSection: sec._id,
                        attendanceScore: 0,
                        midtermScore: 0,
                        finalScore: 0
                    });
                    grade = await Grade.findById(grade._id).populate('classSection course');
                }
            }
        }

        if (!grade) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu học phần để nộp đơn phúc khảo' });
        }

        if (String(grade.student?._id || grade.student) !== String(studentId)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền phúc khảo bản ghi điểm này' });
        }

        // Kiểm tra xem đã có đơn phúc khảo đang chờ xử lý hay không
        const existing = await GradeAppeal.findOne({
            grade: grade._id,
            student: studentId,
            status: { $in: ['pending_teacher', 'teacher_request_unlock', 'admin_unlocked', 'teacher_re_submitted'] }
        });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Bạn đã nộp đơn phúc khảo cho môn học này và đang được xử lý!' });
        }

        // Xác định điểm hiện tại cần phúc khảo
        let oldScore = grade.finalScore || 0;
        if (scoreType === 'midterm') oldScore = grade.midtermScore || 0;
        else if (scoreType === 'attendance') oldScore = grade.attendanceScore || 0;

        const classSec = await ClassSection.findById(grade.classSection?._id || grade.classSection).populate('teacher');
        let teacherId = classSec?.teacher?._id || classSec?.teacher;
        if (!teacherId) {
            const anyTeacher = await User.findOne({ role: 'teacher' });
            if (anyTeacher) teacherId = anyTeacher._id;
        }
        if (!teacherId) {
            const anyAdmin = await User.findOne({ role: 'admin' });
            if (anyAdmin) teacherId = anyAdmin._id;
        }
        if (!teacherId) {
            return res.status(400).json({ success: false, message: 'Lớp học phần này chưa có Giảng viên phụ trách để tiếp nhận đơn phúc khảo' });
        }

        const appeal = await GradeAppeal.create({
            student: studentId,
            classSection: classSec._id,
            course: grade.course?._id || grade.course,
            grade: grade._id,
            teacher: teacherId,
            scoreType: scoreType || 'final',
            oldScore,
            proposedScore: (proposedScore !== undefined && proposedScore !== '' && !isNaN(Number(proposedScore))) ? Number(proposedScore) : null,
            reason: reason.trim(),
            studentNote: studentNote ? studentNote.trim() : '',
            messages: [{
                sender: studentId,
                role: 'student',
                content: reason.trim() + (studentNote ? ` (Ghi chú: ${studentNote.trim()})` : '')
            }],
            status: 'pending_teacher'
        });

        // Gửi thông báo đến Giảng viên
        const studentUser = await User.findById(studentId);
        await Notification.create({
            recipient: teacherId,
            sender: studentId,
            type: 'system',
            title: '📝 Đơn phúc khảo điểm từ sinh viên',
            content: `Sinh viên ${studentUser?.name} (${studentUser?.code}) vừa nộp đơn phúc khảo môn ${grade.course?.name}: "${reason.trim().substring(0, 80)}..."`,
            link: '/grades',
            classSection: classSec._id
        });

        const io = req.app ? req.app.get('io') : null;
        if (io) {
            io.to(teacherId.toString()).emit('new-notification', {
                type: 'system',
                title: '📝 Đơn phúc khảo điểm từ sinh viên',
                content: `Sinh viên ${studentUser?.name} (${studentUser?.code}) vừa nộp đơn phúc khảo môn ${grade.course?.name}!`
            });
            io.to(teacherId.toString()).emit('new-appeal', {
                appealId: appeal._id,
                studentName: studentUser?.name,
                studentCode: studentUser?.code,
                courseName: grade.course?.name
            });
            io.emit('appeal-updated', { classSectionId: classSec._id, appealId: appeal._id });
            io.emit('grade-updated', { classSectionId: classSec._id });
        }

        const populatedAppeal = await GradeAppeal.findById(appeal._id)
            .populate('student', 'code name email classCode avatar phone department')
            .populate('teacher', 'code name email')
            .populate('course', 'code name credits')
            .populate('classSection', 'sectionCode semester');

        res.status(201).json({
            success: true,
            message: 'Đơn phúc khảo điểm đã được gửi thành công đến Giảng viên phụ trách để xem xét!',
            data: populatedAppeal
        });
    } catch (err) {
        console.error('Lỗi submitGradeAppeal:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 9. Lấy danh sách đơn phúc khảo của sinh viên
exports.getStudentAppeals = async (req, res) => {
    try {
        const studentId = req.user.id;
        const appeals = await GradeAppeal.find({ student: studentId })
            .populate('course', 'code name credits')
            .populate('classSection', 'sectionCode')
            .populate('teacher', 'name email')
            .populate('messages.sender', 'name code role avatar')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: appeals });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 10. Sinh viên gửi tin nhắn phản hồi trong thread hội thoại với Giảng viên
exports.sendAppealMessage = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { appealId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: 'Nội dung tin nhắn không được để trống' });
        }

        const appeal = await GradeAppeal.findById(appealId).populate('teacher course student');
        if (!appeal) return res.status(404).json({ success: false, message: 'Không tìm thấy đơn phúc khảo' });
        if (String(appeal.student._id || appeal.student) !== String(studentId)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền gửi tin nhắn vào đơn phúc khảo này' });
        }

        // Thêm tin nhắn vào thread
        appeal.messages.push({
            sender: studentId,
            role: 'student',
            content: content.trim()
        });
        if (appeal.status === 'teacher_replied') {
            appeal.status = 'pending_teacher';
        }
        await appeal.save();

        // Thông báo tới Giảng viên
        const studentUser = await User.findById(studentId).select('name code');
        const teacherId = appeal.teacher?._id || appeal.teacher;
        await Notification.create({
            recipient: teacherId,
            sender: studentId,
            type: 'system',
            title: '💬 Sinh viên phản hồi lại trong hội thoại phúc khảo',
            content: `SV ${studentUser?.name} (${studentUser?.code}) nhắn: "${content.trim().substring(0, 80)}${content.length > 80 ? '...' : ''}" — Môn: ${appeal.course?.name}`,
            link: '/grades',
            classSection: appeal.classSection
        });

        const io = req.app ? req.app.get('io') : null;
        if (io) {
            io.to(teacherId.toString()).emit('new-notification', {
                type: 'system',
                title: '💬 SV phản hồi trong phúc khảo',
                content: `${studentUser?.name}: "${content.trim().substring(0, 60)}..."`
            });
            io.emit('appeal-updated', { appealId, classSectionId: appeal.classSection });
        }

        // Trả về appeal đã populate đầy đủ
        const updated = await GradeAppeal.findById(appealId)
            .populate('course', 'code name credits')
            .populate('classSection', 'sectionCode')
            .populate('teacher', 'name email')
            .populate('messages.sender', 'name code role avatar');
        res.json({ success: true, message: 'Tin nhắn đã được gửi!', data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
