const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Tạo token JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, code: user.code, name: user.name, role: user.role, email: user.email },
        process.env.JWT_SECRET || 'SECRET_KEY',
        { expiresIn: '7d' }
    );
};

// 1. Đăng ký tài khoản Sinh viên
exports.register = async (req, res) => {
    try {
        const { code, name, email, password, department, major, classCode, phone } = req.body;

        if (!code || !name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp đầy đủ: Mã sinh viên, Họ tên, Email và Mật khẩu' 
            });
        }

        const formattedCode = code.trim().toUpperCase();
        const formattedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            $or: [{ code: formattedCode }, { email: formattedEmail }]
        });

        if (existingUser) {
            if (existingUser.code === formattedCode) {
                return res.status(409).json({ success: false, message: 'Mã sinh viên này đã được đăng ký trên hệ thống' });
            }
            return res.status(409).json({ success: false, message: 'Địa chỉ Email này đã được sử dụng' });
        }

        const newStudent = await User.create({
            code: formattedCode,
            name: name.trim(),
            email: formattedEmail,
            password: password.trim(),
            role: 'student',
            department: department || 'Công nghệ thông tin',
            major: major || 'Kỹ thuật phần mềm',
            classCode: classCode || 'K17-CNTT01',
            phone: phone || '',
            academicYear: '2023-2027',
            status: 'Đang học',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
        });

        const token = generateToken(newStudent);

        return res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản Sinh viên thành công!',
            token,
            user: {
                id: newStudent._id,
                code: newStudent.code,
                name: newStudent.name,
                email: newStudent.email,
                role: newStudent.role,
                department: newStudent.department,
                major: newStudent.major,
                classCode: newStudent.classCode,
                avatar: newStudent.avatar
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký', error: err.message });
    }
};

// 2. Đăng nhập
exports.login = async (req, res) => {
    try {
        const { code, password } = req.body;
        if (!code || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp Mã sinh viên và Mật khẩu' });
        }

        const user = await User.findOne({ code: code.trim().toUpperCase() });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Mã sinh viên không tồn tại trong hệ thống' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác' });
        }

        const token = generateToken(user);
        return res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công',
            token,
            user: {
                id: user._id,
                code: user.code,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                major: user.major,
                classCode: user.classCode,
                avatar: user.avatar
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập', error: err.message });
    }
};

// 3. Lấy thông tin tài khoản hiện tại
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin tài khoản' });
        }
        return res.status(200).json({ success: true, user });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server', error: err.message });
    }
};

// 4. Cập nhật ảnh đại diện từ máy tính (Avatar Upload)
exports.updateAvatar = async (req, res) => {
    try {
        const { avatar, studentId } = req.body;
        const targetId = studentId || (req.user ? req.user.id : null);

        if (!targetId || !avatar) {
            return res.status(400).json({ success: false, message: 'Thiếu dữ liệu ảnh đại diện hoặc mã sinh viên' });
        }

        const user = await User.findByIdAndUpdate(targetId, { avatar }, { new: true }).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản sinh viên' });
        }

        return res.status(200).json({
            success: true,
            message: 'Cập nhật ảnh đại diện thành công!',
            avatar: user.avatar,
            user
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 5. Cập nhật thông tin cá nhân
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, phone, gender, dateOfBirth } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
        }

        if (name) user.name = name.trim();
        if (email) user.email = email.trim().toLowerCase();
        if (phone !== undefined) user.phone = phone.trim();
        if (gender !== undefined) user.gender = gender;
        if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;

        await user.save();
        user.password = undefined;

        return res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin cá nhân thành công!',
            user
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật thông tin', error: err.message });
    }
};
