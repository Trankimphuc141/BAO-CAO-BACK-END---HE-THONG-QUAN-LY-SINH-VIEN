const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['Học vụ', 'Khảo thí & Lịch thi', 'Học bổng & Khen thưởng', 'Thực tập & Việc làm', 'Khóa luận'], 
        default: 'Học vụ' 
    },
    content: { type: String, required: true },
    author: { type: String, default: 'Phòng Đào tạo & Quản lý sinh viên' },
    isPinned: { type: Boolean, default: false },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', announcementSchema);
