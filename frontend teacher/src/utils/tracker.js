/**
 * Click Tracker Utility for Teacher Portal
 * Tự động ghi nhận các sự kiện click nút bấm và thao tác quan trọng trên giao diện Giảng viên.
 */

export function initClickTracker(portalRole = 'teacher') {
  let lastClickTime = 0;
  let lastClickKey = '';

  document.addEventListener('click', (event) => {
    try {
      const clickable = event.target.closest('button, a, [role="button"], input[type="submit"]');
      if (!clickable) return;

      let text = (
        clickable.innerText ||
        clickable.title ||
        clickable.getAttribute('aria-label') ||
        clickable.value ||
        ''
      ).trim().replace(/\s+/g, ' ');

      if (text.length > 50) text = text.substring(0, 50) + '...';
      if (!text || text.length < 2) return;

      const ignoreTexts = ['Trước', 'Tiếp', '←', '→', 'Close', 'Đóng', '✕', 'X'];
      if (ignoreTexts.includes(text)) return;

      const now = Date.now();
      const clickKey = `${text}_${clickable.tagName}_${window.location.pathname}`;
      if (clickKey === lastClickKey && now - lastClickTime < 1200) {
        return;
      }
      lastClickTime = now;
      lastClickKey = clickKey;

      const path = window.location.pathname.toLowerCase();
      let mod = 'other';
      if (path.includes('grade') || path.includes('diem')) mod = 'grades';
      else if (path.includes('attendance') || path.includes('diem-danh')) mod = 'attendance';
      else if (path.includes('student') || path.includes('sinh-vien')) mod = 'students';
      else if (path.includes('notification') || path.includes('thong-bao')) mod = 'notifications';
      else if (path.includes('appeal') || path.includes('phuc-khao')) mod = 'appeals';
      else if (path.includes('schedule') || path.includes('lich')) mod = 'sections';
      else if (path.includes('thesis') || path.includes('do-an')) mod = 'thesis';

      const lower = text.toLowerCase();
      let action = 'CLICK';
      if (lower.includes('xóa') || lower.includes('delete') || lower.includes('hủy')) action = 'DELETE';
      else if (lower.includes('thêm') || lower.includes('tạo') || lower.includes('create')) action = 'CREATE';
      else if (lower.includes('sửa') || lower.includes('cập nhật') || lower.includes('update') || lower.includes('lưu')) action = 'UPDATE';
      else if (lower.includes('gửi') || lower.includes('send') || lower.includes('soạn')) action = 'SEND_NOTIFICATION';
      else if (lower.includes('khóa') && !lower.includes('mở')) action = 'GRADE_LOCK';
      else if (lower.includes('mở khóa')) action = 'GRADE_UNLOCK';
      else if (lower.includes('công bố')) action = 'GRADE_PUBLISH';
      else if (lower.includes('phúc khảo') || lower.includes('phản hồi')) action = 'APPEAL_DECIDE';
      else if (lower.includes('chốt') || lower.includes('lịch')) action = 'SCHEDULE_SET';
      else if (lower.includes('điểm danh')) action = 'ATTENDANCE_SUBMIT';

      const token = localStorage.getItem('teacherToken') || localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      fetch(`${API_BASE}/activity-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action,
          description: `Giảng viên click: "${text}"`,
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
