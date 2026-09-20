const Survey = require('../models/Survey');
const User = require('../models/User');
const Course = require('../models/Course');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');

/**
 * 1. Lấy danh sách phiếu đánh giá / khảo sát
 */
exports.getSurveys = async (req, res) => {
    try {
        const user = req.user;
        let query = {};

        if (user && user.role === 'student') {
            const studentCode = user.code;
            const studentId = user.id || user._id;

            query = {
                isOpen: true,
                $or: [
                    { targetStudentCode: 'ALL' },
                    { targetStudentCode: { $regex: new RegExp(`^${studentCode}$`, 'i') } },
                    { targetStudent: studentId }
                ]
            };
        } else if (user && user.role === 'teacher') {
            query.teacher = user.id || user._id;
        }

        const surveys = await Survey.find(query)
            .populate('teacher', 'name code email avatar department')
            .populate('course', 'name code')
            .populate('targetStudent', 'name code email classCode')
            .sort({ createdAt: -1 });

        // Nếu là sinh viên, gắn cờ đã làm hay chưa
        const studentId = user ? String(user.id || user._id) : null;
        const studentCode = user ? user.code : null;

        const data = surveys.map(s => {
            const sObj = s.toObject();
            if (user && user.role === 'student') {
                const myResponse = sObj.responses.find(r => 
                    (r.student && String(r.student) === studentId) ||
                    (r.studentCode && r.studentCode.toLowerCase() === (studentCode || '').toLowerCase())
                );
                sObj.hasSubmitted = !!myResponse;
                sObj.mySubmission = myResponse || null;
            }
            return sObj;
        });

        return ApiResponse.success(res, data, 'Lấy danh sách đánh giá thành công', 200, { total: data.length });
    } catch (err) {
        console.error('getSurveys error:', err);
        return ApiResponse.error(res, err.message);
    }
};

/**
 * 2. Admin tạo đợt đánh giá giảng viên mới
 * Bao gồm: môn học, mã số sinh viên, lựa chọn giảng viên, khung nhập đánh giá, số sao từ 0 đến 5
 */
exports.createSurvey = async (req, res) => {
    try {
        const {
            courseCode,
            courseName,
            courseId,
            targetStudentCode,
            targetStudentName,
            targetStudentId,
            teacherId,
            evaluationPrompt,
            title
        } = req.body;

        if (!teacherId) {
            return ApiResponse.badRequest(res, 'Vui lòng chọn giảng viên cần đánh giá');
        }
        if (!courseName && !courseCode) {
            return ApiResponse.badRequest(res, 'Vui lòng cung cấp thông tin môn học');
        }

        // Lấy thông tin giảng viên
        const teacher = await User.findById(teacherId);
        if (!teacher) {
            return ApiResponse.notFound(res, 'Không tìm thấy giảng viên đã chọn');
        }

        // Tìm sinh viên nếu có cung cấp mã số sinh viên hoặc id cụ thể
        let targetStudent = null;
        let studentCodeClean = (targetStudentCode && targetStudentCode.trim()) ? targetStudentCode.trim().toUpperCase() : 'ALL';
        let studentNameClean = targetStudentName ? targetStudentName.trim() : '';

        if (targetStudentId) {
            targetStudent = await User.findById(targetStudentId);
            if (targetStudent) {
                studentCodeClean = targetStudent.code;
                studentNameClean = targetStudent.name;
            }
        } else if (studentCodeClean !== 'ALL') {
            targetStudent = await User.findOne({ code: new RegExp(`^${studentCodeClean}$`, 'i'), role: 'student' });
            if (targetStudent) {
                studentNameClean = targetStudent.name;
            }
        }

        const surveyTitle = title || `Đánh giá môn ${courseName || courseCode} - Giảng viên ${teacher.name}`;

        const newSurvey = await Survey.create({
            title: surveyTitle,
            courseCode: courseCode || '',
            courseName: courseName || 'Học phần chuyên ngành',
            course: courseId || null,
            targetStudentCode: studentCodeClean,
            targetStudentName: studentNameClean,
            targetStudent: targetStudent ? targetStudent._id : null,
            teacher: teacher._id,
            teacherName: teacher.name,
            evaluationPrompt: evaluationPrompt || 'Vui lòng đánh giá mức độ hài lòng về chất lượng giảng dạy, tác phong sư phạm và sự hỗ trợ sinh viên của giảng viên.',
            minRating: 0,
            maxRating: 5,
            isOpen: true,
            createdBy: req.user ? (req.user.id || req.user._id) : null,
            responses: []
        });

        // Bắn Socket thông báo real-time cho sinh viên
        const io = req.app ? req.app.get('io') : null;
        if (io) {
            const notifData = {
                title: '📋 Đợt đánh giá giảng viên mới',
                content: `Bạn có phiếu đánh giá môn ${newSurvey.courseName} - Giảng viên: ${teacher.name}. Vui lòng tham gia đánh giá!`,
                link: '/survey',
                createdAt: new Date()
            };

            if (studentCodeClean !== 'ALL' && targetStudent) {
                io.to(String(targetStudent._id)).emit('new-notification', notifData);
            } else {
                io.to('student').emit('new-notification', notifData);
            }
        }

        return ApiResponse.created(res, newSurvey, 'Tạo đợt đánh giá giảng viên thành công!');
    } catch (err) {
        console.error('createSurvey error:', err);
        return ApiResponse.error(res, err.message);
    }
};

