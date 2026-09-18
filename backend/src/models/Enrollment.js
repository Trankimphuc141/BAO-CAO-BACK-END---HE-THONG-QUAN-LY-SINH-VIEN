const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    semester: { type: String, default: 'HK1-2026-2027' },
    status: { 
        type: String, 
        enum: ['registered', 'dropped'], 
        default: 'registered' 
    },
    registeredAt: { type: Date, default: Date.now },
    droppedAt: { type: Date }
});

// Mỗi sinh viên chỉ có 1 bản ghi với 1 lớp học phần
enrollmentSchema.index({ student: 1, classSection: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
