const User = require('../models/User');
const Course = require('../models/Course');
const ClassSection = require('../models/ClassSection');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');
const Thesis = require('../models/Thesis');
const Internship = require('../models/Internship');
const ExamSchedule = require('../models/ExamSchedule');

// Tổng hợp số liệu thống kê Dashboard
exports.getDashboardStatistics = async (req, res) => {
    try {
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalTeachers = await User.countDocuments({ role: 'teacher' });
        const totalCourses = await Course.countDocuments();
        const totalSections = await ClassSection.countDocuments();
        const totalExams = await ExamSchedule.countDocuments();
        const totalTheses = await Thesis.countDocuments();
        const totalInternships = await Internship.countDocuments();

        // 1. Phân loại học lực
        const grades = await Grade.find();
        let excellent = 0, good = 0, fair = 0, average = 0, weak = 0;

        grades.forEach(g => {
            if (g.totalScore10 >= 8.5) excellent++;
            else if (g.totalScore10 >= 7.0) good++;
            else if (g.totalScore10 >= 5.5) fair++;
            else if (g.totalScore10 >= 4.0) average++;
            else weak++;
        });

        // 2. Thống kê sinh viên theo khoa
        const departmentStats = await User.aggregate([
            { $match: { role: 'student' } },
            { $group: { _id: '$department', count: { $sum: 1 } } }
        ]);

        // 3. Thống kê tỷ lệ chuyên cần
        const attendances = await Attendance.find();
        let totalPresent = 0;
        let totalAbsent = 0;
        let totalLate = 0;

        attendances.forEach(att => {
            (att.records || []).forEach(r => {
                if (r.status === 'present') totalPresent++;
                else if (r.status === 'late') totalLate++;
                else totalAbsent++;
            });
        });

        const totalRecords = totalPresent + totalAbsent + totalLate || 1;
        const attendanceRate = Number(((totalPresent / totalRecords) * 100).toFixed(1));

        // 4. Thống kê tỷ lệ có việc làm sau thực tập
        const employedCount = await Internship.countDocuments({ isEmployedAfterInternship: true });
        const employmentRate = totalInternships > 0 ? Number(((employedCount / totalInternships) * 100).toFixed(1)) : 0;

        return res.status(200).json({
            success: true,
            overview: {
                totalStudents,
                totalTeachers,
                totalCourses,
                totalSections,
                totalExams,
                totalTheses,
                totalInternships,
                attendanceRate,
                employmentRate
            },
            academicPerformance: {
                excellent,
                good,
                fair,
                average,
                weak
            },
            departmentBreakdown: departmentStats,
            internshipStats: {
                total: totalInternships,
                employed: employedCount,
                rate: employmentRate
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
