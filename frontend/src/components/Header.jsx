import React from 'react';

export default function Header({ activeTab, currentUser, onOpenAuth, onLogout }) {
  const titles = {
    dashboard: { title: 'Tổng Quan Học Tập', sub: 'Cổng tra cứu kết quả học vụ, thời khóa biểu và nộp luận văn', icon: 'fa-chart-pie' },
    portal: { title: 'Hồ Sơ & Bảng Điểm', sub: 'Hồ sơ sinh viên, bảng điểm chi tiết các học kỳ, điểm GPA/CPA', icon: 'fa-id-card' },
    timetable: { title: 'Lịch Học Cá Nhân Theo Thời Gian Thực', sub: 'Thời khóa biểu học tập với ngày tháng chạy theo thời gian thực, phân chia Buổi & Ca học', icon: 'fa-calendar-days' },
    attendance: { title: 'Theo Dõi Chuyên Cần', sub: 'Giám sát số buổi học và cảnh báo nguy cơ cấm thi vắng > 20%', icon: 'fa-clipboard-user' },
    exams: { title: 'Lịch Thi Cá Nhân', sub: 'Tra cứu ngày thi, ca thi, phòng thi và hình thức thi', icon: 'fa-pen-ruler' },
    survey: { title: 'Đánh Giá Giảng Dạy', sub: 'Khảo sát chất lượng môn học và giảng viên ẩn danh', icon: 'fa-star-half-stroke' },
    thesis: { title: 'Nộp Đồ Án / Luận Văn Tốt Nghiệp', sub: 'Nộp file báo cáo đề tài tốt nghiệp và theo dõi các mốc tiến độ M1-M4', icon: 'fa-file-arrow-up' }
  };

  const info = titles[activeTab] || titles.dashboard;

  return (
    <header className="top-header">
      <div className="header-title">
        <h1>
          <i className={`fa-solid ${info.icon}`}></i> {info.title}
        </h1>
        <p>{info.sub}</p>
      </div>

      <div className="header-actions">
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12.5px', color: '#60a5fa', fontWeight: 600 }}>
              Mã SV: {currentUser.code}
            </span>
            <button className="btn btn-danger btn-sm" onClick={onLogout}>
              <i className="fa-solid fa-right-from-bracket"></i> Đăng Xuất
            </button>
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={onOpenAuth}>
            <i className="fa-solid fa-arrow-right-to-bracket"></i> Đăng Nhập
          </button>
        )}
      </div>
    </header>
  );
}
