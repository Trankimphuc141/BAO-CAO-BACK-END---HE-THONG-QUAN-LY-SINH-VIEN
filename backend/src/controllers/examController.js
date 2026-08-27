const ExamSchedule = require('../models/ExamSchedule');
const ClassSection = require('../models/ClassSection');
const Course = require('../models/Course');
const examSchedulerService = require('../services/examSchedulerService');

// 1. Lấy danh sách lịch thi (hỗ trợ lọc theo SV / Giảng viên / Kỳ)
exports.getExamSchedules = async (req, res) => {
    try {
        const { semester, date } = req.query;
        const query = {};
        if (semester) query.semester = semester;
        if (date) query.examDate = date;

        if (req.user && req.user.role === 'student') {
            query.students = req.user.id;
        } else if (req.user && req.user.role === 'teacher') {
            query.proctors = req.user.id;
        }

        const exams = await ExamSchedule.find(query)
            .populate('course')
            .populate('classSection')
            .populate('proctors', 'code name email')
            .populate('students', 'code name classCode')
            .sort({ examDate: 1, startTime: 1 });

        return res.status(200).json({ success: true, count: exams.length, data: exams });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 2. Kiểm tra xung đột trước khi xếp lịch (Anti-Collision Precheck API)
exports.checkCollision = async (req, res) => {
    try {
        const { examDate, startTime, endTime, room, studentIds, proctorIds, excludeExamId } = req.body;
        
        if (!examDate || !startTime || !endTime || !room) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin ngày, giờ hoặc phòng thi' });
        }

        const result = await examSchedulerService.checkExamCollisions({
            examDate,
            startTime,
            endTime,
            room,
            studentIds: studentIds || [],
            proctorIds: proctorIds || [],
            excludeExamId
        });

        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3. Tạo mới lịch thi kèm thuật toán bảo vệ chống xung đột trùng lịch
exports.createExamSchedule = async (req, res) => {
    try {
        const { courseId, classSectionId, examDate, startTime, endTime, room, examType, format, proctorIds, studentIds, maxCapacity } = req.body;

        if (!courseId || !examDate || !startTime || !endTime || !room) {
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin ca thi' });
        }

        // Tự động lấy danh sách sinh viên từ Lớp học phần nếu chưa gửi
        let assignedStudents = studentIds || [];
        if (assignedStudents.length === 0 && classSectionId) {
            const section = await ClassSection.findById(classSectionId);
            if (section) {
                assignedStudents = section.students;
            }
        }

        // Kiểm tra xung đột
        const { hasConflict, conflicts } = await examSchedulerService.checkExamCollisions({
            examDate,
            startTime,
            endTime,
            room,
            studentIds: assignedStudents,
            proctorIds: proctorIds || []
        });

        if (hasConflict) {
            let conflictDetails = [];
            if (conflicts.roomConflict) conflictDetails.push(conflicts.roomConflict.message);
            if (conflicts.studentConflicts.length > 0) {
                conflictDetails.push(`Có ${conflicts.studentConflicts.length} môn bị trùng lịch với sinh viên dự thi`);
            }
            if (conflicts.proctorConflicts.length > 0) {
                conflictDetails.push(`Giám thị bị trùng lịch coi thi môn khác cùng khung giờ`);
            }

            return res.status(409).json({
                success: false,
                message: 'Phát hiện xung đột lịch thi hoặc phòng thi!',
                conflicts,
                details: conflictDetails
            });
        }

        const newExam = await ExamSchedule.create({
            course: courseId,
            classSection: classSectionId,
            examDate,
            startTime,
            endTime,
            room,
            examType: examType || 'Cuối kỳ',
            format: format || 'Tự luận',
            proctors: proctorIds || [],
            students: assignedStudents,
            maxCapacity: maxCapacity || 40
        });

        return res.status(201).json({
            success: true,
            message: 'Đã xếp lịch và phân phòng thi thành công, không phát hiện xung đột',
            data: newExam
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 4. Xóa lịch thi
exports.deleteExamSchedule = async (req, res) => {
    try {
        await ExamSchedule.findByIdAndDelete(req.params.id);
        return res.status(200).json({ success: true, message: 'Đã xóa lịch thi' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
