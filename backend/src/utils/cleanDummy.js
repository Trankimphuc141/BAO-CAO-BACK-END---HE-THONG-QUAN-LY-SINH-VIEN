require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const User = require('../models/User');
const Course = require('../models/Course');
const ClassSection = require('../models/ClassSection');
const Attendance = require('../models/Attendance');
const Grade = require('../models/Grade');
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

const clearDummyData = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb+srv://TranPhamKimPhuc:Phuc123@cluster0.me3zblq.mongodb.net/student_db?retryWrites=true&w=majority';
        console.log('⚡ Đang kết nối tới MongoDB Atlas:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

        await mongoose.connect(uri);
        console.log('✅ Đã kết nối thành công tới MongoDB Atlas!');

        console.log('🧹 Đang tiến hành xóa sạch toàn bộ dữ liệu ảo...');

        await Promise.all([
            User.deleteMany({ code: { $ne: 'admin' } }),
            Course.deleteMany({}),
            ClassSection.deleteMany({}),
            Attendance.deleteMany({}),
            Grade.deleteMany({}),
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

        // Đảm bảo có tài khoản Admin duy nhất để quản trị viên có thể đăng nhập
        let adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            adminUser = await User.create({
                code: 'admin',
                name: 'Quản Trị Viên Hệ Thống',
                email: 'admin@university.edu.vn',
                password: '123',
                plainPassword: '123',
                role: 'admin',
                department: 'Phòng Đào Tạo',
                status: 'Đang công tác'
            });
            console.log('✅ Đã khởi tạo tài khoản Admin duy nhất (admin / 123)');
        } else {
            await User.updateOne({ _id: adminUser._id }, { $set: { code: 'admin', password: '123', plainPassword: '123' } });
            console.log('✅ Đã dọn dẹp và giữ lại tài khoản Admin (admin / 123)');
        }

        console.log('\n=============================================================');
        console.log('🎉 TOÀN BỘ DỮ LIỆU ẢO TRÊN MONGODB ATLAS ĐÃ ĐƯỢC XÓA SẠCH!');
        console.log('🔑 TÀI KHOẢN ADMIN: Code = "admin" | Mật khẩu = "123"');
        console.log('=============================================================\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi khi dọn dẹp dữ liệu trên MongoDB Atlas:', err);
        process.exit(1);
    }
};

clearDummyData();
