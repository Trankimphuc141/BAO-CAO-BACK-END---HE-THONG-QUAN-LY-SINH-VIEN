const mongoose = require('mongoose');

const surveyResponseSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    studentCode: { type: String, default: '' },
    studentName: { type: String, default: '' },
    // Điểm số sao từ 0 đến 5
    rating: { type: Number, min: 0, max: 5, default: 5 },
    // Khung nhập ý kiến đánh giá của sinh viên
    feedback: { type: String, default: '' },
    // Tương thích ngược với các trường cũ nếu có
    teachingMethodRating: { type: Number, default: 5 },
    knowledgeRating: { type: Number, default: 5 },
    punctualityRating: { type: Number, default: 5 },
    fairnessRating: { type: Number, default: 5 },
    overallRating: { type: Number, default: 5 },
    submittedAt: { type: Date, default: Date.now }
});

const surveySchema = new mongoose.Schema({
    title: { type: String, required: true },
    // Thông tin môn học
    courseCode: { type: String, default: '' },
    courseName: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', default: null },
    // Mã số sinh viên & Tên sinh viên được chỉ định (hoặc 'ALL' cho tất cả sinh viên)
    targetStudentCode: { type: String, default: 'ALL' },
    targetStudentName: { type: String, default: '' },
    targetStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Lựa chọn giảng viên
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teacherName: { type: String, default: '' },
    // Khung nhập yêu cầu/tiêu chí đánh giá của Admin
    evaluationPrompt: { type: String, default: '' },
    // Thang điểm đánh giá từ 0 đến 5 sao
    minRating: { type: Number, default: 0 },
    maxRating: { type: Number, default: 5 },
    semester: { type: String, default: 'HK1-2026-2027' },
    isOpen: { type: Boolean, default: true },
    responses: [surveyResponseSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Survey', surveySchema);
