const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['student', 'teacher', 'admin'], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, { _id: true });

const gradeAppealSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    grade: { type: mongoose.Schema.Types.ObjectId, ref: 'Grade', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Loại điểm phúc khảo
    scoreType: { type: String, enum: ['midterm', 'final', 'attendance'], default: 'final' },
    oldScore: { type: Number, required: true },
    proposedScore: { type: Number, default: null }, // Điểm GV đề xuất sau khi chấm lại
    newScore: { type: Number, default: null },      // Điểm sau khi Admin công bố
    
    reason: { type: String, required: true },       // Lý do SV xin phúc khảo
    studentNote: { type: String, default: '' },
    
    // Thread hội thoại (SV <-> GV) — mỗi tin nhắn có sender, role, content
    messages: { type: [messageSchema], default: [] },
    
    teacherFeedback: { type: String, default: '' }, // Ý kiến phản hồi cuối của GV (legacy)
    teacherUnlockRequestReason: { type: String, default: '' }, // Lý do GV xin Admin mở khóa
    
    adminComment: { type: String, default: '' },
    
    status: {
        type: String,
        enum: [
            'pending_teacher',         // SV vừa nộp, chờ GV xử lý
            'teacher_replied',         // GV đã trả lời SV trong hội thoại
            'teacher_rejected',        // GV từ chối phúc khảo (giữ nguyên điểm)
            'teacher_request_unlock',  // GV đồng ý chấm lại và gửi yêu cầu xin Admin mở bảng điểm
            'admin_unlocked',          // Admin đã duyệt mở bảng điểm cho GV
            'teacher_re_submitted',    // GV đã sửa điểm và gửi lại cho Admin
            'admin_approved_published' // Admin đã chốt và công bố điểm mới
        ],
        default: 'pending_teacher'
    },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date, default: null }
});

module.exports = mongoose.model('GradeAppeal', gradeAppealSchema);

