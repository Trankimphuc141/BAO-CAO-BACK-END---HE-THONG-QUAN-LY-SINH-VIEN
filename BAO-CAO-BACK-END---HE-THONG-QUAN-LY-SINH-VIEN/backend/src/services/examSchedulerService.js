const ExamSchedule = require('../models/ExamSchedule');

/**
 * Kiểm tra xem 2 khung giờ thi có bị giao nhau (overlap) không
 */
function isTimeOverlapping(startA, endA, startB, endB) {
    const toMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };
    const sA = toMinutes(startA);
    const eA = toMinutes(endA);
    const sB = toMinutes(startB);
    const eB = toMinutes(endB);

    return Math.max(sA, sB) < Math.min(eA, eB);
}

/**
 * Thuật toán phát hiện xung đột khi xếp lịch và phòng thi
 */
exports.checkExamCollisions = async ({ examDate, startTime, endTime, room, studentIds, proctorIds, excludeExamId = null }) => {
    const conflicts = {
        roomConflict: null,
        studentConflicts: [],
        proctorConflicts: []
    };

    // Tìm tất cả các ca thi diễn ra trong cùng ngày
    const query = { examDate, status: { $ne: 'Đã hủy' } };
    if (excludeExamId) {
        query._id = { $ne: excludeExamId };
    }

    const existingExams = await ExamSchedule.find(query)
        .populate('course', 'name code')
        .populate('students', 'code name')
        .populate('proctors', 'code name');

    for (const exam of existingExams) {
        // Kiểm tra xem ca thi có bị chồng chéo thời gian không
        if (isTimeOverlapping(startTime, endTime, exam.startTime, exam.endTime)) {
            // 1. Kiểm tra trùng phòng thi
            if (exam.room.trim().toLowerCase() === room.trim().toLowerCase()) {
                conflicts.roomConflict = {
                    message: `Phòng ${room} đã có môn ${exam.course?.name} (${exam.course?.code}) thi trong khung giờ ${exam.startTime} - ${exam.endTime}`,
                    examId: exam._id,
                    courseName: exam.course?.name
                };
            }

            // 2. Kiểm tra trùng lịch của từng sinh viên
            if (studentIds && studentIds.length > 0) {
                const existingStudentIdStrings = (exam.students || []).map(s => s._id.toString());
                const overlappingStudents = exam.students.filter(s => 
                    studentIds.map(id => id.toString()).includes(s._id.toString())
                );

                if (overlappingStudents.length > 0) {
                    conflicts.studentConflicts.push({
                        examId: exam._id,
                        courseName: exam.course?.name,
                        timeRange: `${exam.startTime} - ${exam.endTime}`,
                        students: overlappingStudents.map(s => ({ id: s._id, code: s.code, name: s.name }))
                    });
                }
            }

            // 3. Kiểm tra trùng lịch của giám thị
            if (proctorIds && proctorIds.length > 0) {
                const overlappingProctors = exam.proctors.filter(p => 
                    proctorIds.map(id => id.toString()).includes(p._id.toString())
                );

                if (overlappingProctors.length > 0) {
                    conflicts.proctorConflicts.push({
                        examId: exam._id,
                        courseName: exam.course?.name,
                        timeRange: `${exam.startTime} - ${exam.endTime}`,
                        proctors: overlappingProctors.map(p => ({ id: p._id, code: p.code, name: p.name }))
                    });
                }
            }
        }
    }

    const hasConflict = !!conflicts.roomConflict || conflicts.studentConflicts.length > 0 || conflicts.proctorConflicts.length > 0;
    return { hasConflict, conflicts };
};
