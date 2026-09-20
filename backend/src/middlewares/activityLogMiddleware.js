/**
 * Middleware tự động ghi Activity Log dựa trên HTTP method và route path.
 * Chỉ ghi nhận các thao tác thực tế (POST, PUT, PATCH, DELETE),
 * tuyệt đối không ghi nhận GET requests hoặc truy vấn xem danh sách.
 */
const jwt = require('jsonwebtoken');
const { logActivity } = require('../controllers/activityLogController');

// Map method + path pattern → action, module, desc
const routeRules = [
    // ════════════════════════════════════════════════════════
    // 1. Xác thực & Đăng nhập
    // ════════════════════════════════════════════════════════
    { method: 'POST', pattern: /\/auth\/login/, action: 'LOGIN', module: 'auth', desc: (b) => `Đăng nhập hệ thống: ${b?.code || b?.email || ''}` },
    { method: 'POST', pattern: /\/auth\/register/, action: 'CREATE', module: 'auth', desc: (b) => `Đăng ký tài khoản: ${b?.code || ''} (${b?.name || ''})` },
    { method: 'POST', pattern: /\/auth\/logout/, action: 'LOGOUT', module: 'auth', desc: () => `Đăng xuất khỏi hệ thống` },

    // ════════════════════════════════════════════════════════
    // 2. Admin - Quản lý người dùng (Sinh viên, Giảng viên)
    // ════════════════════════════════════════════════════════
    { method: 'POST',   pattern: /\/admin\/users/, action: 'CREATE', module: 'users', desc: (b) => `Thêm người dùng mới: ${b?.name || ''} (${b?.code || ''}) - Vai trò: ${b?.role || ''}` },
    { method: 'PUT',    pattern: /\/admin\/users/, action: 'UPDATE', module: 'users', desc: (b) => `Cập nhật người dùng: ${b?.name || ''} (${b?.code || ''})` },
    { method: 'DELETE', pattern: /\/admin\/users/, action: 'DELETE', module: 'users', desc: () => `Xóa tài khoản người dùng` },

    // ════════════════════════════════════════════════════════
    // 3. Quản lý Thông báo
    // ════════════════════════════════════════════════════════
    { method: 'POST',   pattern: /\/admin\/notifications\/send/, action: 'SEND_NOTIFICATION', module: 'notifications', desc: (b) => `Gửi thông báo: "${b?.title || ''}" đến ${b?.targetRole || 'tất cả'}` },
    { method: 'DELETE', pattern: /\/admin\/notifications/,      action: 'DELETE',            module: 'notifications', desc: () => `Xóa thông báo hệ thống` },
    { method: 'POST',   pattern: /\/teacher\/notifications\/send/, action: 'SEND_NOTIFICATION', module: 'notifications', desc: (b) => `Giảng viên gửi thông báo: "${b?.title || ''}"` },
    { method: 'POST',   pattern: /\/student.*\/announcements/,  action: 'SEND_NOTIFICATION', module: 'notifications', desc: (b) => `Đăng thông báo: "${b?.title || ''}"` },
    { method: 'DELETE', pattern: /\/student.*\/announcements/,  action: 'DELETE',            module: 'notifications', desc: () => `Xóa thông báo` },

    // ════════════════════════════════════════════════════════
    // 4. Quản lý Điểm & Phúc khảo (Admin & Giảng viên)
    // ════════════════════════════════════════════════════════
    { method: 'POST',   pattern: /\/admin\/grades\/publish/,  action: 'GRADE_PUBLISH', module: 'grades', desc: (b) => `Admin công bố bảng điểm lớp học phần: ${b?.classSectionId || ''}` },
    { method: 'POST',   pattern: /\/admin\/grades\/unlock/,   action: 'GRADE_UNLOCK',  module: 'grades', desc: (b) => `Admin mở khóa nhập điểm lớp: ${b?.classSectionId || ''}` },
    { method: 'PUT',    pattern: /\/admin\/grades/,           action: 'GRADE_UPDATE',  module: 'grades', desc: () => `Admin chỉnh sửa điểm của sinh viên` },
    { method: 'POST',   pattern: /\/admin\/grades\/appeals.*\/decide/, action: 'APPEAL_DECIDE', module: 'appeals', desc: (b) => `Admin xử lý phúc khảo: ${b?.decision === 'approved' ? 'Chấp thuận' : 'Từ chối'}` },
    { method: 'POST',   pattern: /\/admin\/grades\/sync/,     action: 'UPDATE',        module: 'grades', desc: () => `Admin đồng bộ dữ liệu bảng điểm` },

    { method: 'POST',   pattern: /\/teacher\/grades\/publish/, action: 'GRADE_PUBLISH', module: 'grades', desc: () => `Giảng viên công bố điểm cho sinh viên xem` },
    { method: 'POST',   pattern: /\/teacher\/grades\/lock/,    action: 'GRADE_LOCK',    module: 'grades', desc: () => `Giảng viên khóa nhập điểm` },
    { method: 'POST',   pattern: /\/teacher\/grades\/submit/,  action: 'GRADE_UPDATE',  module: 'grades', desc: () => `Giảng viên nộp bảng điểm lên Phòng Đào Tạo` },
    { method: 'POST',   pattern: /\/teacher\/grades\/request-unlock/, action: 'GRADE_UNLOCK', module: 'grades', desc: () => `Giảng viên yêu cầu mở khóa nhập điểm` },
    { method: 'POST',   pattern: /\/teacher\/grades\/bulk-update/, action: 'GRADE_UPDATE', module: 'grades', desc: () => `Giảng viên lưu điểm hàng loạt` },
    { method: 'PUT',    pattern: /\/teacher\/grades/,          action: 'GRADE_UPDATE',  module: 'grades', desc: () => `Giảng viên cập nhật điểm sinh viên` },
    { method: 'POST',   pattern: /\/teacher\/appeals.*\/respond/, action: 'APPEAL_DECIDE', module: 'appeals', desc: () => `Giảng viên phản hồi đơn phúc khảo` },

    // ════════════════════════════════════════════════════════
    // 5. Điểm danh & Chốt lịch (Attendance)
    // ════════════════════════════════════════════════════════
    { method: 'POST', pattern: /\/academic\/attendance\/finalize/,   action: 'SCHEDULE_SET',          module: 'attendance', desc: () => `Chốt lịch / Chốt điểm danh học phần` },
    { method: 'POST', pattern: /\/academic\/attendance\/unfinalize/, action: 'ATTENDANCE_UNFINALIZE', module: 'attendance', desc: () => `Mở khóa điểm danh cho giảng viên` },
    { method: 'PUT',  pattern: /\/academic\/attendance\/admin-edit/, action: 'ATTENDANCE_EDIT',       module: 'attendance', desc: () => `Admin chỉnh sửa dữ liệu điểm danh` },
    { method: 'POST', pattern: /\/academic\/attendance\/sync/,       action: 'UPDATE',                module: 'attendance', desc: () => `Đồng bộ điểm danh 15 buổi sang bảng điểm` },
    { method: 'POST', pattern: /\/academic\/attendance\/check-in/,   action: 'ATTENDANCE_SUBMIT',     module: 'attendance', desc: () => `Sinh viên quét mã QR điểm danh thành công` },
    { method: 'POST', pattern: /\/academic\/attendance$/,            action: 'ATTENDANCE_SUBMIT',     module: 'attendance', desc: () => `Ghi nhận kết quả điểm danh buổi học` },
    { method: 'POST', pattern: /\/teacher\/attendance\/generate-qr/, action: 'ATTENDANCE_SUBMIT',     module: 'attendance', desc: () => `Giảng viên tạo mã QR điểm danh` },
    { method: 'POST', pattern: /\/teacher\/attendance\/close-qr/,    action: 'ATTENDANCE_SUBMIT',     module: 'attendance', desc: () => `Giảng viên đóng phiên QR điểm danh` },
    { method: 'POST', pattern: /\/teacher\/attendance/,              action: 'ATTENDANCE_SUBMIT',     module: 'attendance', desc: () => `Giảng viên lưu kết quả điểm danh` },

    // ════════════════════════════════════════════════════════
    // 6. Học phần & Chương trình đào tạo (Academic Management)
    // ════════════════════════════════════════════════════════
    { method: 'POST',   pattern: /\/academic-mgmt\/sections/, action: 'CREATE',   module: 'sections', desc: (b) => `Tạo lớp học phần mới: ${b?.sectionCode || ''} - ${b?.courseName || ''}` },
    { method: 'PUT',    pattern: /\/academic-mgmt\/sections.*\/teacher-response/, action: 'SCHEDULE_SET', module: 'sections', desc: () => `Giảng viên xác nhận/phản hồi lịch giảng dạy` },
    { method: 'PUT',    pattern: /\/academic-mgmt\/sections/, action: 'UPDATE',   module: 'sections', desc: () => `Cập nhật thông tin lớp học phần` },
    { method: 'DELETE', pattern: /\/academic-mgmt\/sections/, action: 'DELETE',   module: 'sections', desc: () => `Xóa lớp học phần` },
    { method: 'POST',   pattern: /\/academic-mgmt\/majors/,   action: 'CREATE',   module: 'academic', desc: (b) => `Tạo ngành học mới: ${b?.name || ''}` },
    { method: 'PUT',    pattern: /\/academic-mgmt\/majors/,   action: 'UPDATE',   module: 'academic', desc: (b) => `Cập nhật ngành học: ${b?.name || ''}` },
    { method: 'DELETE', pattern: /\/academic-mgmt\/majors/,   action: 'DELETE',   module: 'academic', desc: () => `Xóa ngành học` },
    { method: 'POST',   pattern: /\/academic-mgmt\/courses/,  action: 'CREATE',   module: 'academic', desc: (b) => `Thêm môn học mới: ${b?.name || ''} (${b?.code || ''})` },
    { method: 'PUT',    pattern: /\/academic-mgmt\/courses/,  action: 'UPDATE',   module: 'academic', desc: (b) => `Cập nhật môn học: ${b?.name || ''}` },
    { method: 'DELETE', pattern: /\/academic-mgmt\/courses/,  action: 'DELETE',   module: 'academic', desc: () => `Xóa môn học` },
    { method: 'PUT',    pattern: /\/academic-mgmt\/curriculums/, action: 'UPDATE', module: 'academic', desc: () => `Cập nhật chương trình đào tạo` },

    // ════════════════════════════════════════════════════════
    // 7. Sinh viên: Đăng ký học phần & Phúc khảo
    // ════════════════════════════════════════════════════════
    { method: 'POST', pattern: /\/academic-mgmt\/registration\/register/, action: 'ENROLLMENT_REGISTER', module: 'enrollment', desc: (b) => `Sinh viên đăng ký lớp học phần: ${b?.sectionCode || ''}` },
    { method: 'POST', pattern: /\/academic-mgmt\/registration\/drop/,     action: 'ENROLLMENT_DROP',     module: 'enrollment', desc: (b) => `Sinh viên hủy đăng ký lớp học phần` },
    { method: 'POST', pattern: /\/student.*\/grades.*\/appeal/,           action: 'APPEAL_SUBMIT',       module: 'appeals',    desc: () => `Sinh viên nộp đơn phúc khảo điểm` },
    { method: 'POST', pattern: /\/student.*\/appeals/,                    action: 'APPEAL_SUBMIT',       module: 'appeals',    desc: () => `Sinh viên nộp đơn phúc khảo` },

    // ════════════════════════════════════════════════════════
    // 8. Đồ án / Khóa luận tốt nghiệp (Thesis)
    // ════════════════════════════════════════════════════════
    { method: 'POST',  pattern: /\/thesis$/,                      action: 'THESIS_REGISTER',         module: 'thesis', desc: (b) => `Đăng ký đề tài: "${b?.topicTitle || ''}"` },
    { method: 'POST',  pattern: /\/theses$/,                      action: 'THESIS_REGISTER',         module: 'thesis', desc: (b) => `Đăng ký đề tài: "${b?.topicTitle || ''}"` },
    { method: 'POST',  pattern: /\/thes.*\/milestone.*\/upload/,  action: 'THESIS_FILE_UPLOAD',      module: 'thesis', desc: () => `Sinh viên nộp file dự án cho mốc tiến độ` },
    { method: 'PATCH', pattern: /\/thes.*\/milestone/,            action: 'THESIS_MILESTONE_UPDATE', module: 'thesis', desc: () => `Sinh viên cập nhật mốc tiến độ đồ án` },
    { method: 'PUT',   pattern: /\/thes/,                         action: 'THESIS_MILESTONE_UPDATE', module: 'thesis', desc: () => `Giảng viên chấm điểm mốc đồ án` },
];

