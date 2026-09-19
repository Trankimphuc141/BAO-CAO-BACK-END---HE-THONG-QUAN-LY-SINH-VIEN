const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    code: { type: String, required: true }, // Mã SV / Mã GV / Mã Admin
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, default: '123456' },
    plainPassword: { type: String, default: '123456' }, // Mật khẩu hiển thị cho Admin xem
    role: { 
        type: String, 
        enum: ['student', 'teacher', 'admin'], 
        default: 'student' 
    },
    gender: { type: String, enum: ['Nam', 'Nữ', 'Khác'], default: 'Nam' },
    dateOfBirth: { type: String },
    phone: {
        type: String,
        validate: {
            validator: function(v) {
                if (!v) return true;
                return /^0[0-9]{9}$/.test(v);
            },
            message: 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0'
        }
    },
    avatar: { type: String, default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' },
    department: { type: String, default: 'Công nghệ thông tin' },
    major: { type: String, default: 'Kỹ thuật phần mềm' },
    classCode: { type: String, default: 'K17-CNTT01' },
    academicYear: { type: String, default: '2023-2027' },
    status: { 
        type: String, 
        enum: [
            'Đang học', 'Tốt nghiệp', 'Đã tốt nghiệp', 'Bảo lưu', 'Bảo lưu hồ sơ', 
            'Đình chỉ', 'Tạm dừng học', 'Đang công tác', 'Đang làm', 'Nghỉ việc'
        ], 
        default: 'Đang học' 
    },
    createdAt: { type: Date, default: Date.now }
});

// Chỉ số duy nhất kết hợp giữa (Mã người dùng + Vai trò)
userSchema.index({ code: 1, role: 1 }, { unique: true });

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
