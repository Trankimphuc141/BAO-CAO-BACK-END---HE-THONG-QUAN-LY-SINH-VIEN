const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/theses');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Khử dấu tiếng Việt và ký tự đặc biệt để an toàn trên mọi OS
        const cleanName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const ext = path.extname(cleanName);
        const baseName = path.basename(cleanName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        const finalName = `${Date.now()}_${baseName}${ext}`;
        cb(null, finalName);
    }
});

// Giới hạn dung lượng: 50 MB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Megabytes

const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.zip', '.rar', '.7z', '.ppt', '.pptx', '.tar', '.gz'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`Định dạng file không hợp lệ (${ext}). Chỉ chấp nhận PDF, DOCX, ZIP, RAR, 7Z, PPTX`), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter
});

module.exports = {
    upload,
    MAX_FILE_SIZE,
    MAX_FILE_SIZE_MB: 50
};
