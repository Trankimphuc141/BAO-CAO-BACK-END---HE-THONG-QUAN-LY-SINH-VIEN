const mongoose = require('mongoose');

const curriculumSchema = new mongoose.Schema({
    major: { type: mongoose.Schema.Types.ObjectId, ref: 'Major', required: true },
    name: { type: String, required: true, trim: true },
    academicYear: { type: String, default: '2023-2027' },
    semesters: [
        {
            semesterIndex: { type: Number, required: true }, // 1, 2, 3, ...
            semesterName: { type: String, default: '' },
            isVisible: { type: Boolean, default: false }, // Admin bật/tắt hiển thị cho sinh viên xem
            courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }]
        }
    ],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Curriculum', curriculumSchema);
