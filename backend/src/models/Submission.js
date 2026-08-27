const mongoose = require('mongoose');

const matchResultSchema = new mongoose.Schema({
    matchedWithSubmission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
    matchedStudentName: { type: String },
    similarityPercentage: { type: Number }, // % tương đồng
    matchedKeywords: [{ type: String }],
    isExactHashMatch: { type: Boolean, default: false }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    assignmentType: { 
        type: String, 
        enum: ['Bài tập lớn', 'Báo cáo thực tập', 'Đồ án môn học', 'Khóa luận tốt nghiệp'], 
        default: 'Bài tập lớn' 
    },
    fileName: { type: String, required: true },
    fileHash: { type: String, required: true }, // SHA-256 Hash
    contentSummary: { type: String, required: true }, // Trích đoạn nội dung phân tích
    wordCount: { type: Number, default: 0 },
    maxSimilarityPercentage: { type: Number, default: 0 }, // Điểm trùng lặp cao nhất
    fraudAlertLevel: { 
        type: String, 
        enum: ['An toàn', 'Cảnh báo nhẹ', 'Nghi vấn đạo văn', 'Gian lận nghiêm trọng'], 
        default: 'An toàn' 
    },
    matches: [matchResultSchema],
    submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', submissionSchema);
