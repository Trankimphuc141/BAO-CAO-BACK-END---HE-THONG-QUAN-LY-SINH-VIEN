require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const backupDatabase = require('./backupDatabase');

// Models
const User = require('../src/models/User');
const Course = require('../src/models/Course');
const ClassSection = require('../src/models/ClassSection');
const Attendance = require('../src/models/Attendance');
const Grade = require('../src/models/Grade');
const GradeAppeal = require('../src/models/GradeAppeal');
const ExamSchedule = require('../src/models/ExamSchedule');
const Survey = require('../src/models/Survey');
const Submission = require('../src/models/Submission');
const Internship = require('../src/models/Internship');
const Thesis = require('../src/models/Thesis');
const Announcement = require('../src/models/Announcement');
const Note = require('../src/models/Note');
const Notification = require('../src/models/Notification');
const Major = require('../src/models/Major');
const Curriculum = require('../src/models/Curriculum');
const Enrollment = require('../src/models/Enrollment');

async function safeCleanDatabase() {
    try {
        console.log('====================================================');
        console.log('🛡️  QUY TRÌNH DỌN DẸP DATABASE AN TOÀN (SAFE CLEAN)  ');
        console.log('====================================================');

        // BƯỚC 1: TỰ ĐỘNG SAO LƯU TRƯỚC TIÊN
        console.log('👉 BƯỚC 1: Tự động sao lưu toàn bộ dữ liệu hiện tại...');
        const backupPath = await backupDatabase();

        console.log('👉 BƯỚC 2: Kiểm tra tham số dọn dẹp...');
        const isFullReset = process.argv.includes('--full-reset');
        const isMockOnly = process.argv.includes('--mock-only') || !isFullReset;

        if (isMockOnly) {
            console.log('🧹 Chế độ: DỌN DẸP DỮ LIỆU GIẢ/MẪU (MOCK DATA ONLY)');
            console.log('   (Bảo vệ tài khoản quản trị viên, người dùng thật và các đồ án thực tế)\n');

            // Xóa các tài khoản demo sinh viên tạo tự động từ seed: SV001 - SV020 hoặc email student.edu.vn
            const mockUserFilter = {
                $or: [
                    { code: /^SV0[0-2][0-9]$/ },
                    { email: /@student\.edu\.vn$/ },
                    { email: /@school\.edu\.vn$/ }
                ],
                role: { $ne: 'admin' }
            };

            const deletedUsers = await User.deleteMany(mockUserFilter);
            console.log(`  - Đã dọn dẹp ${deletedUsers.deletedCount} tài khoản demo/ảo.`);

            // Dọn dẹp các thông báo mẫu
            const deletedAnnouncements = await Announcement.deleteMany({ title: /\[Mẫu\]|\[Demo\]/i });
            console.log(`  - Đã dọn dẹp ${deletedAnnouncements.deletedCount} thông báo mẫu.`);

            console.log('\n✅ DỌN DẸP DỮ LIỆU MẪU THÀNH CÔNG! Dữ liệu thật được giữ nguyên vẹn 100%.');
        } else {
            console.log('⚠️  CẢNH BÁO: Bạn đang chọn chế độ --full-reset');
            console.log('   Đang làm sạch tất cả dữ liệu kiểm thử (Bảo toàn duy nhất tài khoản Admin)...\n');

            await Promise.all([
                User.deleteMany({ role: { $ne: 'admin' } }),
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

            // Đảm bảo Admin luôn tồn tại
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
                console.log('  - Đã khởi tạo lại tài khoản Admin mặc định.');
            }

            console.log('\n✅ LÀM SẠCH HOÀN TẤT! Snapshot lưu tại:', backupPath);
        }

        console.log('====================================================\n');
        process.exit(0);
    } catch (err) {
        console.error('❌ Lỗi khi dọn dẹp database:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    safeCleanDatabase();
}

module.exports = safeCleanDatabase;
