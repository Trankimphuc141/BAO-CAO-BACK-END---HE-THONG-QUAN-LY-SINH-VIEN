const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: {
        type: String,
        enum: ['grade_published', 'grade_locked', 'attendance', 'assignment', 'announcement', 'request_response', 'system'],
        default: 'system'
    },
    title: { type: String, required: true },
    content: { type: String, required: true },
    link: { type: String, default: '' }, // Đường dẫn khi click vào thông báo
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    classSection: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSection', default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