/**
 * 3. Sinh viên gửi đánh giá giảng viên (số sao 0-5 và khung nhập đánh giá)
 * Tự động gửi thông báo về hộp thư thông báo của Admin
 */
exports.submitSurveyResponse = async (req, res) => {
    try {
        const { surveyId } = req.params;
        const { feedback } = req.body;

        // Tính toán số sao linh hoạt (hỗ trợ cả rating trực tiếp và legacy fields)
        let numRating = req.body.rating !== undefined ? Number(req.body.rating) : NaN;
        if (isNaN(numRating)) {
            const legacyScores = [
                req.body.overallRating,
                req.body.teachingMethodRating,
                req.body.knowledgeRating,
                req.body.punctualityRating,
                req.body.fairnessRating
            ].filter(v => v !== undefined && !isNaN(Number(v)));

            if (legacyScores.length > 0) {
                const sum = legacyScores.reduce((a, b) => a + Number(b), 0);
                numRating = Math.round(sum / legacyScores.length);
            } else {
                numRating = 5;
            }
        }

        // Clamp 0 - 5
        numRating = Math.min(5, Math.max(0, Math.round(numRating)));

        const survey = await Survey.findById(surveyId).populate('teacher', 'name code email');
        if (!survey) {
            return ApiResponse.notFound(res, 'Không tìm thấy phiếu khảo sát / đánh giá');
        }

        if (!survey.isOpen) {
            return ApiResponse.badRequest(res, 'Đợt đánh giá này đã kết thúc hoặc bị đóng');
        }

        const studentUser = req.user;
        let studentId = studentUser ? (studentUser.id || studentUser._id) : null;
        let studentCode = req.body.studentCode || (studentUser ? studentUser.code : '');
        let studentName = req.body.studentName || (studentUser ? studentUser.name : '');

        // Nếu chưa có studentId nhưng có studentCode, cố gắng tìm User trong DB
        if (!studentId && studentCode && studentCode !== 'SV_AN_DANH') {
            const foundUser = await User.findOne({ code: new RegExp(`^${studentCode}$`, 'i') });
            if (foundUser) {
                studentId = foundUser._id;
                if (!studentName) studentName = foundUser.name;
            }
        }

        if (!studentCode) studentCode = studentId ? 'SV' : 'Ẩn danh';
        if (!studentName) studentName = studentId ? 'Sinh viên' : 'Sinh viên ẩn danh';

        // Kiểm tra xem sinh viên này đã gửi đánh giá cho phiếu này chưa
        if (studentId || (studentCode && studentCode !== 'Ẩn danh')) {
            const existingIdx = survey.responses.findIndex(r => 
                (studentId && r.student && String(r.student) === String(studentId)) ||
                (studentCode && r.studentCode && r.studentCode.toLowerCase() === studentCode.toLowerCase())
            );

            if (existingIdx !== -1) {
                survey.responses[existingIdx].rating = numRating;
                survey.responses[existingIdx].overallRating = numRating;
                survey.responses[existingIdx].studentCode = studentCode;
                survey.responses[existingIdx].studentName = studentName;
                survey.responses[existingIdx].feedback = feedback || '';
                survey.responses[existingIdx].submittedAt = new Date();
            } else {
                survey.responses.push({
                    student: studentId,
                    studentCode,
                    studentName,
                    rating: numRating,
                    overallRating: numRating,
                    feedback: feedback || '',
                    submittedAt: new Date()
                });
            }
        } else {
            survey.responses.push({
                student: null,
                studentCode,
                studentName,
                rating: numRating,
                overallRating: numRating,
                feedback: feedback || '',
                submittedAt: new Date()
            });
        }

        await survey.save();

        // ── GỬI THÔNG BÁO VỀ HỘP THƯ THÔNG BÁO CỦA ADMIN ─────────────────────
        try {
            const admins = await User.find({ role: 'admin' }).select('_id name');
            const teacherName = survey.teacherName || survey.teacher?.name || 'Giảng viên';
            const courseTitle = survey.courseName || survey.courseCode || 'Môn học';

            const notifTitle = `⭐ Đánh giá mới: ${studentName} (${studentCode}) đánh giá GV ${teacherName}`;
            const notifContent = `Sinh viên: ${studentName} - Mã SV: ${studentCode}\nĐã gửi đánh giá: ${numRating}/5 sao cho giảng viên ${teacherName} - Môn: ${courseTitle}.${feedback ? `\nÝ kiến nhận xét: "${feedback}"` : ''}`;

            if (admins.length > 0) {
                const notifDocs = admins.map(admin => ({
                    recipient: admin._id,
                    sender: studentId || null,
                    type: 'teacher_evaluation',
                    title: notifTitle,
                    content: notifContent,
                    link: '/teacher-evaluations',
                    createdAt: new Date()
                }));
                await Notification.insertMany(notifDocs);
            }

            // Phát WebSocket thời gian thực tới Admin room
            const io = req.app ? req.app.get('io') : null;
            if (io) {
                console.log(`🔔 Emitting evaluation notification to admin room: ${notifTitle}`);
                io.to('admin').emit('new-notification', {
                    title: notifTitle,
                    content: notifContent,
                    type: 'teacher_evaluation',
                    link: '/teacher-evaluations',
                    senderName: studentName,
                    createdAt: new Date()
                });
            }
        } catch (notifErr) {
            console.error('Lỗi khi gửi thông báo tới admin:', notifErr);
        }

        return ApiResponse.success(res, {
            surveyId: survey._id,
            rating: numRating,
            feedback: feedback || ''
        }, 'Đã gửi đánh giá giảng viên thành công! Đánh giá đã được gửi về hộp thư Admin.');
    } catch (err) {
        console.error('submitSurveyResponse error:', err);
        return ApiResponse.error(res, err.message);
    }
};

