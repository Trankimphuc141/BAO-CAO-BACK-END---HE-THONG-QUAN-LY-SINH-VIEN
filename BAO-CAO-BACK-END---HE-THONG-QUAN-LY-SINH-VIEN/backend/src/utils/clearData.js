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

const clearAllData = async () => {
    try {
        console.log('Đang kết nối MongoDB để xóa toàn bộ dữ liệu...');
        await connectDB();

        console.log('Đang tiến hành xóa sạch dữ liệu của tất cả các bảng...');
        await Promise.all([
            User.deleteMany({}),
            Course.deleteMany({}),
            ClassSection.deleteMany({}),
            Attendance.deleteMany({}),
            Grade.deleteMany({}),
            ExamSchedule.deleteMany({}),
            Survey.deleteMany({}),
            Submission.deleteMany({}),
            Internship.deleteMany({}),
            Thesis.deleteMany({}),
            Announcement.deleteMany({})
        ]);

        console.log('=== ĐÃ XÓA TOÀN BỘ DỮ LIỆU THÀNH CÔNG! HỆ THỐNG TRỐNG HOÀN TOÀN ===');
        process.exit(0);
    } catch (err) {
        console.error('Lỗi khi xóa dữ liệu:', err);
        process.exit(1);
    }
};

clearAllData();
