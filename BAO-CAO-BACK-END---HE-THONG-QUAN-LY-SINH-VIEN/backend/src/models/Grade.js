const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    attendanceScore: { type: Number, min: 0, max: 10, default: 10 }, // Điểm chuyên cần (10%)
    midtermScore: { type: Number, min: 0, max: 10, default: 0 },    // Điểm giữa kỳ (30%)
    finalScore: { type: Number, min: 0, max: 10, default: 0 },      // Điểm cuối kỳ (60%)
    totalScore10: { type: Number, min: 0, max: 10, default: 0 },    // Điểm tổng hệ 10
    totalScore4: { type: Number, min: 0, max: 4, default: 0 },       // Điểm hệ 4
    letterGrade: { type: String, default: 'F' },                     // A, B+, B, C+, C, D+, D, F
    isPassed: { type: Boolean, default: false },
    semester: { type: String, default: 'HK1-2026-2027' },
    createdAt: { type: Date, default: Date.now }
});

// Tự động tính điểm tổng kết, điểm chữ và hệ 4
gradeSchema.pre('save', function() {
    const att = this.attendanceScore || 0;
    const mid = this.midtermScore || 0;
    const fin = this.finalScore || 0;
    
    this.totalScore10 = Number((att * 0.1 + mid * 0.3 + fin * 0.6).toFixed(2));
    
    if (this.totalScore10 >= 8.5) {
        this.letterGrade = 'A';
        this.totalScore4 = 4.0;
        this.isPassed = true;
    } else if (this.totalScore10 >= 8.0) {
        this.letterGrade = 'B+';
        this.totalScore4 = 3.5;
        this.isPassed = true;
    } else if (this.totalScore10 >= 7.0) {
        this.letterGrade = 'B';
        this.totalScore4 = 3.0;
        this.isPassed = true;
    } else if (this.totalScore10 >= 6.5) {
        this.letterGrade = 'C+';
        this.totalScore4 = 2.5;
        this.isPassed = true;
    } else if (this.totalScore10 >= 5.5) {
        this.letterGrade = 'C';
        this.totalScore4 = 2.0;
        this.isPassed = true;
    } else if (this.totalScore10 >= 5.0) {
        this.letterGrade = 'D+';
        this.totalScore4 = 1.5;
        this.isPassed = true;
    } else if (this.totalScore10 >= 4.0) {
        this.letterGrade = 'D';
        this.totalScore4 = 1.0;
        this.isPassed = true;
    } else {
        this.letterGrade = 'F';
        this.totalScore4 = 0.0;
        this.isPassed = false;
    }
});

module.exports = mongoose.model('Grade', gradeSchema);
