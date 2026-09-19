require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const dns = require('dns');
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');

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

const clearDatabase = async (uri, name) => {
    try {
        console.log(`\n⚡ Đang kết nối tới ${name}...`);
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 6000 });
        console.log(`✅ Kết nối thành công tới ${name}!`);
        console.log(`🧹 Đang xóa sạch dữ liệu ảo trên ${name}...`);

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

        // Đảm bảo có tài khoản Admin chuẩn duy nhất
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('123', 10);
        let adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            adminUser = await User.create({
                code: 'admin',
                name: 'Quản Trị Viên Hệ Thống',
                email: 'admin@university.edu.vn',
                password: hashedPassword,
                plainPassword: '123',
                role: 'admin',
                department: 'Phòng Đào Tạo',
                status: 'Đang công tác'
            });
            console.log('✅ Đã tạo tài khoản Admin chuẩn (admin / 123)');
        } else {
            await User.updateOne(
                { _id: adminUser._id },
                { 
                    $set: { 
                        code: 'admin', 
                        password: hashedPassword, 
                        plainPassword: '123',
                        role: 'admin',
                        status: 'Đang công tác'
                    } 
                }
            );
            console.log('✅ Đã giữ lại & chuẩn hóa tài khoản Admin (admin / 123)');
        }

        console.log(`🎉 Đã xóa sạch toàn bộ dữ liệu giả trên ${name}!`);
        await mongoose.disconnect();
    } catch (err) {
        console.warn(`⚠️ Không thể thao tác với ${name} (${err.message}). Bỏ qua.`);
    }
};

const run = async () => {
    const cloudUri = process.env.MONGODB_URI || 'mongodb+srv://TranPhamKimPhuc:Phuc123@cluster0.me3zblq.mongodb.net/student_db?retryWrites=true&w=majority';
    const localUri = 'mongodb://127.0.0.1:27017/student_db';

    // 1. Dọn dẹp Cloud Atlas
    await clearDatabase(cloudUri, 'MongoDB Atlas Cloud');

    // 2. Dọn dẹp Local MongoDB (nếu có)
    await clearDatabase(localUri, 'MongoDB Local (27017)');

    console.log('\n=============================================================');
    console.log('🎉 TOÀN BỘ DỮ LIỆU GIẢ / ẢO ĐÃ ĐƯỢC XÓA SẠCH HOÀN TOÀN!');
    console.log('🔑 TÀI KHOẢN ADMIN: Code = "admin" | Mật khẩu = "123"');
    console.log('📌 Hệ thống đang ở trạng thái sạch 100%, sẵn sàng nhập dữ liệu thật.');
    console.log('=============================================================\n');

    process.exit(0);
};

run();
