const path = require('path');
const fs = require('fs');
const Thesis = require('../models/Thesis');
const { uploadFileToDrive } = require('../utils/googleDrive');

class ThesisService {
    /**
     * Lấy danh sách đồ án dựa trên phân quyền người dùng
     */
    async getTheses(user) {
        const query = {};
        if (user && user.role === 'student') {
            query.student = user.id || user._id;
        } else if (user && user.role === 'teacher') {
            const tId = user.id || user._id;
            query.$or = [
                { advisor: tId },
                { reviewer: tId },
                { committee: tId }
            ];
        }

        const theses = await Thesis.find(query)
            .populate('student', 'code name classCode email')
            .populate('advisor', 'code name email')
            .populate('reviewer', 'code name email')
            .populate('committee', 'code name email')
            .sort({ createdAt: -1 });

        return theses;
    }

    /**
     * Đăng ký đồ án mới và upload các tài liệu đính kèm
     */
    async registerThesis({ topicTitle, description, advisorId, reviewerId, milestone }, files, user) {
        if (!topicTitle || !advisorId) {
            throw new Error('Vui lòng cung cấp tên đề tài và giảng viên hướng dẫn');
        }

        const studentId = user ? (user.id || user._id) : null;
        const topicCode = `DA_${Date.now().toString().slice(-6)}`;

        const uploadedFiles = files && files.length > 0 ? files : [];
        const filesList = [];

        for (const f of uploadedFiles) {
            let fDriveId = '';
            let fWebViewLink = '';
            let fWebContentLink = '';
            let fUrl = `/uploads/theses/${f.filename}`;

            try {
                const driveResult = await uploadFileToDrive(f.path, f.originalname, f.mimetype);
                if (driveResult) {
                    fDriveId = driveResult.id || '';
                    fWebViewLink = driveResult.webViewLink || '';
                    fWebContentLink = driveResult.webContentLink || '';
                }
            } catch (dErr) {
                console.warn('Google Drive service account warning:', dErr.message);
            }

            filesList.push({
                fileName: f.originalname,
                fileSize: f.size,
                fileUrl: fUrl,
                driveFileId: fDriveId,
                driveWebViewLink: fWebViewLink,
                driveWebContentLink: fWebContentLink,
                localFilePath: f.path,
                submittedAt: new Date()
            });
        }

        const initialMilestones = [{
            name: (milestone && milestone.name) ? milestone.name : 'Báo cáo khởi động đề tài & Đề cương chi tiết',
            status: filesList.length > 0 ? 'Đã nộp' : 'Chưa nộp',
            submittedAt: filesList.length > 0 ? new Date() : null,
            submittedFileName: filesList[0]?.fileName || '',
            submittedFileSize: filesList[0]?.fileSize || null,
            submittedFileUrl: filesList[0]?.fileUrl || '',
            driveFileId: filesList[0]?.driveFileId || '',
            driveWebViewLink: filesList[0]?.driveWebViewLink || '',
            driveWebContentLink: filesList[0]?.driveWebContentLink || '',
            localFilePath: filesList[0]?.localFilePath || '',
            files: filesList,
            studentNote: (milestone && milestone.note) ? milestone.note : ''
        }];

        const newThesis = await Thesis.create({
            topicCode,
            topicTitle,
            description,
            student: studentId,
            advisor: advisorId,
            reviewer: reviewerId || null,
            status: 'Chờ duyệt',
            submittedAt: filesList.length > 0 ? new Date() : null,
            submittedFileName: filesList[0]?.fileName || '',
            submittedFileSize: filesList[0]?.fileSize || null,
            submittedFileUrl: filesList[0]?.fileUrl || '',
            driveFileId: filesList[0]?.driveFileId || '',
            driveWebViewLink: filesList[0]?.driveWebViewLink || '',
            driveWebContentLink: filesList[0]?.driveWebContentLink || '',
            localFilePath: filesList[0]?.localFilePath || '',
            files: filesList,
            milestones: initialMilestones
        });

        return newThesis;
    }

