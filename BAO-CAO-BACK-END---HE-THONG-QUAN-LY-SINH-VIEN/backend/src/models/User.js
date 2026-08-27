const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true }, // Mã SV / Mã GV / Mã Admin: SV001, GV001, AD001
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, default: '123456' },
    role: { 
        type: String, 
        enum: ['student', 'teacher', 'admin'], 
        default: 'student' 
    },
    gender: { type: String, enum: ['Nam', 'Nữ', 'Khác'], default: 'Nam' },
    dateOfBirth: { type: String },
    phone: { type: String },
    avatar: { type: String, default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' },
    department: { type: String, default: 'Công nghệ thông tin' }, // Khoa
    major: { type: String, default: 'Kỹ thuật phần mềm' },       // Ngành
    classCode: { type: String, default: 'K17-CNTT01' },           // Lớp sinh hoạt
    academicYear: { type: String, default: '2023-2027' },         // Khóa học
    status: { type: String, enum: ['Đang học', 'Tốt nghiệp', 'Bảo lưu', 'Đình chỉ', 'Đang công tác'], default: 'Đang học' },
    createdAt: { type: Date, default: Date.now }
});

// Mã hóa mật khẩu trước khi lưu
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Phương thức so sánh mật khẩu
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
