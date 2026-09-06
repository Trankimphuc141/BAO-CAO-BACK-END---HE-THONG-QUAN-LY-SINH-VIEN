import React from 'react';

const Students = () => {
  return (
    <div className="animate-in">
      <div className="glass-panel">
        <div className="panel-header">
          <h3><i className="fa-solid fa-user-graduate"></i> Danh Sách Sinh Viên</h3>
          <button className="btn btn-primary">
            <i className="fa-solid fa-user-plus"></i> Thêm Sinh Viên
          </button>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Tìm theo tên, mã sinh viên, email..."
            style={{ maxWidth: '320px' }}
          />
          <select className="form-control" style={{ maxWidth: '180px' }}>
            <option>Tất cả trạng thái</option>
            <option>Đang học</option>
            <option>Tốt nghiệp</option>
            <option>Bảo lưu</option>
            <option>Đình chỉ</option>
          </select>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã SV</th>
                <th>Họ Tên</th>
                <th>Email</th>
                <th>Lớp</th>
                <th>Ngành</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="7">
                  <div className="empty-state">
                    <i className="fa-solid fa-users-slash"></i>
                    <p>Chưa có dữ liệu sinh viên. Kết nối API để hiển thị danh sách.</p>
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

export default Students;
