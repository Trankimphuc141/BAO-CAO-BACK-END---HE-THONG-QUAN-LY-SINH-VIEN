const User = require('../models/User');

// Map frontend filter status keys to DB values
const STATUS_MAP = {
    'active': 'Đang học',
    'graduated': 'Đã tốt nghiệp',
    'suspended': 'Tạm dừng học',
    'on_leave': 'Bảo lưu hồ sơ',
    'working': 'Đang làm',
    'resigned': 'Nghỉ việc'
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
        const targetRole = role || 'student';

        const existingCode = await User.findOne({
            code: cleanCode,
            role: targetRole
        });

        if (existingCode) {
            const roleLabel = targetRole === 'teacher' ? 'Giảng viên' : targetRole === 'admin' ? 'Quản trị viên' : 'Sinh viên';
            return res.status(400).json({
                success: false,
                message: `Mã ${cleanCode} đã tồn tại trong danh sách ${roleLabel}`
            });
        }

        const existingEmail = await User.findOne({ email: cleanEmail });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: `Email ${cleanEmail} đã được sử dụng bởi tài khoản khác`
            });
        }

        if (phone && !/^0[0-9]{9}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0 (VD: 0912345678)'
            });
        }

        const defaultStatus = (targetRole === 'teacher') ? 'Đang làm' : 'Đang học';
        const mappedStatus = STATUS_MAP[status] || status || defaultStatus;
        const rawPass = (password || '123456').trim();

        const user = await User.create({
            code: cleanCode,
            name: name.trim(),
            email: cleanEmail,
            password: rawPass,
            plainPassword: rawPass,
            role: targetRole,
            gender: gender || 'Nam',
            dateOfBirth: dateOfBirth || '',
            phone: phone || '',
            department: department || 'Công nghệ thông tin',
            major: major || (targetRole === 'student' ? 'Kỹ thuật phần mềm' : undefined),
            classCode: classCode || (targetRole === 'student' ? 'K17-CNTT01' : undefined),
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
        const existingUser = await User.findById(req.params.id);
        if (!existingUser) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        const updateData = { ...req.body };

        if (updateData.code) {
            const cleanCode = updateData.code.trim().toUpperCase();
            const targetRole = updateData.role || existingUser.role;
            const duplicateCode = await User.findOne({
                code: cleanCode,
                role: targetRole,
                _id: { $ne: req.params.id }
            });
            if (duplicateCode) {
                return res.status(400).json({
                    success: false,
                    message: `Mã ${cleanCode} đã tồn tại trong danh sách ${targetRole === 'teacher' ? 'Giảng viên' : 'Sinh viên'}`
                });
            }
            existingUser.code = cleanCode;
        }

        if (updateData.email) {
            const cleanEmail = updateData.email.trim().toLowerCase();
            const duplicateEmail = await User.findOne({
                email: cleanEmail,
                _id: { $ne: req.params.id }
            });
            if (duplicateEmail) {
                return res.status(400).json({
                    success: false,
                    message: `Email ${cleanEmail} đã được sử dụng bởi tài khoản khác`
                });
            }
            existingUser.email = cleanEmail;
        }

        if (updateData.phone && !/^0[0-9]{9}$/.test(updateData.phone)) {
            return res.status(400).json({
                success: false,
                message: 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0'
            });
        }
        if (updateData.phone !== undefined) existingUser.phone = updateData.phone;

        if (updateData.password && updateData.password.trim()) {
            const rawPass = updateData.password.trim();
            existingUser.password = rawPass; // Hash via pre-save
            existingUser.plainPassword = rawPass;
        }

        if (updateData.name) existingUser.name = updateData.name.trim();
        if (updateData.gender) existingUser.gender = updateData.gender;
        if (updateData.dateOfBirth !== undefined) existingUser.dateOfBirth = updateData.dateOfBirth;
        if (updateData.department) existingUser.department = updateData.department;
        if (updateData.major) existingUser.major = updateData.major;
        if (updateData.classCode) existingUser.classCode = updateData.classCode;
        if (updateData.academicYear) existingUser.academicYear = updateData.academicYear;
        if (updateData.status) {
            existingUser.status = STATUS_MAP[updateData.status] || updateData.status;
        }

        await existingUser.save();

        const userObj = existingUser.toObject();
        delete userObj.password;
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

        if (user.code === 'admin' || user.role === 'admin') {
            return res.status(403).json({ success: false, message: 'Không thể xóa tài khoản Quản trị viên hệ thống' });
        }

        await User.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: `Đã xóa tài khoản ${user.name} (${user.code})`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
