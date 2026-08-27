const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true }, // VD: IT101, IT202
    name: { type: String, required: true },
    credits: { type: Number, required: true, default: 3 }, // Số tín chỉ
    department: { type: String, default: 'Công nghệ thông tin' },
    description: { type: String, default: '' },
    tuitionFeePerCredit: { type: Number, default: 450000 }, // Học phí mỗi tín chỉ
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);
