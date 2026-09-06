import React from 'react';

const Teachers = () => {
  return (
    <div className="animate-in">
      <div className="glass-panel">
        <div className="panel-header">
          <h3><i className="fa-solid fa-chalkboard-user"></i> Danh Sách Giảng Viên</h3>
          <button className="btn btn-primary">
            <i className="fa-solid fa-user-plus"></i> Thêm Giảng Viên
          </button>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Tìm theo tên, mã giảng viên, khoa..."
            style={{ maxWidth: '320px' }}
          />
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã GV</th>
                <th>Họ Tên</th>
                <th>Email</th>
                <th>Khoa</th>
                <th>Số Điện Thoại</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="6">
                  <div className="empty-state">
                    <i className="fa-solid fa-chalkboard-user" style={{ fontSize: '40px', marginBottom: '12px', display: 'block', opacity: 0.3 }}></i>
                    <p>Chưa có dữ liệu giảng viên. Kết nối API để hiển thị danh sách.</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Teachers;
