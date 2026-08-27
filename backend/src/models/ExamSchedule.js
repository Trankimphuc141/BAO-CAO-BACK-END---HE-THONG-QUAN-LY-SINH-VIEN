const mongoose = require('mongoose');

const examScheduleSchema = new mongoose.Schema({
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection' },
    examDate: { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // VD: "07:30"
    endTime: { type: String, required: true },   // VD: "09:00"
    room: { type: String, required: true },      // VD: "P301"
    examType: { type: String, enum: ['Giữa kỳ', 'Cuối kỳ', 'Vấn đáp', 'Thực hành'], default: 'Cuối kỳ' },
    format: { type: String, enum: ['Tự luận', 'Trắc nghiệm', 'Thực hành máy tính', 'Bảo vệ'], default: 'Tự luận' },
    proctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Giám thị coi thi
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    maxCapacity: { type: Number, default: 40 },
    semester: { type: String, default: 'HK1-2026-2027' },
    status: { type: String, enum: ['Đã lên lịch', 'Đang thi', 'Đã hoàn thành', 'Đã hủy'], default: 'Đã lên lịch' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ExamSchedule', examScheduleSchema);
