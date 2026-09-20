const mongoose = require('mongoose');

const fileItemSchema = new mongoose.Schema({
    fileName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    fileUrl: { type: String, default: '' },
    driveFileId: { type: String, default: '' },
    driveWebViewLink: { type: String, default: '' },
    driveWebContentLink: { type: String, default: '' },
    localFilePath: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now }
}, { _id: false });

const milestoneSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Đề cương, Báo cáo giữa kỳ, Nộp bản cuối, Bảo vệ hội đồng
    deadline: { type: String, default: '' },
    status: { type: String, enum: ['Chưa nộp', 'Đã nộp', 'Đã duyệt', 'Yêu cầu sửa'], default: 'Chưa nộp' },
    score: { type: Number, min: 0, max: 10, default: null },
    comment: { type: String, default: '' },
    studentNote: { type: String, default: '' },
    note: { type: String, default: '' },
    files: [fileItemSchema],
    submittedFileName: { type: String, default: '' },
    submittedFileSize: { type: Number, default: 0 },
    submittedFileUrl: { type: String, default: '' },
    driveFileId: { type: String, default: '' },
    driveWebViewLink: { type: String, default: '' },
    driveWebContentLink: { type: String, default: '' },
    localFilePath: { type: String, default: '' },
    submittedAt: { type: Date }
}, { _id: false });

const thesisSchema = new mongoose.Schema({
    topicCode: { type: String, required: true, unique: true }, // DA_2026_001
    topicTitle: { type: String, required: true },
    description: { type: String, default: '' },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    advisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // GVHD
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },                // GV Phản biện
    committee: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],            // Hội đồng bảo vệ
    academicYear: { type: String, default: '2026-2027' },
    status: { 
        type: String, 
        enum: ['Chờ duyệt đề tài', 'Đã duyệt đề tài', 'Đang thực hiện', 'Đã nộp phản biện', 'Đủ điều kiện bảo vệ', 'Đã bảo vệ', 'Không đạt'], 
        default: 'Đang thực hiện' 
    },
    milestones: [milestoneSchema],
    files: [fileItemSchema],
    submittedFileName: { type: String, default: '' },
    submittedFileSize: { type: Number, default: 0 },
    submittedFileUrl: { type: String, default: '' },
    driveFileId: { type: String, default: '' },
    driveWebViewLink: { type: String, default: '' },
    driveWebContentLink: { type: String, default: '' },
    localFilePath: { type: String, default: '' },
    submittedAt: { type: Date },
    similarityPercentage: { type: Number, default: 0 }, // % trùng lặp kiểm tra chống đạo văn
    advisorScore: { type: Number, min: 0, max: 10, default: null },
    reviewerScore: { type: Number, min: 0, max: 10, default: null },
    committeeScore: { type: Number, min: 0, max: 10, default: null },
    finalScore: { type: Number, min: 0, max: 10, default: null },
    defenseDate: { type: String, default: '' },
    defenseRoom: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Thesis', thesisSchema);
