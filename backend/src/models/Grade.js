const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    sessionScores: { 
        type: [Number], 
        default: () => [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10] 
    }, // Điểm danh 15 buổi học hằng ngày (0 - 10)
    attendanceScore: { type: Number, min: 0, max: 10, default: 10 }, // Điểm chuyên cần tổng kết (10%)
    midtermScore: { type: Number, min: 0, max: 10, default: 0 },    // Điểm giữa kỳ (30%)
    finalScore: { type: Number, min: 0, max: 10, default: 0 },      // Điểm cuối kỳ (60%)
    totalScore10: { type: Number, min: 0, max: 10, default: 0 },    // Điểm tổng hệ 10
    totalScore4: { type: Number, min: 0, max: 4, default: 0 },       // Điểm hệ 4
    letterGrade: { type: String, default: 'F' },                     // A, B+, B, C+, C, D+, D, F
    isPassed: { type: Boolean, default: false },
    semester: { type: String, default: 'HK1-2026-2027' },
    teacherComment: { type: String, default: '' },                   // Nhận xét của giảng viên
    submissionStatus: {
        type: String,
        enum: ['draft', 'submitted', 'published', 're_submitted'],
        default: 'draft'
    }, // Trạng thái gửi điểm: draft (GV đang nhập), submitted (đã gửi Admin), published (Admin đã công bố), re_submitted (GV đã sửa phúc khảo & gửi lại)
    submittedAt: { type: Date, default: null },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isPublished: { type: Boolean, default: false },                  // Điểm đã được Admin công bố chính thức cho SV và GV
    publishedAt: { type: Date, default: null },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isLocked: { type: Boolean, default: false },                     // Khóa đối với giảng viên
    lockedAt: { type: Date, default: null },
    unlockStatus: {
        type: String,
        enum: ['locked', 'requested_unlock', 'unlocked_for_edit'],
        default: 'locked'
    }, // Trạng thái mở khóa phúc khảo
    unlockRequestedReason: { type: String, default: '' },
    unlockRequestedAt: { type: Date, default: null },
    adminComment: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    isBannedFromExam: { type: Boolean, default: false },             // Bị cấm thi do vắng > 30% tổng số buổi (>= 5 buổi)
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

    // Nếu bị cấm thi (vắng > 30% = từ 5 buổi trở lên), xếp loại F và không đạt
    if (this.isBannedFromExam) {
        this.letterGrade = 'F';
        this.totalScore4 = 0.0;
        this.isPassed = false;
    }
});

module.exports = mongoose.model('Grade', gradeSchema);