/**
 * 4. Admin xóa hoặc đóng/mở đợt đánh giá
 */
exports.deleteSurvey = async (req, res) => {
    try {
        const { surveyId } = req.params;
        await Survey.findByIdAndDelete(surveyId);
        return ApiResponse.success(res, null, 'Đã xóa đợt đánh giá thành công');
    } catch (err) {
        return ApiResponse.error(res, err.message);
    }
};

exports.toggleSurveyStatus = async (req, res) => {
    try {
        const { surveyId } = req.params;
        const survey = await Survey.findById(surveyId);
        if (!survey) return ApiResponse.notFound(res, 'Không tìm thấy phiếu đánh giá');

        survey.isOpen = !survey.isOpen;
        await survey.save();
        return ApiResponse.success(res, survey, `Đã ${survey.isOpen ? 'mở lại' : 'đóng'} đợt đánh giá`);
    } catch (err) {
        return ApiResponse.error(res, err.message);
    }
};

/**
 * 5. Báo cáo đánh giá của Giảng viên
 */
exports.getTeacherSurveyReport = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const surveys = await Survey.find({ teacher: teacherId });

        let totalResponses = 0;
        let sumRating = 0;
        const feedbackList = [];

        surveys.forEach(s => {
            (s.responses || []).forEach(r => {
                totalResponses++;
                const rRating = r.rating !== undefined ? r.rating : (r.overallRating || 5);
                sumRating += rRating;
                if (r.feedback) {
                    feedbackList.push({
                        studentCode: r.studentCode || 'Ẩn danh',
                        rating: rRating,
                        feedback: r.feedback,
                        courseName: s.courseName,
                        date: r.submittedAt
                    });
                }
            });
        });

        const avgRating = totalResponses > 0 ? (sumRating / totalResponses).toFixed(1) : 0;

        return ApiResponse.success(res, {
            totalResponses,
            avgRating: Number(avgRating),
            feedbackList
        }, 'Lấy báo cáo đánh giá giảng viên thành công');
    } catch (err) {
        return ApiResponse.error(res, err.message);
    }
};
