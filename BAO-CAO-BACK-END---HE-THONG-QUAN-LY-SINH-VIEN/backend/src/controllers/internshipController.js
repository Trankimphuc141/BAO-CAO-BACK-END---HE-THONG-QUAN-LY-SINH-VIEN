const Internship = require('../models/Internship');
const User = require('../models/User');

// 1. Lấy danh sách hồ sơ thực tập
exports.getInternships = async (req, res) => {
    try {
        const query = {};
        if (req.user && req.user.role === 'student') {
            query.student = req.user.id;
        } else if (req.user && req.user.role === 'teacher') {
            query.academicAdvisor = req.user.id;
        }

        const internships = await Internship.find(query)
            .populate('student', 'code name classCode email phone')
            .populate('academicAdvisor', 'code name email')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, count: internships.length, data: internships });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 2. Sinh viên đăng ký thông tin nơi thực tập
exports.registerInternship = async (req, res) => {
    try {
        const { companyName, position, mentorName, mentorEmail, academicAdvisorId, startDate, endDate, salary } = req.body;
        const studentId = req.user ? req.user.id : req.body.studentId;

        if (!companyName || !position || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin doanh nghiệp thực tập' });
        }

        const newInternship = await Internship.create({
            student: studentId,
            companyName,
            position,
            mentorName: mentorName || 'Trưởng nhóm kỹ thuật',
            mentorEmail: mentorEmail || 'mentor@company.vn',
            academicAdvisor: academicAdvisorId,
            startDate,
            endDate,
            salary: salary || '5.000.000 VNĐ / tháng',
            status: 'Đang thực tập'
        });

        const populated = await Internship.findById(newInternship._id)
            .populate('student', 'code name classCode')
            .populate('academicAdvisor', 'name');

        return res.status(201).json({
            success: true,
            message: 'Đã đăng ký đơn vị thực tập doanh nghiệp thành công',
            data: populated
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3. Giảng viên hoặc Doanh nghiệp cập nhật điểm đánh giá thực tập
exports.evaluateInternship = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyEvaluationScore, advisorScore, feedback, isEmployedAfterInternship, status } = req.body;

        const internship = await Internship.findById(id);
        if (!internship) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ thực tập' });
        }

        if (companyEvaluationScore !== undefined) internship.companyEvaluationScore = Number(companyEvaluationScore);
        if (advisorScore !== undefined) internship.advisorScore = Number(advisorScore);
        if (feedback !== undefined) internship.feedback = feedback;
        if (isEmployedAfterInternship !== undefined) internship.isEmployedAfterInternship = isEmployedAfterInternship;
        if (status) internship.status = status;

        if (internship.companyEvaluationScore !== null && internship.advisorScore !== null) {
            internship.finalGrade = Number(((internship.companyEvaluationScore * 0.5) + (internship.advisorScore * 0.5)).toFixed(1));
            internship.status = internship.finalGrade >= 5.0 ? 'Đã hoàn thành' : 'Không đạt';
        }

        await internship.save();

        return res.status(200).json({
            success: true,
            message: 'Đã cập nhật kết quả đánh giá thực tập thành công',
            data: internship
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
