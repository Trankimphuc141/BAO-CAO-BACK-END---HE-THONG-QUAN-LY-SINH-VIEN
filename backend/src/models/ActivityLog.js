const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  // Ai thực hiện
  actor: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, default: 'Hệ thống' },
    code: { type: String, default: '' },
    role: { type: String, enum: ['student', 'teacher', 'admin', 'system'], default: 'system' }
  },
  // Loại hành động
  action: {
    type: String,
    required: true,
    default: 'CLICK'
  },
  // Đối tượng bị tác động
  target: {
    type: { type: String, default: '' },  // e.g. 'Student', 'Grade', 'Notification'
    id: { type: String, default: '' },
    label: { type: String, default: '' }  // human-readable
  },
  // Mô tả chi tiết
  description: { type: String, required: true },
  // Module / trang liên quan
  module: {
    type: String,
    default: 'other'
  },
  // Metadata bổ sung
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Kết quả
  status: { type: String, enum: ['success', 'failed', 'warning'], default: 'success' },
  // IP
  ip: { type: String, default: '' },
}, {
  timestamps: true
});

// Index để query nhanh
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ 'actor.role': 1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ module: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
