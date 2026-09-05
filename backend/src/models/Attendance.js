const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { 
        type: String, 
        enum: ['present', 'late', 'excused_absent', 'unexcused_absent'], 
        default: 'present' 
    },
    note: { type: String, default: '' }
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', required: true },
    sessionNumber: { type: Number, required: true }, // Buổi số 1, 2, ... 15
    date: { type: String, required: true }, // YYYY-MM-DD
    records: [attendanceRecordSchema],
    takenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    qrToken: { type: String, default: null },
    qrExpiresAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
