const mongoose = require('mongoose');

const surveyResponseSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // có thể null nếu hoàn toàn ẩn danh
    teachingMethodRating: { type: Number, min: 1, max: 5, required: true }, // Phương pháp giảng dạy (1-5 sao)
    knowledgeRating: { type: Number, min: 1, max: 5, required: true },      // Kiến thức chuyên môn (1-5 sao)
    punctualityRating: { type: Number, min: 1, max: 5, required: true },    // Tác phong và đúng giờ (1-5 sao)
    fairnessRating: { type: Number, min: 1, max: 5, required: true },       // Tính công bằng trong chấm điểm (1-5 sao)
    overallRating: { type: Number, min: 1, max: 5, required: true },        // Đánh giá chung
    feedback: { type: String, default: '' },                                // Ý kiến đóng góp
    submittedAt: { type: Date, default: Date.now }
});

const surveySchema = new mongoose.Schema({
    title: { type: String, required: true },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    semester: { type: String, default: 'HK1-2026-2027' },
    isOpen: { type: Boolean, default: true },
    responses: [surveyResponseSchema],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Survey', surveySchema);
