const Thesis = require('../models/Thesis');
const User = require('../models/User');
const antiFraudService = require('../services/antiFraudService');

// 1. Lấy danh sách đồ án tốt nghiệp
exports.getTheses = async (req, res) => {
    try {
        const query = {};
        if (req.user && req.user.role === 'student') {
            query.student = req.user.id;
        } else if (req.user && req.user.role === 'teacher') {
            query.$or = [
                { advisor: req.user.id },
                { reviewer: req.user.id },
                { committee: req.user.id }
            ];
        }

        const theses = await Thesis.find(query)
            .populate('student', 'code name classCode email')
            .populate('advisor', 'code name email')
            .populate('reviewer', 'code name email')
            .populate('committee', 'code name email')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: theses.length, data: theses });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 2. Đăng ký đề tài đồ án tốt nghiệp
exports.registerThesis = async (req, res) => {
    try {
        const { topicTitle, description, advisorId, reviewerId } = req.body;
        const studentId = req.user ? req.user.id : req.body.studentId;

        if (!topicTitle || !advisorId) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tên đề tài và giảng viên hướng dẫn' });
        }

        const topicCode = `DA_${Date.now().toString().slice(-6)}`;

        const defaultMilestones = [
            { name: '1. Nộp đề cương chi tiết', deadline: '2026-09-30', status: 'Đã duyệt', score: 9.0, comment: 'Đề cương đạt yêu cầu' },
            { name: '2. Báo cáo tiến độ giữa kỳ', deadline: '2026-10-30', status: 'Đã duyệt', score: 8.5, comment: 'Xây dựng xong backend & database' },
            { name: '3. Nộp bản thảo báo cáo cuối', deadline: '2026-11-20', status: 'Đã nộp', score: null, comment: 'Đang kiểm tra chống đạo văn' },
            { name: '4. Bảo vệ trước hội đồng', deadline: '2026-12-15', status: 'Chưa nộp', score: null, comment: '' }
        ];

        const newThesis = await Thesis.create({
            topicCode,
            topicTitle,
            description: description || 'Xây dựng hệ thống phần mềm hoàn chỉnh theo kiến trúc chuẩn.',
            student: studentId,
            advisor: advisorId,
            reviewer: reviewerId,
            status: 'Đang thực hiện',
            milestones: defaultMilestones,
            similarityPercentage: 12.5
        });

        const populated = await Thesis.findById(newThesis._id)
            .populate('student', 'code name classCode')
            .populate('advisor', 'name email');

        return res.status(201).json({
            success: true,
            message: 'Đăng ký đề tài tốt nghiệp thành công',
            data: populated
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3. Cập nhật mốc tiến độ hoặc chấm điểm bảo vệ đồ án
exports.updateThesisMilestoneOrScore = async (req, res) => {
    try {
        const { id } = req.params;
        const { milestoneIndex, status, score, comment, advisorScore, reviewerScore, committeeScore, defenseDate, defenseRoom } = req.body;

        const thesis = await Thesis.findById(id);
        if (!thesis) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đề tài' });
        }

        // Cập nhật tiến độ
        if (milestoneIndex !== undefined && thesis.milestones[milestoneIndex]) {
            if (status) thesis.milestones[milestoneIndex].status = status;
            if (score !== undefined) thesis.milestones[milestoneIndex].score = Number(score);
            if (comment) thesis.milestones[milestoneIndex].comment = comment;
        }

        // Cập nhật điểm thành phần
        if (advisorScore !== undefined) thesis.advisorScore = Number(advisorScore);
        if (reviewerScore !== undefined) thesis.reviewerScore = Number(reviewerScore);
        if (committeeScore !== undefined) thesis.committeeScore = Number(committeeScore);
        if (defenseDate) thesis.defenseDate = defenseDate;
        if (defenseRoom) thesis.defenseRoom = defenseRoom;

        // Tính điểm tổng kết bảo vệ (GVHD 30%, GVPB 30%, Hội đồng 40%)
        if (thesis.advisorScore !== null && thesis.reviewerScore !== null && thesis.committeeScore !== null) {
            thesis.finalScore = Number((
                (thesis.advisorScore * 0.3) + 
                (thesis.reviewerScore * 0.3) + 
                (thesis.committeeScore * 0.4)
            ).toFixed(2));
            thesis.status = thesis.finalScore >= 5.0 ? 'Đã bảo vệ' : 'Không đạt';
        }

        await thesis.save();

        return res.status(200).json({
            success: true,
            message: 'Đã cập nhật tiến độ và điểm đồ án tốt nghiệp',
            data: thesis
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
