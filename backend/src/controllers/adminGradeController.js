const Grade = require('../models/Grade');
const GradeAppeal = require('../models/GradeAppeal');
const ClassSection = require('../models/ClassSection');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { syncAttendanceToGradesInternal } = require('./academicController');

// 1. GET /api/admin/grades/classes — Danh sách các lớp học phần và trạng thái nộp điểm / phúc khảo
exports.getAdminGradeClasses = async (req, res) => {
    try {
        const classSections = await ClassSection.find()
            .populate('course', 'code name credits')
            .populate('teacher', 'code name email')
            .sort({ createdAt: -1 });

        const data = await Promise.all(classSections.map(async (sec) => {
            const grades = await Grade.find({ classSection: sec._id });
            const totalStudents = sec.students?.length || grades.length;
            const totalGrades = grades.length;
            const publishedGrades = grades.filter(g => g.isPublished).length;
            
            // Xác định trạng thái tổng thể của lớp:
            // 'not_submitted': Chưa có điểm hoặc chưa gửi
            // 'submitted': Giảng viên đã nộp chờ Admin duyệt
            // 'published': Admin đã chốt & công bố
            // 're_submitted': Giảng viên đã sửa theo phúc khảo và gửi lại
            // 'requested_unlock': Giảng viên đang xin mở khóa để sửa phúc khảo
            let status = 'not_submitted';
            if (grades.some(g => g.unlockStatus === 'requested_unlock')) {
                status = 'requested_unlock';
            } else if (grades.some(g => g.submissionStatus === 're_submitted')) {
                status = 're_submitted';
            } else if (grades.length > 0 && grades.every(g => g.isPublished)) {
                status = 'published';
            } else if (grades.some(g => g.submissionStatus === 'submitted')) {
                status = 'submitted';
            }

            const appealsCount = await GradeAppeal.countDocuments({ classSection: sec._id });
            const pendingAppealsCount = await GradeAppeal.countDocuments({ 
                classSection: sec._id, 
                status: { $in: ['pending_teacher', 'teacher_request_unlock', 'teacher_re_submitted'] } 
            });

            return {
                _id: sec._id,
                sectionCode: sec.sectionCode,
                course: sec.course,
                teacher: sec.teacher,
                semester: sec.semester || 'HK1-2026-2027',
                totalStudents,
                totalGrades,
                publishedGrades,
                status,
                appealsCount,
                pendingAppealsCount
            };
        }));

        res.json({ success: true, data });
    } catch (err) {
        console.error('Lỗi getAdminGradeClasses:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 2. GET /api/admin/grades/classes/:classSectionId — Bảng điểm chi tiết của 1 lớp học phần
exports.getAdminClassGrades = async (req, res) => {
    try {
        const { classSectionId } = req.params;
        const io = req.app ? req.app.get('io') : null;

        // Tự động đồng bộ điểm & tạo bản ghi cho tất cả sinh viên trong lớp học phần
        await syncAttendanceToGradesInternal(classSectionId, io);

        const section = await ClassSection.findById(classSectionId)
            .populate('course')
            .populate('teacher', 'code name email');
        if (!section) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
        }

        const grades = await Grade.find({ classSection: classSectionId })
            .populate('student', 'code name email classCode avatar')
            .populate('course', 'code name credits')
            .sort({ 'student.code': 1 });

        const appeals = await GradeAppeal.find({ classSection: classSectionId })
            .populate('student', 'code name')
            .sort({ createdAt: -1 });

        const stats = {
            total: grades.length,
            passed: grades.filter(g => g.isPassed).length,
            failed: grades.filter(g => !g.isPassed).length,
            published: grades.filter(g => g.isPublished).length,
            avgScore: grades.length > 0 ? Number((grades.reduce((s, g) => s + (g.totalScore10 || 0), 0) / grades.length).toFixed(2)) : 0
        };

        res.json({
            success: true,
            data: {
                section,
                grades,
                appeals,
                stats
            }
        });
    } catch (err) {
        console.error('Lỗi getAdminClassGrades:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 3. PUT /api/admin/grades/:gradeId — Admin chỉnh sửa / thay đổi điểm của sinh viên
exports.adminUpdateGrade = async (req, res) => {
    try {
        const { gradeId } = req.params;
        const { attendanceScore, midtermScore, finalScore, teacherComment, adminComment, sessionScores } = req.body;

        const grade = await Grade.findById(gradeId).populate('student', 'name code').populate('course', 'name');
        if (!grade) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi điểm' });
        }

        if (attendanceScore !== undefined) grade.attendanceScore = Number(attendanceScore);
        if (midtermScore !== undefined) grade.midtermScore = Number(midtermScore);
        if (finalScore !== undefined) grade.finalScore = Number(finalScore);
        if (teacherComment !== undefined) grade.teacherComment = teacherComment;
        if (adminComment !== undefined) grade.adminComment = adminComment;
        if (sessionScores && Array.isArray(sessionScores) && sessionScores.length === 15) {
            grade.sessionScores = sessionScores;
        }

        grade.reviewedBy = req.user.id;
        grade.reviewedAt = new Date();

        await grade.save();

        res.json({
            success: true,
            message: `Admin đã cập nhật điểm môn ${grade.course?.name || ''} cho SV ${grade.student?.name || ''} thành công!`,
            data: grade
        });
    } catch (err) {
        console.error('Lỗi adminUpdateGrade:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 4. POST /api/admin/grades/publish — Admin chốt và công bố điểm cho toàn lớp
exports.adminPublishGrades = async (req, res) => {
    try {
        const { classSectionId } = req.body;
        if (!classSectionId) {
            return res.status(400).json({ success: false, message: 'Thiếu classSectionId' });
        }

        const section = await ClassSection.findById(classSectionId).populate('course teacher');
        if (!section) {
            return res.status(404).json({ success: false, message: 'Lớp học phần không tồn tại' });
        }

        // Cập nhật tất cả điểm của lớp: công bố và khóa
        await Grade.updateMany(
            { classSection: classSectionId },
            {
                $set: {
                    isPublished: true,
                    publishedAt: new Date(),
                    publishedBy: req.user.id,
                    submissionStatus: 'published',
                    isLocked: true,
                    unlockStatus: 'locked'
                }
            }
        );

        // Cập nhật các đơn phúc khảo của lớp đang chờ chốt công bố
        const appealsToResolve = await GradeAppeal.find({
            classSection: classSectionId,
            status: { $in: ['teacher_re_submitted', 'admin_unlocked'] }
        }).populate('grade');

        for (const app of appealsToResolve) {
            if (app.grade) {
                if (app.scoreType === 'midterm') app.newScore = app.grade.midtermScore;
                else if (app.scoreType === 'attendance') app.newScore = app.grade.attendanceScore;
                else app.newScore = app.grade.finalScore;
            }
            app.status = 'admin_approved_published';
            app.resolvedAt = new Date();
            app.adminComment = req.body.adminComment || 'Admin đã chốt duyệt và công bố điểm chính thức';
            await app.save();
        }

        // Gửi thông báo đến sinh viên và giảng viên
        const grades = await Grade.find({ classSection: classSectionId }).populate('student', '_id name');
        const notifPromises = grades.map(g =>
            Notification.create({
                recipient: g.student._id,
                sender: req.user.id,
                type: 'grade_published',
                title: '📢 Điểm học phần đã được công bố chính thức',
                content: `Ban Quản Lý (Admin) đã chính thức phê duyệt & công bố bảng điểm môn ${section.course?.name}. Sinh viên có thể tra cứu và nộp phúc khảo nếu có thắc mắc.`,
                link: '/profile',
                classSection: classSectionId
            })
        );

        if (section.teacher?._id) {
            notifPromises.push(
                Notification.create({
                    recipient: section.teacher._id,
                    sender: req.user.id,
                    type: 'grade_published',
                    title: '📢 Điểm lớp học phần đã được công bố',
                    content: `Ban Quản Lý đã phê duyệt & công bố điểm lớp ${section.sectionCode} (${section.course?.name}) lên hệ thống.`,
                    link: '/grades',
                    classSection: classSectionId
                })
            );
        }

        await Promise.all(notifPromises);

        // Socket IO event
        const io = req.app.get('io');
        if (io) {
            grades.forEach(g => {
                io.to(g.student._id.toString()).emit('new-notification', {
                    type: 'grade_published',
                    title: '📢 Điểm học phần đã được công bố chính thức',
                    content: `Điểm môn ${section.course?.name} đã được công bố!`
                });
            });
            if (section.teacher?._id) {
                io.to(section.teacher._id.toString()).emit('new-notification', {
                    type: 'grade_published',
                    title: '📢 Điểm lớp học phần đã được công bố',
                    content: `Điểm lớp ${section.sectionCode} đã được Admin công bố!`
                });
            }
        }

        res.json({
            success: true,
            message: `Đã chốt và công bố điểm cho toàn bộ sinh viên lớp ${section.sectionCode} thành công!`
        });
    } catch (err) {
        console.error('Lỗi adminPublishGrades:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 5. POST /api/admin/grades/unlock — Admin duyệt mở khóa bảng điểm cho Giảng viên sửa phúc khảo
exports.adminUnlockGradeForTeacher = async (req, res) => {
    try {
        const { classSectionId, appealId } = req.body;
        if (!classSectionId) {
            return res.status(400).json({ success: false, message: 'Thiếu classSectionId' });
        }

        const section = await ClassSection.findById(classSectionId).populate('course teacher');
        if (!section) return res.status(404).json({ success: false, message: 'Lớp không tồn tại' });

        // Mở khóa bảng điểm để giảng viên có thể sửa
        await Grade.updateMany(
            { classSection: classSectionId },
            {
                $set: {
                    isLocked: false,
                    unlockStatus: 'unlocked_for_edit'
                }
            }
        );

        if (appealId) {
            await GradeAppeal.findByIdAndUpdate(appealId, {
                status: 'admin_unlocked',
                adminComment: 'Admin đã phê duyệt mở khóa bảng điểm cho giảng viên kiểm tra & chấm lại'
            });
        }

        // Gửi thông báo đến giảng viên
        if (section.teacher?._id) {
            await Notification.create({
                recipient: section.teacher._id,
                sender: req.user.id,
                type: 'system',
                title: '🔓 Yêu cầu mở khóa bảng điểm đã được duyệt',
                content: `Ban Quản Lý đã mở khóa bảng điểm lớp ${section.sectionCode} (${section.course?.name}). Quý Thầy/Cô hãy kiểm tra, chấm lại và chốt điểm gửi lại cho Admin.`,
                link: '/grades',
                classSection: classSectionId
            });

            const io = req.app.get('io');
            if (io) {
                io.to(section.teacher._id.toString()).emit('new-notification', {
                    type: 'system',
                    title: '🔓 Yêu cầu mở khóa bảng điểm đã được duyệt',
                    content: `Bảng điểm lớp ${section.sectionCode} đã được mở khóa để Thầy/Cô sửa điểm phúc khảo.`
                });
            }
        }

        res.json({
            success: true,
            message: `Đã mở khóa bảng điểm lớp ${section.sectionCode} cho Giảng viên thành công!`
        });
    } catch (err) {
        console.error('Lỗi adminUnlockGradeForTeacher:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 6. GET /api/admin/grades/appeals — Lấy danh sách toàn bộ các đơn phúc khảo
exports.getAdminAppeals = async (req, res) => {
    try {
        const appeals = await GradeAppeal.find()
            .populate('student', 'code name email classCode')
            .populate('course', 'code name credits')
            .populate('classSection', 'sectionCode')
            .populate('teacher', 'code name email')
            .populate('grade')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: appeals });
    } catch (err) {
        console.error('Lỗi getAdminAppeals:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 7. POST /api/admin/grades/sync-all — Đồng bộ toàn bộ dữ liệu điểm các lớp
exports.adminSyncAllGrades = async (req, res) => {
    try {
        const sections = await ClassSection.find({});
        const io = req.app ? req.app.get('io') : null;
        let totalCount = 0;
        for (const sec of sections) {
            const r = await syncAttendanceToGradesInternal(sec._id, io);
            if (r.success) totalCount += (r.count || 0);
        }
        res.json({
            success: true,
            message: `Đã đồng bộ toàn bộ dữ liệu điểm của ${sections.length} lớp học phần (${totalCount} lượt sinh viên)!`,
            totalSections: sections.length,
            totalStudents: totalCount
        });
    } catch (err) {
        console.error('Lỗi adminSyncAllGrades:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// 8. POST /api/admin/grades/sync-section — Đồng bộ điểm 1 lớp
exports.adminSyncSectionGrades = async (req, res) => {
    try {
        const { classSectionId } = req.body;
        if (!classSectionId) return res.status(400).json({ success: false, message: 'Thiếu classSectionId' });
        const io = req.app ? req.app.get('io') : null;
        const result = await syncAttendanceToGradesInternal(classSectionId, io);
        if (!result.success) return res.status(500).json({ success: false, message: result.error });
        res.json({
            success: true,
            message: `Đã đồng bộ dữ liệu điểm lớp thành công (${result.count} sinh viên)!`,
            count: result.count
        });
    } catch (err) {
        console.error('Lỗi adminSyncSectionGrades:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