const activityLogMiddleware = (req, res, next) => {
    // 1. Tuyệt đối bỏ qua GET requests để không sinh log rác/giả
    if (req.method === 'GET') return next();

    // 2. Bỏ qua chính các requests của activity-logs
    if (req.path.includes('/activity-logs')) return next();

    // 3. Tìm quy tắc phù hợp
    const rule = routeRules.find(
        r => r.method === req.method && r.pattern.test(req.path)
    );

    // Nếu không khớp rule nào, bỏ qua
    if (!rule) return next();

    // 4. Override res.json để ghi log khi request hoàn thành thành công
    const originalJson = res.json.bind(res);
    res.json = function(body) {
        // Chỉ log khi request thành công (200 - 299)
        if (res.statusCode >= 200 && res.statusCode < 300) {
            // Giải mã token nếu req.user chưa có
            let user = req.user;
            if (!user && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
                const token = req.headers.authorization.split(' ')[1];
                try {
                    user = jwt.verify(token, process.env.JWT_SECRET || 'SECRET_KEY');
                } catch(e) {
                    try { user = jwt.decode(token); } catch(e2) {}
                }
            }

            const actorRole = user?.role || 'system';
            const actorName = user?.name || (actorRole === 'admin' ? 'Quản Trị Viên Hệ Thống' : 'Người dùng');
            const actorCode = user?.code || '';
            const reqBody = req.body || {};

            let descText = '';
            try {
                descText = typeof rule.desc === 'function' ? rule.desc(reqBody) : rule.desc;
            } catch (e) {
                descText = 'Thực hiện thao tác hệ thống';
            }

            logActivity({
                actor: {
                    userId: user?.id || user?._id,
                    name: actorName,
                    code: actorCode,
                    role: actorRole
                },
                action: rule.action,
                target: {
                    type: rule.module,
                    id: req.params?.id || '',
                    label: ''
                },
                description: descText,
                module: rule.module,
                meta: {
                    method: req.method,
                    path: req.path,
                    params: req.params
                },
                status: 'success',
                ip: req.ip || req.connection?.remoteAddress || ''
            }).catch(() => {});
        }

        return originalJson(body);
    };

    next();
};

module.exports = activityLogMiddleware;
