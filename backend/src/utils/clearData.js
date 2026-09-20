require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Course = require('../models/Course');
const ClassSection = require('../models/ClassSection');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
const GradeAppeal = require('../models/GradeAppeal');
const ExamSchedule = require('../models/ExamSchedule');
const Survey = require('../models/Survey');
const Submission = require('../models/Submission');
const Internship = require('../models/Internship');
const Thesis = require('../models/Thesis');
const Announcement = require('../models/Announcement');
const Note = require('../models/Note');
const Notification = require('../models/Notification');
const Major = require('../models/Major');
const Curriculum = require('../models/Curriculum');
const Enrollment = require('../models/Enrollment');

const clearAllData = async () => {
    try {
        console.log('Đang kết nối MongoDB để xóa toàn bộ dữ liệu mẫu...');
        await connectDB();

        console.log('Đang xóa sạch dữ liệu của tất cả các bảng...');
        await Promise.all([
            User.deleteMany({ code: { $ne: 'admin' } }),
            Course.deleteMany({}),
            ClassSection.deleteMany({}),
            Attendance.deleteMany({}),
            Grade.deleteMany({}),
            GradeAppeal.deleteMany({}),
            ExamSchedule.deleteMany({}),
            Survey.deleteMany({}),
            Submission.deleteMany({}),
            Internship.deleteMany({}),
            Thesis.deleteMany({}),
            Announcement.deleteMany({}),
            Note.deleteMany({}),
            Notification.deleteMany({}),
            Major.deleteMany({}),
            Curriculum.deleteMany({}),
            Enrollment.deleteMany({})
        ]);

        // Đảm bảo có sẵn 1 tài khoản Admin để đăng nhập vào trang Quản trị viên
        let admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            admin = await User.create({
                code: 'admin',
                name: 'Quản Trị Viên Hệ Thống',
                email: 'admin@university.edu.vn',
                password: '123',
                plainPassword: '123',
                role: 'admin',
                department: 'Phòng Đào Tạo',
                status: 'Đang công tác'
            });
            console.log('✅ Đã tạo tài khoản quản trị viên: Mã: admin / Mật khẩu: 123');
        } else {
            console.log('✅ Đã giữ lại tài khoản quản trị viên: Mã: admin');
        }

        console.log('=== ĐÃ XÓA SẠCH TOÀN BỘ DỮ LIỆU GIẢ/MẪU THÀNH CÔNG! ===');
        process.exit(0);
    } catch (err) {
        console.error('Lỗi khi xóa dữ liệu:', err);
        process.exit(1);
    }
};

clearAllData();
