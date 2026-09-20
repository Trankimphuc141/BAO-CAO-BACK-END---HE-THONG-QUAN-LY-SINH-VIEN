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
            
            const isPub = grades.length > 0 && grades.every(g => g.isPublished);
            const isSubmitted = grades.length > 0 && grades.some(g => g.submissionStatus === 'submitted');
            const isReSub = grades.length > 0 && grades.some(g => g.submissionStatus === 're_submitted');
            const isUnlockReq = grades.length > 0 && grades.some(g => g.unlockStatus === 'requested_unlock');
            const isUnlockedEdit = grades.length > 0 && grades.some(g => g.unlockStatus === 'unlocked_for_edit');
            const isLocked = grades.length > 0 && grades.some(g => g.isLocked);

            let unlockStatus = 'locked';
            if (isUnlockReq) unlockStatus = 'requested_unlock';
            else if (isUnlockedEdit) unlockStatus = 'unlocked_for_edit';

            let submissionStatus = 'not_submitted';
            if (isReSub) submissionStatus = 're_submitted';
            else if (isPub) submissionStatus = 'published';
            else if (isSubmitted) submissionStatus = 'submitted';

            let status = 'not_submitted';
            if (isUnlockReq) status = 'requested_unlock';
            else if (isUnlockedEdit) status = 'unlocked_for_edit';
            else if (isReSub) status = 're_submitted';
            else if (isPub) status = 'published';
            else if (isSubmitted) status = 'submitted';

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
                teacherName: sec.teacher?.name || 'Giảng viên',
                semester: sec.semester || 'HK1-2026-2027',
                totalStudents,
                totalGrades,
                publishedGrades,
                status,
                unlockStatus,
                submissionStatus,
                isPublished: isPub,
                isLocked,
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

        // Tự động đồng bộ điểm & tạo bản ghi cho tất cả sinh viên trong lớp học phần (không phát socket lặp vô tận khi GET)
        await syncAttendanceToGradesInternal(classSectionId, null);

        const section = await ClassSection.findById(classSectionId)
            .populate('course')
            .populate('teacher', 'code name email');
        if (!section) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
        }

        const allGrades = await Grade.find({ classSection: classSectionId })
            .populate('student', 'code name email classCode avatar')
            .populate('course', 'code name credits')
            .sort({ 'student.code': 1 });

        // Tự động dọn dẹp các bản ghi điểm mồ côi (sinh viên đã bị xóa hoặc null)
        const orphanGrades = allGrades.filter(g => !g.student);
        if (orphanGrades.length > 0) {
            await Grade.deleteMany({ _id: { $in: orphanGrades.map(og => og._id) } });
        }
        const grades = allGrades.filter(g => !!g.student);

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
                classSection: section,
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

        const io = req.app ? req.app.get('io') : null;
        if (io) {
            io.emit('grade-updated', { classSectionId: grade.classSection, gradeId: grade._id });
        }

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
            status: { $in: ['teacher_re_submitted', 'admin_unlocked', 'pending_teacher', 'teacher_replied', 'teacher_request_unlock'] }
        }).populate('grade');

        for (const app of appealsToResolve) {
            let gr = app.grade;
            if (!gr) {
                gr = await Grade.findOne({ student: app.student, classSection: classSectionId });
            }
            if (gr) {
                if (app.scoreType === 'midterm') app.newScore = gr.midtermScore;
                else if (app.scoreType === 'attendance') app.newScore = gr.attendanceScore;
                else app.newScore = gr.finalScore;
            }
            app.status = 'admin_approved_published';
            app.resolvedAt = new Date();
            app.adminComment = req.body.adminComment || 'Admin đã chốt duyệt và công bố điểm chính thức sau phúc khảo';
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
            io.emit('grade-updated', { classSectionId });
            io.emit('grades-published', { classSectionId });
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

        const io = req.app.get('io');
        if (io) {
            io.emit('grade-updated', { classSectionId });
            io.emit('appeal-updated', { classSectionId, appealId });
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

// 9. POST /api/admin/grades/appeals/:appealId/decide — Admin quyết định phúc khảo (cập nhật điểm / mở khóa / từ chối)
exports.adminDecideAppeal = async (req, res) => {
    try {
        const { appealId } = req.params;
        const { decision, newScore, adminComment } = req.body;

        const appeal = await GradeAppeal.findById(appealId)
            .populate('student')
            .populate('course')
            .populate('classSection')
            .populate('teacher')
            .populate('grade');

        if (!appeal) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn phúc khảo' });
        }

        const io = req.app ? req.app.get('io') : null;

        if (decision === 'approve_update') {
            if (newScore === undefined || newScore === null || isNaN(Number(newScore))) {
                return res.status(400).json({ success: false, message: 'Vui lòng nhập điểm mới hợp lệ (từ 0 đến 10)' });
            }

            const parsedScore = Number(Number(newScore).toFixed(2));
            if (parsedScore < 0 || parsedScore > 10) {
                return res.status(400).json({ success: false, message: 'Điểm số phải nằm trong thang điểm từ 0 đến 10' });
            }

            let grade = appeal.grade;
            if (!grade) {
                grade = await Grade.findOne({ student: appeal.student._id, classSection: appeal.classSection._id });
            }

            if (!grade) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi điểm của sinh viên để cập nhật' });
            }

            // Cập nhật cột điểm tương ứng theo scoreType
            if (appeal.scoreType === 'midterm') {
                grade.midtermScore = parsedScore;
            } else if (appeal.scoreType === 'attendance') {
                grade.attendanceScore = parsedScore;
            } else {
                grade.finalScore = parsedScore;
            }

            grade.reviewedBy = req.user.id;
            grade.reviewedAt = new Date();
            grade.isPublished = true;
            grade.isLocked = true;
            grade.unlockStatus = 'locked';
            grade.submissionStatus = 'published';
            grade.adminComment = adminComment || 'Điểm đã được điều chỉnh theo quyết định phúc khảo của Ban Quản Lý (Admin)';

            await grade.save(); // Tự động trigger tính toán lại totalScore10, totalScore4, letterGrade, isPassed

            // Cập nhật đơn phúc khảo
            appeal.newScore = parsedScore;
            appeal.adminComment = adminComment || 'Admin đã kiểm tra lại và phê duyệt cập nhật điểm số mới';
            appeal.status = 'admin_approved_published';
            appeal.resolvedAt = new Date();
            await appeal.save();

            const scoreTypeLabel = appeal.scoreType === 'midterm' ? 'Giữa kỳ' : appeal.scoreType === 'final' ? 'Cuối kỳ' : 'Chuyên cần';

            // Gửi thông báo đến Sinh viên
            await Notification.create({
                recipient: appeal.student._id,
                sender: req.user.id,
                type: 'system',
                title: '🎉 Kết quả phúc khảo: Đã cập nhật điểm mới',
                content: `Ban Quản Lý (Admin) đã phê duyệt đơn phúc khảo môn ${appeal.course?.name}. Điểm ${scoreTypeLabel} được cập nhật từ ${appeal.oldScore} thành ${parsedScore}. Điểm tổng kết mới: ${grade.totalScore10} (${grade.letterGrade}).`,
                link: '/profile',
                classSection: appeal.classSection?._id
            });

            // Gửi thông báo đến Giảng viên
            if (appeal.teacher?._id) {
                await Notification.create({
                    recipient: appeal.teacher._id,
                    sender: req.user.id,
                    type: 'system',
                    title: '✅ Admin đã duyệt kết quả phúc khảo',
                    content: `Admin đã phê duyệt đơn phúc khảo môn ${appeal.course?.name} của SV ${appeal.student?.name}. Điểm ${scoreTypeLabel} đã cập nhật thành ${parsedScore}.`,
                    link: '/grades',
                    classSection: appeal.classSection?._id
                });
            }

            if (io) {
                io.to(appeal.student._id.toString()).emit('new-notification', {
                    type: 'system',
                    title: '🎉 Kết quả phúc khảo: Đã cập nhật điểm mới',
                    content: `Điểm môn ${appeal.course?.name} đã được Admin cập nhật thành ${parsedScore}!`
                });
                io.emit('grade-updated', { classSectionId: appeal.classSection?._id || appeal.classSection });
                io.emit('appeal-updated', { appealId });
            }

            return res.json({
                success: true,
                message: `Đã cập nhật điểm ${scoreTypeLabel} mới (${parsedScore}đ) cho SV ${appeal.student?.name} thành công!`,
                data: { appeal, grade }
            });
        }

        if (decision === 'unlock_teacher') {
            // Mở khóa bảng điểm để giảng viên tự sửa
            await Grade.updateMany(
                { classSection: appeal.classSection._id },
                {
                    $set: {
                        isLocked: false,
                        unlockStatus: 'unlocked_for_edit'
                    }
                }
            );

            appeal.status = 'admin_unlocked';
            appeal.adminComment = adminComment || 'Admin đã phê duyệt mở khóa cho Giảng viên kiểm tra & chấm lại';
            await appeal.save();

            if (appeal.teacher?._id) {
                await Notification.create({
                    recipient: appeal.teacher._id,
                    sender: req.user.id,
                    type: 'system',
                    title: '🔓 Admin đã mở khóa bảng điểm để chấm lại',
                    content: `Admin đã phê duyệt yêu cầu mở khóa lớp ${appeal.classSection?.sectionCode} (${appeal.course?.name}) để Thầy/Cô cập nhật điểm theo phúc khảo của SV ${appeal.student?.name}.`,
                    link: '/grades',
                    classSection: appeal.classSection?._id
                });
                if (io) {
                    io.to(appeal.teacher._id.toString()).emit('new-notification', {
                        type: 'system',
                        title: '🔓 Admin đã mở khóa bảng điểm',
                        content: `Admin đã duyệt mở khóa lớp ${appeal.classSection?.sectionCode} (${appeal.course?.name}) để chấm lại phúc khảo.`,
                        link: '/grades'
                    });
                }
            }

            if (io) {
                io.emit('grade-updated', { classSectionId: appeal.classSection?._id || appeal.classSection });
                io.emit('appeal-updated', { appealId });
            }

            return res.json({
                success: true,
                message: 'Đã mở khóa bảng điểm lớp cho Giảng viên vào chấm và cập nhật điểm lại thành công!',
                data: { appeal }
            });
        }

        if (decision === 'reject') {
            let grade = appeal.grade;
            if (!grade) {
                grade = await Grade.findOne({ student: appeal.student._id, classSection: appeal.classSection._id });
            }
            if (grade) {
                if (appeal.scoreType === 'midterm') grade.midtermScore = appeal.oldScore;
                else if (appeal.scoreType === 'attendance') grade.attendanceScore = appeal.oldScore;
                else grade.finalScore = appeal.oldScore;
                grade.isLocked = true;
                grade.unlockStatus = 'locked';
                grade.submissionStatus = 'published';
                await grade.save();
            }

            appeal.status = 'teacher_rejected';
            appeal.adminComment = adminComment || 'Admin đã kiểm tra và quyết định giữ nguyên điểm số ban đầu';
            appeal.resolvedAt = new Date();
            await appeal.save();

            await Notification.create({
                recipient: appeal.student._id,
                sender: req.user.id,
                type: 'system',
                title: '❌ Kết quả phúc khảo: Giữ nguyên điểm',
                content: `Admin đã kiểm tra lại đơn phúc khảo môn ${appeal.course?.name}. Điểm số ban đầu (${appeal.oldScore}) được giữ nguyên. Lý do: ${appeal.adminComment}`,
                link: '/profile',
                classSection: appeal.classSection?._id
            });

            if (io && appeal.student?._id) {
                io.to(appeal.student._id.toString()).emit('new-notification', {
                    type: 'system',
                    title: '❌ Kết quả phúc khảo: Giữ nguyên điểm',
                    content: `Admin đã kiểm tra đơn phúc khảo môn ${appeal.course?.name}: Điểm giữ nguyên.`,
                    link: '/profile'
                });
            }

            if (io) {
                io.emit('grade-updated', { classSectionId: appeal.classSection?._id || appeal.classSection });
                io.emit('appeal-updated', { appealId });
            }

            return res.json({
                success: true,
                message: 'Đã ghi nhận từ chối phúc khảo và giữ nguyên điểm số ban đầu.',
                data: { appeal }
            });
        }

        return res.status(400).json({ success: false, message: 'Quyết định không hợp lệ' });
    } catch (err) {
        console.error('Lỗi adminDecideAppeal:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
