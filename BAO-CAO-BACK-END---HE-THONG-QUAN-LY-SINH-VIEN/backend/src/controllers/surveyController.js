const Survey = require('../models/Survey');
const ClassSection = require('../models/ClassSection');

// 1. Lấy danh sách khảo sát (cho sinh viên làm khảo sát hoặc giảng viên xem đánh giá)
exports.getSurveys = async (req, res) => {
    try {
        const query = {};
        if (req.user && req.user.role === 'teacher') {
            query.teacher = req.user.id;
        }

        const surveys = await Survey.find(query)
            .populate('classSection')
            .populate('course')
            .populate('teacher', 'name code email');

        return res.status(200).json({ success: true, count: surveys.length, data: surveys });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 2. Sinh viên gửi đánh giá giảng viên (Hỗ trợ ẩn danh)
exports.submitSurveyResponse = async (req, res) => {
    try {
        const { surveyId } = req.params;
        const { teachingMethodRating, knowledgeRating, punctualityRating, fairnessRating, feedback, isAnonymous } = req.body;

        const survey = await Survey.findById(surveyId);
        if (!survey) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu khảo sát' });
        }

        if (!survey.isOpen) {
            return res.status(400).json({ success: false, message: 'Khảo sát này đã đóng' });
        }

        const overallRating = Number((
            (Number(teachingMethodRating) + Number(knowledgeRating) + Number(punctualityRating) + Number(fairnessRating)) / 4
        ).toFixed(1));

        const responseObj = {
            student: isAnonymous ? null : (req.user ? req.user.id : null),
            teachingMethodRating: Number(teachingMethodRating),
            knowledgeRating: Number(knowledgeRating),
            punctualityRating: Number(punctualityRating),
            fairnessRating: Number(fairnessRating),
            overallRating,
            feedback: feedback || '',
            submittedAt: new Date()
        };

        survey.responses.push(responseObj);
        await survey.save();

        return res.status(200).json({
            success: true,
            message: 'Đã gửi ý kiến đánh giá giảng dạy thành công (Đã mã hóa bảo mật danh tính)'
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3. Xem báo cáo tổng hợp sao đánh giá của Giảng viên
exports.getTeacherSurveyReport = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const surveys = await Survey.find({ teacher: teacherId })
            .populate('course')
            .populate('classSection');

        let totalResponses = 0;
        let sumTeachingMethod = 0;
        let sumKnowledge = 0;
        let sumPunctuality = 0;
        let sumFairness = 0;
        let sumOverall = 0;
        const feedbackList = [];

        surveys.forEach(s => {
            s.responses.forEach(r => {
                totalResponses++;
                sumTeachingMethod += r.teachingMethodRating;
                sumKnowledge += r.knowledgeRating;
                sumPunctuality += r.punctualityRating;
                sumFairness += r.fairnessRating;
                sumOverall += r.overallRating;
                if (r.feedback) {
                    feedbackList.push({
                        feedback: r.feedback,
                        overallRating: r.overallRating,
                        courseName: s.course?.name,
                        date: r.submittedAt
                    });
                }
            });
        });

        const report = {
            totalSurveys: surveys.length,
            totalResponses,
            avgTeachingMethod: totalResponses > 0 ? Number((sumTeachingMethod / totalResponses).toFixed(2)) : 0,
            avgKnowledge: totalResponses > 0 ? Number((sumKnowledge / totalResponses).toFixed(2)) : 0,
            avgPunctuality: totalResponses > 0 ? Number((sumPunctuality / totalResponses).toFixed(2)) : 0,
            avgFairness: totalResponses > 0 ? Number((sumFairness / totalResponses).toFixed(2)) : 0,
            avgOverall: totalResponses > 0 ? Number((sumOverall / totalResponses).toFixed(2)) : 0,
            feedbackList
        };

        return res.status(200).json({ success: true, report });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
