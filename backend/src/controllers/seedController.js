const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Course = require('../models/Course');
const ClassSection = require('../models/ClassSection');
const Grade = require('../models/Grade');
const Attendance = require('../models/Attendance');

/**
 * POST /api/seed/run
 * Tạo dữ liệu mẫu đầy đủ (chỉ dùng để phát triển / demo)
 */
exports.runSeed = async (req, res) => {
    try {
        const results = { created: {}, skipped: {} };

        // ── 1. Tạo giảng viên mẫu ──────────────────────────────────────────
        const teacherData = [
            { name: 'Nguyễn Văn An', email: 'gv001@school.edu.vn', code: 'GV001', role: 'teacher' },
            { name: 'Trần Thị Bình', email: 'gv002@school.edu.vn', code: 'GV002', role: 'teacher' },
        ];
        const teachers = [];
        for (const td of teacherData) {
            let t = await User.findOne({ code: td.code });
            if (!t) {
                const hashed = await bcrypt.hash('123456', 10);
                t = await User.create({ ...td, password: hashed, status: 'Đang công tác' });
                results.created[td.email] = 'teacher';
            } else {
                results.skipped[td.email] = 'already exists';
            }
            teachers.push(t);
        }

        // ── 2. Tạo sinh viên mẫu ───────────────────────────────────────────
        const studentNames = [
            'Lê Văn Cường', 'Phạm Thị Dung', 'Hoàng Văn Em', 'Đỗ Thị Phượng',
            'Ngô Văn Giang', 'Vũ Thị Hoa', 'Đinh Văn Inh', 'Bùi Thị Kim',
            'Lý Văn Long', 'Trương Thị Mai', 'Phan Văn Nam', 'Hồ Thị Oanh',
            'Dương Văn Phúc', 'Cao Thị Quỳnh', 'Tô Văn Sơn', 'Đặng Thị Tâm',
            'Chu Văn Uy', 'Trịnh Thị Vân', 'Lưu Văn Xuân', 'Nguyễn Thị Yến',
        ];
        const students = [];
        for (let i = 0; i < studentNames.length; i++) {
            const sv = i + 1;
            const email = `sv${String(sv).padStart(3, '0')}@student.edu.vn`;
            const mssv = `SV${String(sv).padStart(3, '0')}`;
            let s = await User.findOne({ code: mssv });
            if (!s) {
                const hashed = await bcrypt.hash('123456', 10);
                s = await User.create({
                    name: studentNames[i], email, password: hashed,
                    role: 'student', code: mssv,
                    dateOfBirth: `${2003}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
                    major: i < 10 ? 'Công nghệ thông tin' : 'Khoa học máy tính',
                    classCode: i < 10 ? 'CNTT-K21A' : 'KHMT-K21B',
                    status: 'Đang học'
                });
                results.created[email] = 'student';
            } else {
                results.skipped[email] = 'already exists';
            }
            students.push(s);
        }

        // ── 3. Tạo môn học ─────────────────────────────────────────────────
        const coursesData = [
            { code: 'IT101', name: 'Lập trình căn bản', credits: 3, department: 'Công nghệ thông tin', tuitionFeePerCredit: 450000 },
            { code: 'IT201', name: 'Cấu trúc dữ liệu & Giải thuật', credits: 4, department: 'Công nghệ thông tin', tuitionFeePerCredit: 450000 },
            { code: 'IT301', name: 'Lập trình Web', credits: 3, department: 'Công nghệ thông tin', tuitionFeePerCredit: 450000 },
            { code: 'IT401', name: 'Cơ sở dữ liệu', credits: 3, department: 'Công nghệ thông tin', tuitionFeePerCredit: 450000 },
            { code: 'MATH101', name: 'Giải tích', credits: 4, department: 'Toán học', tuitionFeePerCredit: 380000 },
            { code: 'MATH201', name: 'Đại số tuyến tính', credits: 3, department: 'Toán học', tuitionFeePerCredit: 380000 },
            { code: 'IT501', name: 'Trí tuệ nhân tạo', credits: 3, department: 'Công nghệ thông tin', tuitionFeePerCredit: 500000 },
            { code: 'IT601', name: 'An toàn thông tin', credits: 3, department: 'Công nghệ thông tin', tuitionFeePerCredit: 500000 },
        ];
        const courses = [];
        for (const cd of coursesData) {
            let c = await Course.findOne({ code: cd.code });
            if (!c) {
                c = await Course.create(cd);
                results.created[cd.code] = 'course';
            } else {
                results.skipped[cd.code] = 'already exists';
            }
            courses.push(c);
        }

        // ── 4. Tạo lớp học phần ────────────────────────────────────────────
        const semesters = ['HK1-2024-2025', 'HK2-2024-2025', 'HK1-2025-2026'];
        const rooms = ['A101', 'A201', 'B101', 'B202', 'C305'];
        const shifts = ['Ca 1 (07:00 - 09:30)', 'Ca 2 (09:30 - 12:00)', 'Ca 3 (13:00 - 15:30)', 'Ca 4 (15:30 - 18:00)'];
        const days = [2, 3, 4, 5, 6]; // Thứ 2 → Thứ 6

        const sections = [];
        let secIdx = 0;
        for (let ci = 0; ci < courses.length; ci++) {
            const course = courses[ci];
            for (let si = 0; si < 2; si++) { // 2 lớp mỗi môn
                const semester = semesters[secIdx % semesters.length];
                const sectionCode = `LHP_${course.code}_${String(si + 1).padStart(2, '0')}_${semester}`;
                let sec = await ClassSection.findOne({ sectionCode });
                if (!sec) {
                    // Chọn sinh viên ngẫu nhiên cho lớp (10-15 SV)
                    const shuffle = [...students].sort(() => Math.random() - 0.5);
                    const classStudents = shuffle.slice(0, 10 + Math.floor(Math.random() * 6));
                    sec = await ClassSection.create({
                        sectionCode,
                        course: course._id,
                        teacher: teachers[secIdx % teachers.length]._id,
                        semester,
                        academicYear: semester.split('-').slice(1).join('-'),
                        students: classStudents.map(s => s._id),
                        maxStudents: 50,
                        room: rooms[secIdx % rooms.length],
                        dayOfWeek: days[secIdx % days.length],
                        shift: shifts[secIdx % shifts.length],
                        startPeriod: (secIdx % 4) + 1,
                        endPeriod: (secIdx % 4) + 3,
                        totalLessons: 15,
                    });
                    results.created[sectionCode] = 'classSection';

                    // ── 5. Tạo điểm mẫu cho từng sinh viên trong lớp ──────────
                    for (const sv of sec.students) {
                        const existingGrade = await Grade.findOne({ student: sv, classSection: sec._id });
                        if (!existingGrade) {
                            const att = +(Math.random() * 4 + 6).toFixed(1);
                            const mid = +(Math.random() * 5 + 5).toFixed(1);
                            const fin = +(Math.random() * 5 + 4).toFixed(1);
                            const total = +(att * 0.1 + mid * 0.3 + fin * 0.6).toFixed(2);
                            let letterGrade, totalScore4, isPassed;
                            if (total >= 8.5) { letterGrade = 'A'; totalScore4 = 4.0; isPassed = true; }
                            else if (total >= 8.0) { letterGrade = 'B+'; totalScore4 = 3.5; isPassed = true; }
                            else if (total >= 7.0) { letterGrade = 'B'; totalScore4 = 3.0; isPassed = true; }
                            else if (total >= 6.5) { letterGrade = 'C+'; totalScore4 = 2.5; isPassed = true; }
                            else if (total >= 5.5) { letterGrade = 'C'; totalScore4 = 2.0; isPassed = true; }
                            else if (total >= 5.0) { letterGrade = 'D+'; totalScore4 = 1.5; isPassed = true; }
                            else if (total >= 4.0) { letterGrade = 'D'; totalScore4 = 1.0; isPassed = true; }
                            else { letterGrade = 'F'; totalScore4 = 0.0; isPassed = false; }
                            await Grade.create({
                                student: sv,
                                classSection: sec._id,
                                course: course._id,
                                attendanceScore: att,
                                midtermScore: mid,
                                finalScore: fin,
                                totalScore10: total,
                                totalScore4,
                                letterGrade,
                                isPassed,
                                isPublished: Math.random() > 0.3,
                                isLocked: Math.random() > 0.5,
                                semester,
                            });
                        }
                    }

                    // ── 6. Tạo điểm danh mẫu ───────────────────────────────────
                    const lessonsToCreate = 5; // 5 buổi mẫu
                    for (let l = 0; l < lessonsToCreate; l++) {
                        const lessonDate = new Date().toISOString().split('T')[0];
                        const existingAtt = await Attendance.findOne({ classSection: sec._id, sessionNumber: l + 1 });
                        if (!existingAtt) {
                            const records = sec.students.map(sv => ({
                                student: sv,
                                status: ['present', 'present', 'present', 'late', 'unexcused_absent'][Math.floor(Math.random() * 5)]
                            }));
                            await Attendance.create({
                                classSection: sec._id,
                                date: lessonDate,
                                sessionNumber: l + 1,
                                records,
                            });
                        }
                    }
                } else {
                    results.skipped[sectionCode] = 'already exists';
                }
                sections.push(sec);
                secIdx++;
            }
        }

        res.json({
            success: true,
            message: '✅ Tạo dữ liệu mẫu thành công!',
            summary: {
                teachers: teacherData.length,
                students: studentNames.length,
                courses: coursesData.length,
                classSections: sections.length,
            },
            accounts: {
                teacher: { email: 'gv001@school.edu.vn', password: '123456', code: 'GV001' },
                student: { email: 'sv001@student.edu.vn', password: '123456', code: 'SV001' },
            },
            details: results,
        });
    } catch (err) {
        console.error('[SEED ERROR]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * DELETE /api/seed/clear
 * Xóa toàn bộ dữ liệu mẫu (cẩn thận!)
 */
exports.clearSeedData = async (req, res) => {
    try {
        await Grade.deleteMany({});
        await Attendance.deleteMany({});
        await ClassSection.deleteMany({});
        await Course.deleteMany({});
        await User.deleteMany({ role: { $in: ['student', 'teacher'] } });
        res.json({ success: true, message: '🗑️ Đã xóa toàn bộ dữ liệu mẫu' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
