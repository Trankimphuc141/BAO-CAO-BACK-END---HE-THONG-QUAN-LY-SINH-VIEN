const mongoose = require('mongoose');

const classSectionSchema = new mongoose.Schema({
    sectionCode: { type: String, required: true, unique: true }, // VD: LHP_IT101_01
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    semester: { type: String, default: 'HK1-2026-2027' },
    academicYear: { type: String, default: '2026-2027' },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    maxStudents: { type: Number, default: 50 },
    room: { type: String, default: 'A201' },
    dayOfWeek: { type: Number, default: 2 }, // 2: Thứ 2, 3: Thứ 3, ..., 7: Thứ 7, 8: CN
    shift: { type: String, default: 'Ca 1 (07:00 - 09:30)' }, // Ca học
    startPeriod: { type: Number, default: 1 },
    endPeriod: { type: Number, default: 3 },
    totalLessons: { type: Number, default: 15 }, // Tổng số buổi học
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ClassSection', classSectionSchema);
