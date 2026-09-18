require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

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

const clearDummyData = async () => {
    try {
        await connectDB();
        console.log('Clearing all dummy data...');

        const userRes = await User.deleteMany({ code: { $ne: 'admin' } });
        console.log('Deleted dummy users count:', userRes.deletedCount);

        await Promise.all([
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
            Notification.deleteMany({})
        ]);

        // Ensure admin user has plainPassword: '123'
        await User.updateOne({ code: 'admin' }, { $set: { plainPassword: '123' } });

        const remaining = await User.find({});
        console.log('Remaining users:', remaining.map(u => ({
            code: u.code,
            name: u.name,
            role: u.role,
            plainPassword: u.plainPassword
        })));
        console.log('=== TOÀN BỘ DỮ LIỆU ẢO ĐÃ ĐƯỢC XÓA SẠCH! CHỈ GIỮ LẠI TÀI KHOẢN ADMIN ===');
        process.exit(0);
    } catch (err) {
        console.error('Lỗi khi xóa dữ liệu ảo:', err);
        process.exit(1);
    }
};

clearDummyData();
