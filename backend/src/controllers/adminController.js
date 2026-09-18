const User = require('../models/User');

// Map frontend filter status keys to DB values
const STATUS_MAP = {
    'active': 'Đang học',
    'graduated': 'Tốt nghiệp',
    'suspended': 'Đình chỉ',
    'on_leave': 'Bảo lưu',
    'working': 'Đang công tác'
};

// GET /api/admin/users
exports.getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const search = (req.query.search || '').trim();
        const role = req.query.role; // 'student' | 'teacher' | 'admin'
        const status = req.query.status;

        const query = {};
        if (role) {
            query.role = role;
        }

        if (status) {
            const mapped = STATUS_MAP[status] || status;
            query.status = mapped;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' } },
                { major: { $regex: search, $options: 'i' } },
                { classCode: { $regex: search, $options: 'i' } }
            ];
        }

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-password')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        // Map classCode to class and guarantee plainPassword for admin viewing
        const mappedUsers = users.map(u => {
            const obj = u.toObject();
            obj.class = obj.classCode || '';
            obj.plainPassword = obj.plainPassword || (obj.code === 'admin' ? '123' : '123456');
            return obj;
        });

        res.json({
            success: true,
            data: mappedUsers,
            users: mappedUsers,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/admin/users/:id
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }
        const userObj = user.toObject();
        userObj.class = userObj.classCode || '';
        userObj.plainPassword = userObj.plainPassword || (userObj.code === 'admin' ? '123' : '123456');
        res.json({ success: true, data: userObj });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// POST /api/admin/users
exports.createUser = async (req, res) => {
    try {
        const {
            code, name, email, password, role,
            gender, dateOfBirth, phone, department, major,
            classCode, academicYear, status
        } = req.body;

        if (!code || !name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng điền đầy đủ Mã, Họ tên và Email'
            });
        }

        const cleanCode = code.trim().toUpperCase();
        const cleanEmail = email.trim().toLowerCase();

        // Check duplicates
        const existing = await User.findOne({
            $or: [{ code: cleanCode }, { email: cleanEmail }]
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: existing.code === cleanCode
                    ? `Mã ${cleanCode} đã tồn tại trong hệ thống`
                    : `Email ${cleanEmail} đã được sử dụng`
            });
        }

        if (phone && !/^0[0-9]{9}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0 (VD: 0912345678)'
            });
        }

        const defaultStatus = (role === 'teacher') ? 'Đang công tác' : 'Đang học';
        const mappedStatus = STATUS_MAP[status] || status || defaultStatus;
        const rawPass = (password || '123456').trim();

        const user = await User.create({
            code: cleanCode,
            name: name.trim(),
            email: cleanEmail,
            password: rawPass,
            plainPassword: rawPass,
            role: role || 'student',
            gender: gender || 'Nam',
            dateOfBirth: dateOfBirth || '',
            phone: phone || '',
            department: department || (role === 'teacher' ? 'Công nghệ thông tin' : 'Công nghệ thông tin'),
            major: major || (role === 'student' ? 'Kỹ thuật phần mềm' : undefined),
            classCode: classCode || (role === 'student' ? 'K17-CNTT01' : undefined),
            academicYear: academicYear || '2023-2027',
            status: mappedStatus
        });

        const userObj = user.toObject();
        delete userObj.password;
        userObj.class = userObj.classCode || '';
        userObj.plainPassword = rawPass;

        res.status(201).json({
            success: true,
            data: userObj,
            message: 'Thêm mới thành công'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// PUT /api/admin/users/:id
exports.updateUser = async (req, res) => {
    try {
        const updateData = { ...req.body };
        delete updateData.password; // Don't update password directly through this endpoint

        if (updateData.code) updateData.code = updateData.code.trim().toUpperCase();
        if (updateData.email) updateData.email = updateData.email.trim().toLowerCase();

        if (updateData.phone && !/^0[0-9]{9}$/.test(updateData.phone)) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0'
            });
        }

        if (updateData.status && STATUS_MAP[updateData.status]) {
            updateData.status = STATUS_MAP[updateData.status];
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        const userObj = user.toObject();
        userObj.class = userObj.classCode || '';

        res.json({
            success: true,
            data: userObj,
            message: 'Cập nhật thành công'
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        // Prevent admin from deleting themselves
        if (user.role === 'admin' && req.user && user._id.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa tài khoản admin đang đăng nhập hiện tại'
            });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({
            success: true,
            message: `Đã xóa ${user.role === 'teacher' ? 'giảng viên' : 'sinh viên'} ${user.name} (${user.code}) thành công`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