    /**
     * Nộp file báo cáo cho mốc tiến độ cụ thể
     */
    async uploadMilestoneFile(thesisId, milestoneIndex, files, note) {
        const thesis = await Thesis.findById(thesisId);
        if (!thesis) {
            const err = new Error('Không tìm thấy đồ án');
            err.statusCode = 404;
            throw err;
        }

        const mIdx = parseInt(milestoneIndex, 10);
        if (isNaN(mIdx) || mIdx < 0 || !thesis.milestones || mIdx >= thesis.milestones.length) {
            const err = new Error('Mốc tiến độ không hợp lệ');
            err.statusCode = 400;
            throw err;
        }

        const uploadedFiles = files && files.length > 0 ? files : [];
        if (uploadedFiles.length === 0 && !note) {
            const err = new Error('Vui lòng chọn ít nhất một file hoặc nhập ghi chú');
            err.statusCode = 400;
            throw err;
        }

        const newFileItems = [];
        for (const f of uploadedFiles) {
            let fDriveId = '';
            let fWebViewLink = '';
            let fWebContentLink = '';
            let fUrl = `/uploads/theses/${f.filename}`;

            try {
                const driveResult = await uploadFileToDrive(f.path, f.originalname, f.mimetype);
                if (driveResult) {
                    fDriveId = driveResult.id || '';
                    fWebViewLink = driveResult.webViewLink || '';
                    fWebContentLink = driveResult.webContentLink || '';
                }
            } catch (dErr) {
                console.warn('Google Drive warning:', dErr.message);
            }

            const item = {
                fileName: f.originalname,
                fileSize: f.size,
                fileUrl: fUrl,
                driveFileId: fDriveId,
                driveWebViewLink: fWebViewLink,
                driveWebContentLink: fWebContentLink,
                localFilePath: f.path,
                submittedAt: new Date()
            };
            newFileItems.push(item);
        }

        if (!thesis.milestones[mIdx].files) {
            thesis.milestones[mIdx].files = [];
        }
        if (!thesis.files) {
            thesis.files = [];
        }

        newFileItems.forEach(item => {
            thesis.milestones[mIdx].files.push(item);
            thesis.files.push(item);
        });

        if (newFileItems.length > 0) {
            const latest = newFileItems[newFileItems.length - 1];
            thesis.milestones[mIdx].submittedFileName = latest.fileName;
            thesis.milestones[mIdx].submittedFileSize = latest.fileSize;
            thesis.milestones[mIdx].submittedFileUrl = latest.fileUrl;
            thesis.milestones[mIdx].driveFileId = latest.driveFileId;
            thesis.milestones[mIdx].driveWebViewLink = latest.driveWebViewLink;
            thesis.milestones[mIdx].driveWebContentLink = latest.driveWebContentLink;
            thesis.milestones[mIdx].localFilePath = latest.localFilePath;
            thesis.milestones[mIdx].submittedAt = new Date();

            thesis.submittedFileName = latest.fileName;
            thesis.submittedFileSize = latest.fileSize;
            thesis.submittedFileUrl = latest.fileUrl;
            thesis.submittedAt = new Date();
        }

        thesis.milestones[mIdx].status = 'Đã nộp';
        if (note) {
            thesis.milestones[mIdx].studentNote = note;
        }

        await thesis.save();
        return thesis;
    }

    /**
     * Nộp bổ sung thêm file vào đồ án mà không bị ghi đè
     */
    async uploadAdditionalFiles(thesisId, files) {
        const thesis = await Thesis.findById(thesisId);
        if (!thesis) {
            const err = new Error('Không tìm thấy đồ án');
            err.statusCode = 404;
            throw err;
        }

        const uploadedFiles = files && files.length > 0 ? files : [];
        if (uploadedFiles.length === 0) {
            const err = new Error('Vui lòng chọn ít nhất một file để nộp bổ sung');
            err.statusCode = 400;
            throw err;
        }

        if (!thesis.files) {
            thesis.files = [];
        }

        const newItems = [];
        for (const f of uploadedFiles) {
            let fDriveId = '';
            let fWebViewLink = '';
            let fWebContentLink = '';
            let fUrl = `/uploads/theses/${f.filename}`;

            try {
                const driveResult = await uploadFileToDrive(f.path, f.originalname, f.mimetype);
                if (driveResult) {
                    fDriveId = driveResult.id || '';
                    fWebViewLink = driveResult.webViewLink || '';
                    fWebContentLink = driveResult.webContentLink || '';
                }
            } catch (dErr) {
                console.warn('Google Drive warning:', dErr.message);
            }

            const item = {
                fileName: f.originalname,
                fileSize: f.size,
                fileUrl: fUrl,
                driveFileId: fDriveId,
                driveWebViewLink: fWebViewLink,
                driveWebContentLink: fWebContentLink,
                localFilePath: f.path,
                submittedAt: new Date()
            };
            newItems.push(item);
            thesis.files.push(item);
        }

        if (newItems.length > 0) {
            const latest = newItems[newItems.length - 1];
            thesis.submittedFileName = latest.fileName;
            thesis.submittedFileSize = latest.fileSize;
            thesis.submittedFileUrl = latest.fileUrl;
            thesis.submittedAt = new Date();
        }

        await thesis.save();
        return thesis;
    }

    /**
     * Giảng viên cập nhật tiến độ / chấm điểm mốc
     */
    async updateMilestone(thesisId, { milestoneIndex, status, score, comment }) {
        const thesis = await Thesis.findById(thesisId);
        if (!thesis) {
            const err = new Error('Không tìm thấy đồ án');
            err.statusCode = 404;
            throw err;
        }

        const mIdx = parseInt(milestoneIndex, 10);
        if (isNaN(mIdx) || mIdx < 0 || !thesis.milestones || mIdx >= thesis.milestones.length) {
            const err = new Error('Mốc tiến độ không hợp lệ');
            err.statusCode = 400;
            throw err;
        }

        if (status) thesis.milestones[mIdx].status = status;
        if (score !== undefined) thesis.milestones[mIdx].score = score;
        if (comment !== undefined) thesis.milestones[mIdx].comment = comment;

        // Tự động đồng bộ trạng thái tổng của đồ án nếu tất cả các mốc đã duyệt
        const allApproved = thesis.milestones.every(m => m.status === 'Đã duyệt');
        if (allApproved && thesis.milestones.length > 0) {
            thesis.status = 'Đã hoàn thành';
        }

        await thesis.save();
        return thesis;
    }
}

module.exports = new ThesisService();
