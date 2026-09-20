const path = require('path');
const fs = require('fs');
const Thesis = require('../models/Thesis');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const thesisService = require('../services/thesisService');

/**
 * 1. Lấy danh sách đồ án tốt nghiệp
 */
exports.getTheses = async (req, res, next) => {
    try {
        const theses = await thesisService.getTheses(req.user);
        return ApiResponse.success(res, theses, 'Lấy danh sách đồ án thành công', 200, { total: theses.length });
    } catch (err) {
        next(err);
    }
};

/**
 * 2. Đăng ký đề tài & nộp file đồ án tốt nghiệp
 */
exports.registerThesis = async (req, res, next) => {
    try {
        const files = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);
        const thesis = await thesisService.registerThesis(req.body, files, req.user);
        return ApiResponse.created(res, thesis, 'Đăng ký đề tài đồ án tốt nghiệp thành công!');
    } catch (err) {
        next(err);
    }
};

/**
 * 3. Nộp file báo cáo cho mốc tiến độ cụ thể (Hỗ trợ nộp nhiều file & không bị ghi đè)
 */
exports.uploadMilestoneFile = async (req, res, next) => {
    try {
        const { id, milestoneIndex } = req.params;
        const { note } = req.body;
        const files = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);

        const thesis = await thesisService.uploadMilestoneFile(id, milestoneIndex, files, note);
        return ApiResponse.success(res, thesis, 'Đã nộp báo cáo mốc tiến độ thành công!');
    } catch (err) {
        next(err);
    }
};

/**
 * 4. Nộp bổ sung thêm file vào đồ án bất kỳ lúc nào mà không bị ghi đè file cũ
 */
exports.uploadAdditionalFiles = async (req, res, next) => {
    try {
        const { id } = req.params;
        const files = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);

        const thesis = await thesisService.uploadAdditionalFiles(id, files);
        return ApiResponse.success(res, thesis, `Đã nộp bổ sung ${files.length} file thành công!`);
    } catch (err) {
        next(err);
    }
};

/**
 * 5. Giảng viên cập nhật tiến độ / chấm điểm mốc
 */
exports.updateMilestone = async (req, res, next) => {
    try {
        const { id } = req.params;
        const thesis = await thesisService.updateMilestone(id, req.body);
        return ApiResponse.success(res, thesis, 'Đã cập nhật tiến độ và điểm đồ án tốt nghiệp');
    } catch (err) {
        next(err);
    }
};
exports.updateThesisMilestoneOrScore = exports.updateMilestone;

/**
 * 6. Tải file đồ án về máy (Giảng viên / Sinh viên / Admin) - Hỗ trợ tải theo fileIndex
 */
exports.downloadThesisFile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { fileIndex } = req.query;
        const thesis = await Thesis.findById(id);
        if (!thesis) {
            return ApiResponse.notFound(res, 'Không tìm thấy đồ án');
        }

        let target = null;
        if (fileIndex !== undefined && thesis.files && thesis.files[parseInt(fileIndex, 10)]) {
            target = thesis.files[parseInt(fileIndex, 10)];
        } else {
            target = {
                localFilePath: thesis.localFilePath,
                fileName: thesis.submittedFileName,
                submittedFileName: thesis.submittedFileName,
                driveWebContentLink: thesis.driveWebContentLink,
                driveWebViewLink: thesis.driveWebViewLink,
                submittedFileUrl: thesis.submittedFileUrl
            };
        }

        if (target.localFilePath) {
            const localFile = path.join(__dirname, '../../uploads/theses', target.localFilePath);
            if (fs.existsSync(localFile)) {
                return res.download(localFile, target.fileName || target.submittedFileName || path.basename(localFile));
            }
        }

        if (target.driveWebContentLink) {
            return res.redirect(target.driveWebContentLink);
        }
        if (target.driveWebViewLink) {
            return res.redirect(target.driveWebViewLink);
        }
        const fUrl = target.fileUrl || target.submittedFileUrl;
        if (fUrl) {
            if (fUrl.startsWith('http')) {
                return res.redirect(fUrl);
            }
            const localFile = path.join(__dirname, '../..', fUrl);
            if (fs.existsSync(localFile)) {
                return res.download(localFile, target.fileName || target.submittedFileName || 'do_an_tot_nghiep.pdf');
            }
        }

        return ApiResponse.notFound(res, 'Không tìm thấy file đính kèm của đề tài này');
    } catch (err) {
        next(err);
    }
};

