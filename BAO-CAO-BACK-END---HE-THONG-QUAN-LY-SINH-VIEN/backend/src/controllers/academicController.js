const ClassSection = require('../models/ClassSection');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const User = require('../models/User');

// 1. Lấy danh sách Thời khóa biểu theo Role (Sinh viên / Giảng viên / Toàn trường)
exports.getTimetable = async (req, res) => {
    try {
        const { semester } = req.query;
        const query = {};
        if (semester) query.semester = semester;

        // Nếu là sinh viên, chỉ lấy lịch học các môn sinh viên đăng ký
        if (req.user && req.user.role === 'student') {
            query.students = req.user.id;
        } else if (req.user && req.user.role === 'teacher') {
            // Nếu là giảng viên, lấy các lớp giảng dạy
            query.teacher = req.user.id;
        }

        const sections = await ClassSection.find(query)
            .populate('course', 'code name credits department')
            .populate('teacher', 'code name email phone')
            .populate('students', 'code name classCode');

        return res.status(200).json({ success: true, count: sections.length, timetable: sections });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 2. Lấy danh sách Lớp học phần
exports.getClassSections = async (req, res) => {
    try {
        const query = {};
        if (req.user && req.user.role === 'teacher') {
            query.teacher = req.user.id;
        }

        const sections = await ClassSection.find(query)
            .populate('course')
            .populate('teacher', 'code name email')
            .populate('students', 'code name classCode');
        return res.status(200).json({ success: true, count: sections.length, data: sections });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3. Giảng viên điểm danh buổi học
exports.recordAttendance = async (req, res) => {
    try {
        const { classSectionId, sessionNumber, date, records } = req.body;

        if (!classSectionId || !sessionNumber || !date || !records) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin điểm danh bắt buộc' });
        }

        let attendance = await Attendance.findOne({ classSection: classSectionId, sessionNumber });
        if (attendance) {
            attendance.date = date;
            attendance.records = records;
            attendance.takenBy = req.user ? req.user.id : null;
            await attendance.save();
        } else {
            attendance = await Attendance.create({
                classSection: classSectionId,
                sessionNumber,
                date,
                records,
                takenBy: req.user ? req.user.id : null
            });
        }

        return res.status(200).json({ 
            success: true, 
            message: `Đã lưu thành công dữ liệu điểm danh buổi ${sessionNumber}`,
            data: attendance 
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 4. Lấy dữ liệu điểm danh và báo cáo chuyên cần theo Lớp học phần
exports.getAttendanceReport = async (req, res) => {
    try {
        const { classSectionId } = req.params;
        const section = await ClassSection.findById(classSectionId)
            .populate('course')
            .populate('students', 'code name classCode email')
            .populate('teacher', 'name email');

        if (!section) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
        }

        const attendances = await Attendance.find({ classSection: classSectionId }).sort({ sessionNumber: 1 });

        const studentStats = section.students.map(student => {
            let presentCount = 0;
            let lateCount = 0;
            let excusedCount = 0;
            let unexcusedCount = 0;

            attendances.forEach(att => {
                const rec = att.records.find(r => r.student.toString() === student._id.toString());
                if (rec) {
                    if (rec.status === 'present') presentCount++;
                    else if (rec.status === 'late') lateCount++;
                    else if (rec.status === 'excused_absent') excusedCount++;
                    else if (rec.status === 'unexcused_absent') unexcusedCount++;
                }
            });

            const totalAbsenceEquivalent = unexcusedCount + (excusedCount * 0.5) + (lateCount * 0.3);
            const absencePercentage = Number(((totalAbsenceEquivalent / (section.totalLessons || 15)) * 100).toFixed(1));
            const isBannedFromExam = absencePercentage > 20;

            return {
                student: {
                    _id: student._id,
                    code: student.code,
                    name: student.name,
                    classCode: student.classCode
                },
                presentCount,
                lateCount,
                excusedCount,
                unexcusedCount,
                totalSessionsDone: attendances.length,
                absencePercentage,
                isBannedFromExam
            };
        });

        return res.status(200).json({
            success: true,
            section: {
                _id: section._id,
                sectionCode: section.sectionCode,
                courseName: section.course?.name,
                courseCode: section.course?.code,
                teacherName: section.teacher?.name,
                totalLessons: section.totalLessons
            },
            sessions: attendances,
            studentStats
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 5. Giảng viên nhập/cập nhật điểm học phần cho sinh viên
exports.updateSectionGrades = async (req, res) => {
    try {
        const { classSectionId, grades } = req.body; // Array: [{ studentId, attendanceScore, midtermScore, finalScore }]
        
        const section = await ClassSection.findById(classSectionId).populate('course');
        if (!section) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
        }

        for (const item of grades) {
            let grade = await Grade.findOne({ student: item.studentId, classSection: classSectionId });
            if (grade) {
                if (item.attendanceScore !== undefined) grade.attendanceScore = Number(item.attendanceScore);
                if (item.midtermScore !== undefined) grade.midtermScore = Number(item.midtermScore);
                if (item.finalScore !== undefined) grade.finalScore = Number(item.finalScore);
                await grade.save();
            } else {
                await Grade.create({
                    student: item.studentId,
                    classSection: classSectionId,
                    course: section.course._id,
                    attendanceScore: Number(item.attendanceScore || 10),
                    midtermScore: Number(item.midtermScore || 0),
                    finalScore: Number(item.finalScore || 0),
                    semester: section.semester
                });
            }
        }

        return res.status(200).json({ success: true, message: 'Đã lưu và cập nhật bảng điểm thành công' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 6. Lấy bảng điểm của cả lớp học phần (cho Giảng viên)
exports.getSectionGrades = async (req, res) => {
    try {
        const { classSectionId } = req.params;
        const section = await ClassSection.findById(classSectionId).populate('course').populate('students', 'code name classCode');
        if (!section) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
        }

        const grades = await Grade.find({ classSection: classSectionId });

        const results = section.students.map(st => {
            const g = grades.find(x => x.student.toString() === st._id.toString());
            return {
                student: st,
                attendanceScore: g ? g.attendanceScore : 10,
                midtermScore: g ? g.midtermScore : 0,
                finalScore: g ? g.finalScore : 0,
                totalScore10: g ? g.totalScore10 : 0,
                letterGrade: g ? g.letterGrade : 'F',
                isPassed: g ? g.isPassed : false
            };
        });

        return res.status(200).json({ success: true, section, grades: results });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};