/**
 * Click Tracker Utility
 * Tự động ghi nhận các sự kiện click nút bấm và thao tác quan trọng trên giao diện.
 */

export function initClickTracker(portalRole = 'admin') {
  let lastClickTime = 0;
  let lastClickKey = '';

  document.addEventListener('click', (event) => {
    try {
      // 1. Tuyệt đối không log nếu đang ở trang activity-log để tránh vòng lặp vô hạn
      if (window.location.pathname.includes('activity-log')) return;

      // 2. Tìm phần tử click được (button, link, hoặc phần tử tương tác)
      const clickable = event.target.closest('button, a, [role="button"], input[type="submit"]');
      if (!clickable) return;

      // 3. Lấy text mô tả
      let text = (
        clickable.innerText ||
        clickable.title ||
        clickable.getAttribute('aria-label') ||
        clickable.value ||
        ''
      ).trim().replace(/\s+/g, ' ');

      if (text.length > 50) text = text.substring(0, 50) + '...';
      if (!text || text.length < 2) return;

      // 4. Bỏ qua các nút phụ / không cần thiết
      const ignoreTexts = ['Trước', 'Tiếp', '←', '→', 'Close', 'Đóng', '✕', 'X', 'Reset', 'Làm mới'];
      if (ignoreTexts.includes(text)) return;

      // 5. Chống spam click trùng lặp liên tiếp trong 1.2s
      const now = Date.now();
      const clickKey = `${text}_${clickable.tagName}_${window.location.pathname}`;
      if (clickKey === lastClickKey && now - lastClickTime < 1200) {
        return;
      }
      lastClickTime = now;
      lastClickKey = clickKey;

      // 6. Xác định module từ pathname
      const path = window.location.pathname.toLowerCase();
      let mod = 'other';
      if (path.includes('user') || path.includes('student') || path.includes('teacher')) mod = 'users';
      else if (path.includes('grade') || path.includes('diem')) mod = 'grades';
      else if (path.includes('attendance') || path.includes('diem-danh')) mod = 'attendance';
      else if (path.includes('notification') || path.includes('thong-bao')) mod = 'notifications';
      else if (path.includes('academic') || path.includes('section') || path.includes('mon-hoc') || path.includes('chuong-trinh')) mod = 'sections';
      else if (path.includes('thesis') || path.includes('do-an')) mod = 'thesis';

      // 7. Xác định action cụ thể từ nội dung nút
      const lower = text.toLowerCase();
      let action = 'CLICK';
      if (lower.includes('xóa') || lower.includes('delete') || lower.includes('hủy')) action = 'DELETE';
      else if (lower.includes('thêm') || lower.includes('tạo') || lower.includes('create') || lower.includes('đăng ký')) action = 'CREATE';
      else if (lower.includes('sửa') || lower.includes('cập nhật') || lower.includes('update') || lower.includes('lưu')) action = 'UPDATE';
      else if (lower.includes('gửi') || lower.includes('send') || lower.includes('soạn')) action = 'SEND_NOTIFICATION';
      else if (lower.includes('khóa') && !lower.includes('mở')) action = 'GRADE_LOCK';
      else if (lower.includes('mở khóa')) action = 'GRADE_UNLOCK';
      else if (lower.includes('công bố')) action = 'GRADE_PUBLISH';
      else if (lower.includes('phúc khảo') || lower.includes('duyệt') || lower.includes('từ chối')) action = 'APPEAL_DECIDE';
      else if (lower.includes('chốt') || lower.includes('lịch')) action = 'SCHEDULE_SET';
      else if (lower.includes('điểm danh')) action = 'ATTENDANCE_SUBMIT';

      const roleLabels = { admin: 'Quản trị viên', teacher: 'Giảng viên', student: 'Sinh viên' };
      const roleLabel = roleLabels[portalRole] || 'Người dùng';

      const token = localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('teacherToken') || sessionStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      fetch(`${API_BASE}/activity-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action,
          description: `${roleLabel} click: "${text}"`,
          module: mod,
          meta: {
            buttonText: text,
            path: window.location.pathname,
            element: clickable.tagName.toLowerCase()
          }
        })
      }).catch(() => {});
    } catch (e) {}
  }, true);
}