/**
 * 7. Tải file của một mốc tiến độ cụ thể - Hỗ trợ tải theo fileIndex
 */
exports.downloadMilestoneFile = async (req, res, next) => {
    try {
        const { id, milestoneIndex } = req.params;
        const { fileIndex } = req.query;
        const mIdx = parseInt(milestoneIndex, 10);
        const thesis = await Thesis.findById(id);
        if (!thesis || !thesis.milestones || !thesis.milestones[mIdx]) {
            return ApiResponse.notFound(res, 'Không tìm thấy mốc tiến độ hoặc đề tài');
        }

        const m = thesis.milestones[mIdx];
        let target = null;
        if (fileIndex !== undefined && m.files && m.files[parseInt(fileIndex, 10)]) {
            target = m.files[parseInt(fileIndex, 10)];
        } else {
            target = {
                localFilePath: m.localFilePath,
                fileName: m.submittedFileName,
                submittedFileName: m.submittedFileName,
                driveWebContentLink: m.driveWebContentLink,
                driveWebViewLink: m.driveWebViewLink,
                submittedFileUrl: m.submittedFileUrl
            };
        }

        if (target.localFilePath) {
            const localFile = path.join(__dirname, '../../uploads/theses', target.localFilePath);
            if (fs.existsSync(localFile)) {
                return res.download(localFile, target.fileName || target.submittedFileName || path.basename(localFile));
            }
        }
        if (target.driveWebContentLink) return res.redirect(target.driveWebContentLink);
        if (target.driveWebViewLink) return res.redirect(target.driveWebViewLink);
        const fUrl = target.fileUrl || target.submittedFileUrl;
        if (fUrl) {
            if (fUrl.startsWith('http')) return res.redirect(fUrl);
            const localFile = path.join(__dirname, '../..', fUrl);
            if (fs.existsSync(localFile)) return res.download(localFile, target.fileName || target.submittedFileName || 'bao_cao_moc.pdf');
        }

        return ApiResponse.notFound(res, 'Mốc này chưa có file đính kèm');
    } catch (err) {
        next(err);
    }
};

/**
 * 8. Lấy danh sách giảng viên hướng dẫn
 */
exports.getAdvisors = async (req, res, next) => {
    try {
        const advisors = await User.find({ role: 'teacher' }).select('_id name code email').lean();
        return ApiResponse.success(res, advisors, 'Lấy danh sách giảng viên thành công');
    } catch (err) {
        next(err);
    }
};

/**
 * 9. Sinh viên tự cập nhật tên / ghi chú mốc tiến độ của mình
 */
exports.updateMilestoneInfo = async (req, res, next) => {
    try {
        const { id, milestoneIndex } = req.params;
        const mIdx = parseInt(milestoneIndex, 10);
        const { name, note } = req.body;

        const thesis = await Thesis.findById(id);
        if (!thesis) {
            return ApiResponse.notFound(res, 'Không tìm thấy đề tài');
        }

        const studentId = req.user ? (req.user.id || req.user._id) : null;
        if (studentId && thesis.student.toString() !== studentId.toString()) {
            return ApiResponse.forbidden(res, 'Bạn không có quyền chỉnh sửa đề tài này');
        }

        if (!thesis.milestones || !thesis.milestones[mIdx]) {
            return ApiResponse.badRequest(res, 'Mốc tiến độ không hợp lệ');
        }

        if (name && name.trim()) thesis.milestones[mIdx].name = name.trim();
        if (note !== undefined) {
            thesis.milestones[mIdx].studentNote = note;
            thesis.milestones[mIdx].note = note;
        }

        await thesis.save();
        return ApiResponse.success(res, thesis, `Đã cập nhật mốc "${thesis.milestones[mIdx].name}" thành công!`);
    } catch (err) {
        next(err);
    }
};
