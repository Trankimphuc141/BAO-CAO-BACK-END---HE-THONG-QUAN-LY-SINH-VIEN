const ClassSection = require('../models/ClassSection');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');

// 1. Lấy danh sách Thời khóa biểu theo Role (Sinh viên / Giảng viên / Toàn trường)
exports.getTimetable = async (req, res) => {
    try {
        const { semester } = req.query;
        const query = {};
        if (semester) query.semester = semester;

        if (req.user && req.user.role === 'student') {
            const studentId = req.user.id;
            const myEnrollments = await Enrollment.find({ student: studentId, status: 'registered' }).select('classSection');
            const enrolledSecIds = myEnrollments.map(e => e.classSection);
            query.$or = [
                { students: studentId },
                { _id: { $in: enrolledSecIds } }
            ];
        } else if (req.user && req.user.role === 'teacher') {
            // Nếu là giảng viên, lấy các lớp giảng dạy
            query.teacher = req.user.id;
        }

        const sections = await ClassSection.find(query)
            .populate('course', 'code name credits department')
            .populate('teacher', 'code name email phone')
            .populate('students', 'code name classCode avatar email phone');

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
        } else if (req.user && req.user.role === 'student') {
            const studentId = req.user.id;
            const myEnrollments = await Enrollment.find({ student: studentId, status: 'registered' }).select('classSection');
            const enrolledSecIds = myEnrollments.map(e => e.classSection);
            query.$or = [
                { students: studentId },
                { _id: { $in: enrolledSecIds } }
            ];
        }

        const sections = await ClassSection.find(query)
            .populate('course')
            .populate('teacher', 'code name email department')
            .populate('students', 'code name classCode avatar email phone');

        // Đảm bảo toàn bộ sinh viên đã đăng ký học phần (từ Enrollment & Grade) đều được hiển thị
        for (const sec of sections) {
            const studentIdMap = new Map();
            (sec.students || []).forEach(s => {
                if (s && (s._id || s)) studentIdMap.set((s._id || s).toString(), s);
            });

            const [enrollments, grades] = await Promise.all([
                Enrollment.find({ classSection: sec._id, status: 'registered' }).populate('student', 'code name classCode avatar email phone'),
                Grade.find({ classSection: sec._id }).populate('student', 'code name classCode avatar email phone')
            ]);

            let needSave = false;
            enrollments.forEach(e => {
                if (e.student && (e.student._id || e.student)) {
                    const id = (e.student._id || e.student).toString();
                    if (!studentIdMap.has(id)) {
                        studentIdMap.set(id, e.student);
                        needSave = true;
                    }
                }
            });

            grades.forEach(g => {
                if (g.student && (g.student._id || g.student)) {
                    const id = (g.student._id || g.student).toString();
                    if (!studentIdMap.has(id)) {
                        studentIdMap.set(id, g.student);
                        needSave = true;
                    }
                }
            });

            const fullStudents = Array.from(studentIdMap.values());
            sec.students = fullStudents;

            if (needSave) {
                await ClassSection.findByIdAndUpdate(sec._id, {
                    students: fullStudents.map(s => s._id || s)
                });
            }
        }

        return res.status(200).json({ success: true, count: sections.length, data: sections });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// ─── ĐỒNG BỘ HỆ THỐNG CHUYÊN CẦN 15 BUỔI SANG BẢNG ĐIỂM (GRADES) ───
// Quy tắc đào tạo:
// 1. Tối đa 15 buổi học hằng ngày
// 2. Vắng 1 buổi (có phép hay không phép như nhau) bị trừ 6.67% (tương đương -0.67 điểm CC)
// 3. Đi muộn trừ 3.33% (tương đương 5 điểm cho buổi đó)
// 4. Có mặt đủ = 10 điểm (100%)
// 5. Khi sinh viên vắng >= 5 buổi (tức vắng > 30% tổng số buổi) -> CẤM THI CUỐI KỲ (xếp loại F)
const syncAttendanceToGradesInternal = async (classSectionId, io) => {
    try {
        const section = await ClassSection.findById(classSectionId).populate('course').populate('students');
        if (!section) return { success: false, message: 'Không tìm thấy lớp học phần' };

        const [attendances, enrollments, existingGrades] = await Promise.all([
            Attendance.find({ classSection: classSectionId }).sort({ sessionNumber: 1 }),
            Enrollment.find({ classSection: classSectionId, status: 'registered' }).populate('student'),
            Grade.find({ classSection: classSectionId })
        ]);
        const updatedGrades = [];

        // Thu thập toàn bộ sinh viên từ danh sách lớp, đăng ký học phần, phiếu điểm danh và bảng điểm
        const studentIdMap = new Map();
        (section.students || []).forEach(s => {
            const id = (s._id || s).toString();
            studentIdMap.set(id, s);
        });
        enrollments.forEach(e => {
            if (e.student) {
                const id = (e.student._id || e.student).toString();
                if (!studentIdMap.has(id)) {
                    studentIdMap.set(id, e.student);
                }
            }
        });
        attendances.forEach(att => {
            (att.records || []).forEach(r => {
                if (r.student) {
                    const id = (r.student._id || r.student).toString();
                    if (!studentIdMap.has(id)) {
                        studentIdMap.set(id, r.student);
                    }
                }
            });
        });
        existingGrades.forEach(eg => {
            if (eg.student) {
                const id = (eg.student._id || eg.student).toString();
                if (!studentIdMap.has(id)) {
                    studentIdMap.set(id, eg.student);
                }
            }
        });

        // Cập nhật lại danh sách students trong section nếu có sinh viên mới từ đăng ký / điểm danh
        if (studentIdMap.size > (section.students || []).length) {
            section.students = Array.from(studentIdMap.keys());
            await section.save();
        }

        for (const [studentIdStr] of studentIdMap) {
            const sessionScores = Array(15).fill(10);
            let absentCount = 0;
            let lateCount = 0;
            let attendedCount = 0;

            for (let s = 1; s <= 15; s++) {
                const att = attendances.find(a => Number(a.sessionNumber) === s);
                if (att) {
                    const rec = (att.records || []).find(r => 
                        (r.student?._id || r.student)?.toString() === studentIdStr
                    );
                    if (rec) {
                        if (rec.status === 'present') {
                            sessionScores[s - 1] = 10;
                            attendedCount++;
                        } else if (rec.status === 'late') {
                            sessionScores[s - 1] = 5;
                            lateCount++;
                        } else if (rec.status === 'excused_absent' || rec.status === 'unexcused_absent') {
                            sessionScores[s - 1] = 0;
                            absentCount++;
                        }
                    } else {
                        // Buổi học đã điểm danh nhưng sinh viên không có tên -> tính vắng
                        sessionScores[s - 1] = 0;
                        absentCount++;
                    }
                } else {
                    // Buổi học chưa diễn ra -> tính mặc định 10 điểm
                    sessionScores[s - 1] = 10;
                }
            }

            // Quy đổi số buổi vắng: Vắng = 1, Muộn = 0.5
            const totalAbsenceEquivalent = absentCount + (lateCount * 0.5);
            const absencePercentage = Number((totalAbsenceEquivalent * 6.67).toFixed(1));
            // Cấm thi nếu vắng từ 5 buổi trở lên (tức > 30% trong 15 buổi)
            const isBannedFromExam = absentCount >= 5 || absencePercentage > 30;

            // Tính điểm chuyên cần trung bình của 15 buổi (hệ 10, làm tròn 1 chữ số thập phân)
            const calculatedAttendance = Math.max(0, Math.min(10, Number((sessionScores.reduce((sum, val) => sum + val, 0) / 15).toFixed(1))));

            let grade = await Grade.findOne({ student: studentIdStr, classSection: classSectionId });
            if (grade) {
                grade.sessionScores = sessionScores;
                grade.attendanceScore = calculatedAttendance;
                grade.isBannedFromExam = isBannedFromExam;
                // Pre-save hook tự động tính lại totalScore10, totalScore4, letterGrade, isPassed
                await grade.save();
            } else {
                grade = await Grade.create({
                    student: studentIdStr,
                    classSection: classSectionId,
                    course: section.course?._id || section.course,
                    semester: section.semester || 'HK1-2026-2027',
                    sessionScores,
                    attendanceScore: calculatedAttendance,
                    midtermScore: 0,
                    finalScore: 0,
                    isBannedFromExam
                });
            }
            updatedGrades.push(grade);
        }

        if (io) {
            io.emit('attendance-updated', { classSectionId });
            io.emit('grade-updated', { classSectionId });
            io.emit('attendance-synced', { classSectionId, count: updatedGrades.length });
        }

        return { success: true, count: updatedGrades.length, grades: updatedGrades };
    } catch (err) {
        console.error('Lỗi khi đồng bộ điểm chuyên cần:', err);
        return { success: false, error: err.message };
    }
};

exports.syncAttendanceToGradesInternal = syncAttendanceToGradesInternal;

// 3. Giảng viên điểm danh buổi học
exports.recordAttendance = async (req, res) => {
    try {
        const { classSectionId, sessionNumber, date, records } = req.body;
        const sNum = Number(sessionNumber);

        if (!classSectionId || !sNum || !date || !records) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin điểm danh bắt buộc' });
        }

        let attendance = await Attendance.findOne({ classSection: classSectionId, sessionNumber: sNum });

        // Nếu buổi đã chốt và người dùng không phải admin → từ chối
        if (attendance && attendance.isFinalized && req.user?.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Buổi điểm danh này đã được chốt. Không thể sửa đổi.'
            });
        }

        if (attendance) {
            attendance.date = date;
            attendance.records = records;
            attendance.takenBy = req.user ? req.user.id : null;
            await attendance.save();
        } else {
            attendance = await Attendance.create({
                classSection: classSectionId,
                sessionNumber: sNum,
                date,
                records,
                takenBy: req.user ? req.user.id : null
            });
        }

        const io = req.app && typeof req.app.get === 'function' ? req.app.get('io') : null;
        if (io) {
            io.emit('attendance-updated', { classSectionId, sessionNumber: sNum });
        }

        // Tự động đồng bộ toàn bộ chuyên cần 15 buổi sang bảng điểm Grade
        await syncAttendanceToGradesInternal(classSectionId, io);

        return res.status(200).json({ 
            success: true, 
            message: `Đã lưu thành công dữ liệu điểm danh buổi ${sNum} và đồng bộ bảng điểm`,
            data: attendance 
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3b. Chốt điểm danh một buổi (Giảng viên hoặc Admin)
exports.finalizeAttendance = async (req, res) => {
    try {
        const { classSectionId, sessionNumber } = req.body;
        const sNum = Number(sessionNumber);
        let attendance = await Attendance.findOne({ classSection: classSectionId, sessionNumber: sNum });
        if (!attendance) {
            // Tự động khởi tạo buổi điểm danh nếu chưa từng lưu
            const section = await ClassSection.findById(classSectionId).populate('students', '_id');
            if (!section) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
            }
            const defaultRecords = (section.students || []).map(s => ({
                student: s._id,
                status: 'present',
                note: ''
            }));
            attendance = new Attendance({
                classSection: classSectionId,
                sessionNumber: sNum,
                date: new Date().toISOString().split('T')[0],
                records: defaultRecords,
                takenBy: req.user?.id || null
            });
        }
        if (attendance.isFinalized) {
            return res.status(400).json({ success: false, message: 'Buổi điểm danh này đã được chốt trước đó' });
        }
        attendance.isFinalized = true;
        attendance.finalizedAt = new Date();
        attendance.finalizedBy = req.user?.id || null;
        await attendance.save();

        const io = req.app && typeof req.app.get === 'function' ? req.app.get('io') : null;
        if (io) {
            io.emit('attendance-updated', { classSectionId, sessionNumber: sNum, isFinalized: true });
        }

        // Tự động đồng bộ toàn bộ chuyên cần 15 buổi sang bảng điểm Grade
        await syncAttendanceToGradesInternal(classSectionId, io);

        return res.status(200).json({
            success: true,
            message: `Đã chốt điểm danh buổi ${sNum} thành công và đồng bộ bảng điểm. Không thể sửa đổi sau khi chốt.`,
            data: attendance
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3c. Bỏ chốt điểm danh (Admin only)
exports.unfinalizeAttendance = async (req, res) => {
    try {
        const { classSectionId, sessionNumber } = req.body;
        const sNum = Number(sessionNumber);
        const attendance = await Attendance.findOne({ classSection: classSectionId, sessionNumber: sNum });
        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy buổi điểm danh' });
        }
        attendance.isFinalized = false;
        attendance.finalizedAt = null;
        attendance.finalizedBy = null;
        await attendance.save();

        const io = req.app && typeof req.app.get === 'function' ? req.app.get('io') : null;
        if (io) {
            io.emit('attendance-updated', { classSectionId, sessionNumber: sNum, isFinalized: false });
        }

        // Tự động đồng bộ toàn bộ chuyên cần 15 buổi sang bảng điểm Grade
        await syncAttendanceToGradesInternal(classSectionId, io);

        return res.status(200).json({
            success: true,
            message: `Đã bỏ chốt điểm danh buổi ${sNum} và đồng bộ bảng điểm. Có thể chỉnh sửa lại.`,
            data: attendance
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3d. Admin sửa điểm danh kể cả khi đã chốt
exports.adminEditAttendance = async (req, res) => {
    try {
        const { classSectionId, sessionNumber, date, records } = req.body;
        const sNum = Number(sessionNumber);
        let attendance = await Attendance.findOne({ classSection: classSectionId, sessionNumber: sNum });
        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy buổi điểm danh' });
        }
        if (date) attendance.date = date;
        if (records) attendance.records = records;
        attendance.takenBy = req.user?.id || null;
        await attendance.save();

        const io = req.app && typeof req.app.get === 'function' ? req.app.get('io') : null;
        if (io) {
            io.emit('attendance-updated', { classSectionId, sessionNumber: sNum });
        }

        // Tự động đồng bộ toàn bộ chuyên cần 15 buổi sang bảng điểm Grade
        await syncAttendanceToGradesInternal(classSectionId, io);

        return res.status(200).json({
            success: true,
            message: `Admin đã cập nhật điểm danh buổi ${sNum} và đồng bộ bảng điểm thành công`,
            data: attendance
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3e. Lấy lịch sử điểm danh các buổi đã chốt của một lớp (dùng cho mọi role)
exports.getAttendanceHistory = async (req, res) => {
    try {
        const { classSectionId } = req.params;
        const role = req.user?.role;
        const userId = (req.user?.id || req.user?._id)?.toString();

        const section = await ClassSection.findById(classSectionId)
            .populate('course', 'code name')
            .populate('teacher', 'name code')
            .populate('students', 'code name classCode avatar email phone');

        if (!section) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
        }

        // Tự động đồng bộ và gom đủ sinh viên từ ClassSection.students, Enrollment, Grade và Attendance records
        const studentMap = new Map();
        (section.students || []).forEach(s => {
            if (s && (s._id || s)) studentMap.set((s._id || s).toString(), s);
        });

        const [enrollments, grades, attendances] = await Promise.all([
            Enrollment.find({ classSection: classSectionId, status: 'registered' }).populate('student', 'code name classCode avatar email phone'),
            Grade.find({ classSection: classSectionId }).populate('student', 'code name classCode avatar email phone'),
            Attendance.find({ classSection: classSectionId })
                .populate('takenBy', 'name code')
                .populate('finalizedBy', 'name code')
                .populate('records.student', 'name code avatar classCode email phone')
                .sort({ sessionNumber: 1 })
        ]);

        let needsDbSync = false;
        enrollments.forEach(e => {
            if (e.student && (e.student._id || e.student)) {
                const id = (e.student._id || e.student).toString();
                if (!studentMap.has(id)) {
                    studentMap.set(id, e.student);
                    needsDbSync = true;
                }
            }
        });

        grades.forEach(g => {
            if (g.student && (g.student._id || g.student)) {
                const id = (g.student._id || g.student).toString();
                if (!studentMap.has(id)) {
                    studentMap.set(id, g.student);
                    needsDbSync = true;
                }
            }
        });

        attendances.forEach(att => {
            (att.records || []).forEach(r => {
                if (r.student && (r.student._id || r.student)) {
                    const id = (r.student._id || r.student).toString();
                    if (!studentMap.has(id)) {
                        studentMap.set(id, r.student);
                        needsDbSync = true;
                    }
                }
            });
        });

        const allStudents = Array.from(studentMap.values());
        if (needsDbSync || allStudents.length > (section.students || []).length) {
            section.students = allStudents.map(s => s._id || s);
            await ClassSection.findByIdAndUpdate(classSectionId, { students: section.students });
        }

        // Sinh viên: chỉ được xem nếu thuộc lớp
        if (role === 'student' && userId) {
            const isMember = studentMap.has(userId);
            if (!isMember) {
                return res.status(403).json({ success: false, message: 'Bạn không thuộc lớp học phần này' });
            }
        }
        // Giảng viên: chỉ xem lớp mình dạy
        if (role === 'teacher' && userId) {
            const teacherId = (section.teacher?._id || section.teacher)?.toString();
            if (teacherId && teacherId !== userId) {
                return res.status(403).json({ success: false, message: 'Bạn không phụ trách lớp học phần này' });
            }
        }

        return res.status(200).json({
            success: true,
            section: {
                _id: section._id,
                sectionCode: section.sectionCode,
                courseName: section.course?.name,
                courseCode: section.course?.code,
                teacherName: section.teacher?.name,
                totalLessons: section.totalLessons,
                students: allStudents
            },
            sessions: attendances,
            totalSessions: attendances.length,
            finalizedCount: attendances.filter(a => a.isFinalized).length
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
            .populate('students', 'code name classCode email avatar')
            .populate('teacher', 'name email');

        if (!section) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
        }

        // Đảm bảo đầy đủ sinh viên từ cả Enrollment và Grade
        const studentMap = new Map();
        (section.students || []).forEach(s => {
            if (s && (s._id || s)) studentMap.set((s._id || s).toString(), s);
        });

        const enrollments = await Enrollment.find({ classSection: classSectionId, status: 'registered' })
            .populate('student', 'code name classCode email avatar');
        enrollments.forEach(e => {
            if (e.student && (e.student._id || e.student)) {
                const id = (e.student._id || e.student).toString();
                if (!studentMap.has(id)) studentMap.set(id, e.student);
            }
        });

        const allStudents = Array.from(studentMap.values());
        const attendances = await Attendance.find({ classSection: classSectionId }).sort({ sessionNumber: 1 });

        const studentStats = allStudents.map(student => {
            let presentCount = 0;
            let lateCount = 0;
            let excusedCount = 0;
            let unexcusedCount = 0;

            attendances.forEach(att => {
                const rec = att.records.find(r => {
                    const rId = (r.student?._id || r.student)?.toString();
                    return rId === (student._id || student).toString();
                });
                if (rec) {
                    if (rec.status === 'present') presentCount++;
                    else if (rec.status === 'late') lateCount++;
                    else if (rec.status === 'excused_absent') excusedCount++;
                    else if (rec.status === 'unexcused_absent') unexcusedCount++;
                }
            });

            // Vắng có phép và không phép đều tính mất 6,67% chuyên cần như nhau (100% / 15 buổi ≈ 6.67%)
            const totalAbsenceEquivalent = unexcusedCount + excusedCount + (lateCount * 0.3);
            const absencePercentage = Number((totalAbsenceEquivalent * 6.67).toFixed(1));
            const attendanceRate = Math.max(0, Number((100 - absencePercentage).toFixed(1)));
            // Khi vượt qua 30% tổng số buổi sẽ không đủ điều kiện để thi (Cấm thi)
            const isBannedFromExam = absencePercentage > 30;

            return {
                student: {
                    _id: student._id || student,
                    code: student.code,
                    name: student.name,
                    classCode: student.classCode,
                    avatar: student.avatar
                },
                presentCount,
                lateCount,
                excusedCount,
                unexcusedCount,
                totalSessionsDone: attendances.length,
                totalAbsenceEquivalent,
                absencePercentage,
                attendanceRate,
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

// 7. Sinh viên quét mã QR tự điểm danh
exports.qrCheckIn = async (req, res) => {
    try {
        let { qrToken } = req.body;
        if (!qrToken) {
            return res.status(400).json({ success: false, message: 'Thiếu mã QR token' });
        }

        let searchToken = qrToken.toString().trim();
        if (searchToken.startsWith('{')) {
            try {
                const parsed = JSON.parse(searchToken);
                if (parsed.token) {
                    searchToken = parsed.token;
                }
            } catch (e) {
                console.error('Error parsing JSON QR token:', e);
            }
        }

        // Tìm buổi điểm danh có qrToken khớp
        const attendance = await Attendance.findOne({ qrToken: searchToken });
        if (!attendance) {
            return res.status(400).json({ success: false, message: 'Mã QR không hợp lệ hoặc không tồn tại' });
        }

        // Kiểm tra thời hạn
        if (attendance.qrExpiresAt && new Date() > new Date(attendance.qrExpiresAt)) {
            return res.status(400).json({ success: false, message: 'Mã QR đã hết hiệu lực điểm danh' });
        }

        // Kiểm tra xem sinh viên có trong lớp học phần này không (Safely compare ObjectId strings)
        const section = await ClassSection.findById(attendance.classSection);
        if (!section) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
        }

        const isStudentEnrolled = section.students.some(s => (s._id ? s._id.toString() : s.toString()) === req.user.id.toString()) ||
            await Enrollment.exists({ student: req.user.id, classSection: section._id, status: 'registered' });

        if (!isStudentEnrolled) {
            return res.status(403).json({ success: false, message: 'Bạn không thuộc danh sách lớp học phần này' });
        }

        // Tự động thêm sinh viên vào section.students nếu chưa có
        if (!section.students.some(s => (s._id ? s._id.toString() : s.toString()) === req.user.id.toString())) {
            section.students.push(req.user.id);
            await section.save();
        }

        // Cập nhật trạng thái điểm danh của sinh viên trong records
        let recordIndex = attendance.records.findIndex(r => r.student.toString() === req.user.id.toString());
        
        const now = new Date();
        if (recordIndex !== -1) {
            attendance.records[recordIndex].status = 'present';
            attendance.records[recordIndex].note = 'Điểm danh tự động qua QR code';
        } else {
            attendance.records.push({
                student: req.user.id,
                status: 'present',
                note: 'Điểm danh tự động qua QR code'
            });
        }

        await attendance.save();

        // Gửi socket event tới giảng viên/lớp để update real-time
        const io = req.app.get('io');
        if (io) {
            io.emit(`qr-checkin-${attendance._id}`, {
                studentId: req.user.id,
                studentCode: req.user.code,
                studentName: req.user.name,
                checkedInAt: now
            });
        }

        // Tự động đồng bộ điểm chuyên cần sang bảng điểm Grade
        await syncAttendanceToGradesInternal(attendance.classSection, io);

        return res.status(200).json({
            success: true,
            message: `Điểm danh thành công buổi học số ${attendance.sessionNumber}!`,
            data: attendance
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 8. API Endpoint cho Giảng viên / Admin bấm nút "Đồng bộ điểm chuyên cần"
exports.syncAttendanceToGrades = async (req, res) => {
    try {
        const { classSectionId } = req.body;
        if (!classSectionId) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã lớp học phần (classSectionId)' });
        }
        const io = req.app.get('io');
        const result = await syncAttendanceToGradesInternal(classSectionId, io);
        if (!result.success) {
            return res.status(500).json(result);
        }
        return res.status(200).json({
            success: true,
            message: `Đã đồng bộ thành công chuyên cần của ${result.count} sinh viên sang bảng điểm!`,
            data: result
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 9. API Endpoint Đồng bộ toàn bộ các lớp trong hệ thống
exports.syncAllAttendanceToGrades = async (req, res) => {
    try {
        const sections = await ClassSection.find({});
        const io = req.app.get('io');
        let totalCount = 0;
        for (const sec of sections) {
            const r = await syncAttendanceToGradesInternal(sec._id, io);
            if (r.success) totalCount += r.count;
        }
        return res.status(200).json({
            success: true,
            message: `Đã đồng bộ toàn bộ hệ thống chuyên cần cho ${sections.length} lớp học phần (${totalCount} lượt sinh viên)!`
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};