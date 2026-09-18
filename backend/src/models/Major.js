const mongoose = require('mongoose');

const majorSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true }, // VD: CNTT, DTVT, QTKD
    name: { type: String, required: true, trim: true },
    department: { type: String, default: 'Công nghệ thông tin' },
    description: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Major', majorSchema);
