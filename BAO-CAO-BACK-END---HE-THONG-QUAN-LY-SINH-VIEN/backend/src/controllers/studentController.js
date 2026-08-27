const User = require('../models/User');
const Grade = require('../models/Grade');
const ClassSection = require('../models/ClassSection');
const Announcement = require('../models/Announcement');

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

        // Lấy tất cả bảng điểm
        const grades = await Grade.find({ student: studentId })
            .populate('course')
            .populate({
                path: 'classSection',
                populate: { path: 'teacher', select: 'name email' }
            });

        // Tính GPA và CPA
        let totalCredits = 0;
        let totalWeightedScore4 = 0;
        let totalWeightedScore10 = 0;
        let passedCredits = 0;
        let totalTuition = 0;

        grades.forEach(g => {
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
            grades,
            announcements
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 2. Lấy danh sách thông báo học vụ
exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ isPinned: -1, createdAt: -1 });
        return res.status(200).json({ success: true, count: announcements.length, data: announcements });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3. Giảng viên / Phòng đào tạo gửi thông báo mới cho sinh viên
exports.createAnnouncement = async (req, res) => {
    try {
        const { title, category, content, author, isPinned } = req.body;
        if (!title || !content) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tiêu đề và nội dung thông báo' });
        }

        const newAnnouncement = await Announcement.create({
            title: title.trim(),
            category: category || 'Học vụ',
            content: content.trim(),
            author: author || 'TS. Trần Minh Đức - Giảng viên phụ trách',
            isPinned: !!isPinned,
            date: new Date().toISOString().split('T')[0]
        });

        return res.status(201).json({
            success: true,
            message: 'Đã phát thông báo mới tới toàn thể sinh viên thành công!',
            data: newAnnouncement
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 4. Xóa thông báo
exports.deleteAnnouncement = async (req, res) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        return res.status(200).json({ success: true, message: 'Đã xóa thông báo' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
