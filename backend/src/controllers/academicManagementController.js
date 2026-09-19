const Major = require('../models/Major');
const Curriculum = require('../models/Curriculum');
const Course = require('../models/Course');
const ClassSection = require('../models/ClassSection');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const Grade = require('../models/Grade');

// ═══════════════════════════════════════════════
// 1. QUẢN LÝ NGÀNH HỌC (MAJORS)
// ═══════════════════════════════════════════════
exports.getMajors = async (req, res) => {
    try {
        const majors = await Major.find().sort({ code: 1 });
        res.json({ success: true, data: majors });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createMajor = async (req, res) => {
    try {
        const { code, name, department, description } = req.body;
        if (!code || !name) {
            return res.status(400).json({ success: false, message: 'Mã ngành và tên ngành là bắt buộc' });
        }
        const existing = await Major.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Mã ngành đã tồn tại' });
        }
        const major = await Major.create({
            code: code.toUpperCase(),
            name,
            department: department || 'Công nghệ thông tin',
            description: description || ''
        });
        res.status(201).json({ success: true, data: major, message: 'Thêm ngành học thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateMajor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, department, description } = req.body;
        const major = await Major.findByIdAndUpdate(
            id,
            { name, department, description },
            { new: true }
        );
        if (!major) return res.status(404).json({ success: false, message: 'Không tìm thấy ngành học' });
        res.json({ success: true, data: major, message: 'Cập nhật ngành học thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteMajor = async (req, res) => {
    try {
        const { id } = req.params;
        await Major.findByIdAndDelete(id);
        res.json({ success: true, message: 'Đã xóa ngành học thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ═══════════════════════════════════════════════
// 2. QUẢN LÝ MÔN HỌC (COURSES) VỚI SỐ TÍN CHỈ
// ═══════════════════════════════════════════════
exports.getCourses = async (req, res) => {
    try {
        const courses = await Course.find().sort({ code: 1 });
        res.json({ success: true, data: courses });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createCourse = async (req, res) => {
    try {
        const { code, name, credits, department, description, tuitionFeePerCredit } = req.body;
        if (!code || !name) {
            return res.status(400).json({ success: false, message: 'Mã môn học và tên môn học là bắt buộc' });
        }
        const existing = await Course.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Mã môn học đã tồn tại' });
        }
        const course = await Course.create({
            code: code.toUpperCase(),
            name,
            credits: Number(credits) || 3,
            department: department || 'Công nghệ thông tin',
            description: description || '',
            tuitionFeePerCredit: Number(tuitionFeePerCredit) || 450000
        });
        res.status(201).json({ success: true, data: course, message: 'Thêm môn học thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, credits, department, description, tuitionFeePerCredit } = req.body;
        const course = await Course.findByIdAndUpdate(
            id,
            {
                name,
                credits: Number(credits) || 3,
                department,
                description,
                tuitionFeePerCredit: Number(tuitionFeePerCredit) || 450000
            },
            { new: true }
        );
        if (!course) return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
        res.json({ success: true, data: course, message: 'Cập nhật môn học thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        await Course.findByIdAndDelete(id);
        res.json({ success: true, message: 'Đã xóa môn học thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ═══════════════════════════════════════════════
// 3. QUẢN LÝ CHƯƠNG TRÌNH ĐÀO TẠO & CỜ HIỂN THỊ THEO KỲ
// ═══════════════════════════════════════════════
exports.getCurriculums = async (req, res) => {
    try {
        const curriculums = await Curriculum.find()
            .populate('major')
            .populate('semesters.courses')
            .sort({ academicYear: -1 });
        res.json({ success: true, data: curriculums });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createCurriculum = async (req, res) => {
    try {
        const { major, name, academicYear, semesters } = req.body;
        if (!major || !name) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn ngành và nhập tên chương trình' });
        }

        // Tạo mặc định 8 học kỳ nếu chưa có
        let formattedSemesters = semesters;
        if (!formattedSemesters || formattedSemesters.length === 0) {
            formattedSemesters = Array.from({ length: 8 }, (_, i) => ({
                semesterIndex: i + 1,
                semesterName: `Học kỳ ${i + 1}`,
                isVisible: i === 0, // Kỳ 1 mặc định mở
                courses: []
            }));
        }

        const curriculum = await Curriculum.create({
            major,
            name,
            academicYear: academicYear || '2023-2027',
            semesters: formattedSemesters
        });

        const populated = await Curriculum.findById(curriculum._id).populate('major').populate('semesters.courses');
        res.status(201).json({ success: true, data: populated, message: 'Tạo chương trình đào tạo thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateCurriculum = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, academicYear, semesters } = req.body;
        const curriculum = await Curriculum.findByIdAndUpdate(
            id,
            { name, academicYear, semesters },
            { new: true }
        ).populate('major').populate('semesters.courses');
        if (!curriculum) return res.status(404).json({ success: false, message: 'Không tìm thấy chương trình đào tạo' });
        res.json({ success: true, data: curriculum, message: 'Cập nhật chương trình đào tạo thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Admin chuyển đổi bật/tắt hiển thị chương trình học theo từng học kỳ
exports.toggleSemesterVisibility = async (req, res) => {
    try {
        const { id, semesterIndex } = req.params;
        const { isVisible } = req.body;

        const curriculum = await Curriculum.findById(id);
        if (!curriculum) return res.status(404).json({ success: false, message: 'Không tìm thấy chương trình đào tạo' });

        const sem = curriculum.semesters.find(s => s.semesterIndex === Number(semesterIndex));
        if (!sem) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ này trong CTĐT' });

        sem.isVisible = typeof isVisible === 'boolean' ? isVisible : !sem.isVisible;
        await curriculum.save();

        res.json({
            success: true,
            data: sem,
            message: `Đã ${sem.isVisible ? 'bật' : 'tắt'} hiển thị ${sem.semesterName || 'Học kỳ ' + semesterIndex} cho sinh viên`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Admin thêm môn học vào một học kỳ của CTĐT
exports.addCourseToSemester = async (req, res) => {
    try {
        const { id, semesterIndex } = req.params;
        const { courseId } = req.body;

        if (!courseId) return res.status(400).json({ success: false, message: 'Vui lòng chọn môn học' });

        const curriculum = await Curriculum.findById(id);
        if (!curriculum) return res.status(404).json({ success: false, message: 'Không tìm thấy chương trình đào tạo' });

        const sem = curriculum.semesters.find(s => s.semesterIndex === Number(semesterIndex));
        if (!sem) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ này' });

        if (!sem.courses.some(c => c.toString() === courseId.toString())) {
            sem.courses.push(courseId);
            await curriculum.save();
        }

        const updated = await Curriculum.findById(id).populate('major').populate('semesters.courses');
        res.json({ success: true, data: updated, message: 'Đã thêm môn học vào học kỳ thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Admin xóa môn học khỏi một học kỳ của CTĐT
exports.removeCourseFromSemester = async (req, res) => {
    try {
        const { id, semesterIndex, courseId } = req.params;

        const curriculum = await Curriculum.findById(id);
        if (!curriculum) return res.status(404).json({ success: false, message: 'Không tìm thấy chương trình đào tạo' });

        const sem = curriculum.semesters.find(s => s.semesterIndex === Number(semesterIndex));
        if (!sem) return res.status(404).json({ success: false, message: 'Không tìm thấy học kỳ này' });

        sem.courses = sem.courses.filter(c => c.toString() !== courseId.toString());
        await curriculum.save();

        const updated = await Curriculum.findById(id).populate('major').populate('semesters.courses');
        res.json({ success: true, data: updated, message: 'Đã xóa môn học khỏi học kỳ' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Sinh viên xem chương trình học (chỉ những kỳ Admin bật cờ isVisible: true)
exports.getStudentCurriculumView = async (req, res) => {
    try {
        const curriculums = await Curriculum.find()
            .populate('major')
            .populate('semesters.courses')
            .sort({ academicYear: -1 });

        // Lọc các học kỳ có isVisible = true
        const visibleCurriculums = curriculums.map(c => {
            const visibleSemesters = c.semesters.filter(s => s.isVisible);
            return {
                _id: c._id,
                name: c.name,
                academicYear: c.academicYear,
                major: c.major,
                semesters: visibleSemesters
            };
        });

        res.json({ success: true, data: visibleCurriculums });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ═══════════════════════════════════════════════
// 4. QUẢN LÝ HỌC PHẦN & PHÂN CÔNG GIẢNG DẠY (ADMIN)
// ═══════════════════════════════════════════════
exports.getClassSections = async (req, res) => {
    try {
        const { semester } = req.query;
        const query = {};
        if (semester) query.semester = semester;

        const sections = await ClassSection.find(query)
            .populate('course')
            .populate('teacher', 'code name email department')
            .populate('students', 'code name email')
            .sort({ sectionCode: 1 });

        res.json({ success: true, data: sections });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createClassSection = async (req, res) => {
    try {
        const {
            sectionCode,
            course,
            teacher,
            semester,
            academicYear,
            maxStudents,
            room,
            dayOfWeek,
            shift,
            isOpen
        } = req.body;

        if (!sectionCode || !course || !teacher) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập mã lớp, chọn môn học và phân công giảng viên'
            });
        }

        const existing = await ClassSection.findOne({ sectionCode: sectionCode.toUpperCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Mã lớp học phần đã tồn tại' });
        }

        const newSection = await ClassSection.create({
            sectionCode: sectionCode.toUpperCase(),
            course,
            teacher,
            semester: semester || 'HK1-2026-2027',
            academicYear: academicYear || '2026-2027',
            maxStudents: Number(maxStudents) || 50,
            room: room || 'A201',
            dayOfWeek: Number(dayOfWeek) || 2,
            shift: shift || 'Ca 1 (07:00 - 09:30)',
            isOpen: isOpen !== undefined ? isOpen : true,
            students: []
        });

        const populated = await ClassSection.findById(newSection._id)
            .populate('course')
            .populate('teacher', 'code name email department');

        res.status(201).json({
            success: true,
            data: populated,
            message: 'Tạo lớp học phần và phân công giảng dạy thành công'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateClassSection = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            teacher,
            semester,
            academicYear,
            maxStudents,
            room,
            dayOfWeek,
            shift,
            isOpen,
            resetApproval
        } = req.body;

        const updateData = {
            teacher,
            semester,
            academicYear,
            maxStudents: Number(maxStudents),
            room,
            dayOfWeek: Number(dayOfWeek),
            shift,
            isOpen
        };

        // Nếu Admin sắp xếp lại lịch sau khi bị từ chối hoặc yêu cầu reset, đặt lại trạng thái chờ GV duyệt
        if (resetApproval) {
            updateData.teacherApprovalStatus = 'pending';
            updateData.teacherFeedback = '';
        }

        const updated = await ClassSection.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        )
            .populate('course')
            .populate('teacher', 'code name email department')
            .populate('students', 'code name email');

        if (!updated) return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });

        res.json({
            success: true,
            data: updated,
            message: 'Cập nhật phân công và lớp học phần thành công'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deleteClassSection = async (req, res) => {
    try {
        const { id } = req.params;
        await ClassSection.findByIdAndDelete(id);
        await Enrollment.deleteMany({ classSection: id });
        res.json({ success: true, message: 'Đã xóa lớp học phần thành công' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ═══════════════════════════════════════════════
// 5. GIẢNG VIÊN XEM LỊCH DẠY, XÁC THỰC & ĐỀ XUẤT LỊCH DẠY
// ═══════════════════════════════════════════════
exports.getTeacherSchedule = async (req, res) => {
    try {
        const teacherId = req.user.id || req.user._id;
        const sections = await ClassSection.find({ teacher: teacherId })
            .populate('course')
            .populate('students', 'code name email phone')
            .sort({ dayOfWeek: 1, shift: 1 });

        res.json({
            success: true,
            data: sections
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Giảng viên xác nhận hoặc từ chối & đề xuất lịch dạy mới
exports.respondTeacherSchedule = async (req, res) => {
    try {
        const teacherId = req.user.id || req.user._id;
        const { id } = req.params;
        const { status, feedback } = req.body; // 'accepted' | 'rejected'

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái xác nhận không hợp lệ' });
        }

        const section = await ClassSection.findOne({ _id: id, teacher: teacherId }).populate('course');
        if (!section) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần của bạn' });
        }

        section.teacherApprovalStatus = status;
        section.teacherFeedback = feedback || '';
        section.teacherResponseAt = new Date();
        await section.save();

        const message = status === 'accepted'
            ? `Bạn đã đồng ý lịch giảng dạy lớp "${section.sectionCode}". Lớp học đã được lên lịch thành công cho Sinh Viên!`
            : `Bạn đã từ chối lịch dạy lớp "${section.sectionCode}" và gửi đề xuất thời gian về cho Phòng Đào Tạo.`;

        const io = req.app.get('io');
        if (io) {
            io.emit('section-approval-updated', { sectionId: section._id, status, teacherId });
            io.emit('timetable-updated');
        }

        res.json({
            success: true,
            data: section,
            message
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ═══════════════════════════════════════════════
// 6. SINH VIÊN ĐĂNG KÝ & HỦY HỌC PHẦN
// ═══════════════════════════════════════════════
// Danh sách học phần đang mở trong kỳ cho sinh viên chọn
// CHỈ hiển thị những lớp đã được Giảng viên xác nhận (accepted) VÀ đang mở (isOpen)
exports.getAvailableSections = async (req, res) => {
    try {
        const { semester } = req.query;
        const query = { 
            isOpen: true,
            teacherApprovalStatus: 'accepted'
        };
        if (semester) query.semester = semester;

        const sections = await ClassSection.find(query)
            .populate('course')
            .populate('teacher', 'code name email')
            .sort({ sectionCode: 1 });

        res.json({ success: true, data: sections });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Sinh viên Đăng Ký Học Phần
exports.registerSection = async (req, res) => {
    try {
        const studentId = req.user.id || req.user._id;
        const { classSectionId } = req.body;

        if (!classSectionId) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn lớp học phần cần đăng ký' });
        }

        const section = await ClassSection.findById(classSectionId).populate('course');
        if (!section) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
        }

        if (!section.isOpen) {
            return res.status(400).json({ success: false, message: 'Lớp học phần này hiện đã đóng đăng ký' });
        }

        // Bắt buộc giảng viên phải đồng ý nhận lớp mới cho phép sinh viên đăng ký / lên lịch
        if (section.teacherApprovalStatus !== 'accepted') {
            return res.status(400).json({ 
                success: false, 
                message: 'Lớp học phần này đang chờ giảng viên xác nhận phân công, chưa thể đăng ký' 
            });
        }

        // Kiểm tra sĩ số tối đa
        if (section.students.length >= section.maxStudents) {
            return res.status(400).json({ success: false, message: 'Lớp học phần đã đủ số lượng sinh viên tối đa' });
        }

        // Kiểm tra đã đăng ký chưa
        if (section.students.some(s => s.toString() === studentId.toString())) {
            return res.status(400).json({ success: false, message: 'Bạn đã đăng ký lớp học phần này rồi' });
        }

        // Thêm sinh viên vào lớp
        section.students.push(studentId);
        await section.save();

        // Ghi nhận vào Enrollment
        await Enrollment.findOneAndUpdate(
            { student: studentId, classSection: section._id },
            {
                course: section.course._id,
                semester: section.semester,
                status: 'registered',
                registeredAt: new Date(),
                droppedAt: null
            },
            { upsert: true, new: true }
        );

        // Tự động tạo bản ghi điểm khởi tạo cho sinh viên để đồng bộ dữ liệu
        let existingGrade = await Grade.findOne({ student: studentId, classSection: section._id });
        if (!existingGrade) {
            await Grade.create({
                student: studentId,
                classSection: section._id,
                course: section.course._id || section.course,
                semester: section.semester || 'HK1-2026-2027',
                attendanceScore: 10,
                midtermScore: 0,
                finalScore: 0,
                sessionScores: Array(15).fill(10)
            });
        }

        res.json({
            success: true,
            message: `Đăng ký thành công học phần "${section.course?.name}" (${section.sectionCode}) - ${section.course?.credits || 3} tín chỉ!`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Sinh viên Hủy Học Phần
exports.dropSection = async (req, res) => {
    try {
        const studentId = req.user.id || req.user._id;
        const { classSectionId } = req.body;

        if (!classSectionId) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn lớp học phần cần hủy' });
        }

        const section = await ClassSection.findById(classSectionId).populate('course');
        if (!section) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học phần' });
        }

        // Xóa sinh viên khỏi mảng students của lớp
        section.students = section.students.filter(s => s.toString() !== studentId.toString());
        await section.save();

        // Cập nhật trạng thái enrollment
        await Enrollment.findOneAndUpdate(
            { student: studentId, classSection: section._id },
            { status: 'dropped', droppedAt: new Date() }
        );

        // Xóa bản ghi điểm chưa khóa/công bố khi sinh viên hủy môn
        await Grade.deleteOne({ student: studentId, classSection: section._id, isLocked: false, isPublished: false });

        res.json({
            success: true,
            message: `Đã hủy học phần "${section.course?.name}" (${section.sectionCode}) thành công!`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Sinh viên lấy danh sách các học phần đã đăng ký và tổng số tín chỉ
exports.getMyRegisteredSections = async (req, res) => {
    try {
        const studentId = req.user.id || req.user._id;
        const { semester } = req.query;

        const query = { students: studentId };
        if (semester) query.semester = semester;

        const sections = await ClassSection.find(query)
            .populate('course')
            .populate('teacher', 'code name email department')
            .sort({ dayOfWeek: 1, shift: 1 });

        // Tính tổng số tín chỉ tích lũy trong các lớp đã đăng ký
        const totalCredits = sections.reduce((sum, sec) => sum + (sec.course?.credits || 0), 0);

        res.json({
            success: true,
            data: sections,
            totalCredits,
            totalSections: sections.length
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
