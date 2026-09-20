/**
 * Click Tracker Utility for Student Portal
 * Tự động ghi nhận các sự kiện click nút bấm và thao tác quan trọng trên giao diện Sinh viên.
 */

export function initClickTracker(portalRole = 'student') {
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
      else if (path.includes('register') || path.includes('dang-ky')) mod = 'enrollment';
      else if (path.includes('appeal') || path.includes('phuc-khao')) mod = 'appeals';
      else if (path.includes('thesis') || path.includes('do-an')) mod = 'thesis';
      else if (path.includes('notification') || path.includes('thong-bao')) mod = 'notifications';

      const lower = text.toLowerCase();
      let action = 'CLICK';
      if (lower.includes('hủy') || lower.includes('drop')) action = 'ENROLLMENT_DROP';
      else if (lower.includes('đăng ký')) action = 'ENROLLMENT_REGISTER';
      else if (lower.includes('phúc khảo')) action = 'APPEAL_SUBMIT';
      else if (lower.includes('nộp') || lower.includes('tải lên')) action = 'THESIS_FILE_UPLOAD';
      else if (lower.includes('điểm danh') || lower.includes('check-in')) action = 'ATTENDANCE_SUBMIT';
      else if (lower.includes('lưu') || lower.includes('cập nhật')) action = 'UPDATE';

      const token = sessionStorage.getItem('token') || localStorage.getItem('token') || localStorage.getItem('studentToken');
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      fetch(`${API_BASE}/activity-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action,
          description: `Sinh viên click: "${text}"`,
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
