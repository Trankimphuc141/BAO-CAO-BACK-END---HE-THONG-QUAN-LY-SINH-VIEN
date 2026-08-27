const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyName: { type: String, required: true },
    position: { type: String, required: true }, // Vị trí: Backend Intern, Frontend Dev, AI Intern...
    mentorName: { type: String, default: '' },   // Người hướng dẫn tại doanh nghiệp
    mentorEmail: { type: String, default: '' },
    academicAdvisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Giảng viên phụ trách trường
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    salary: { type: String, default: 'Thỏa thuận' },
    status: { 
        type: String, 
        enum: ['Đang nộp hồ sơ', 'Được tiếp nhận', 'Đang thực tập', 'Đã nộp báo cáo', 'Đã hoàn thành', 'Không đạt'], 
        default: 'Đang thực tập' 
    },
    companyEvaluationScore: { type: Number, min: 0, max: 10, default: null }, // Điểm DN đánh giá
    advisorScore: { type: Number, min: 0, max: 10, default: null },           // Điểm GV chấm
    finalGrade: { type: Number, min: 0, max: 10, default: null },
    reportFileUrl: { type: String, default: '' },
    feedback: { type: String, default: '' },
    isEmployedAfterInternship: { type: Boolean, default: false }, // Có nhận offer chính thức không
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Internship', internshipSchema);
