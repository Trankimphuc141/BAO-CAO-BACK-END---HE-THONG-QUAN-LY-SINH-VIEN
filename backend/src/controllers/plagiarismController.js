const Submission = require('../models/Submission');
const User = require('../models/User');
const antiFraudService = require('../services/antiFraudService');

// 1. Lấy danh sách tất cả các bài nộp đã kiểm tra gian lận
exports.getAllSubmissions = async (req, res) => {
    try {
        const query = {};
        if (req.user && req.user.role === 'student') {
            query.student = req.user.id;
        }

        const submissions = await Submission.find(query)
            .populate('student', 'code name classCode email')
            .sort({ submittedAt: -1 });

        return res.status(200).json({ success: true, count: submissions.length, data: submissions });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 2. Thuật toán kiểm tra và phân tích trùng lặp bài nộp
exports.checkAndSubmitDocument = async (req, res) => {
    try {
        const { title, assignmentType, contentText, fileName, studentId } = req.body;
        const targetStudentId = studentId || (req.user ? req.user.id : null);

        if (!title || !contentText) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp tiêu đề và nội dung bài nộp để phân tích' });
        }

        const effectiveFileName = fileName || `${title.replace(/\s+/g, '_')}.docx`;
        const fileHash = antiFraudService.calculateFileHash(contentText.trim());
        const wordCount = contentText.trim().split(/\s+/).length;

        // Lấy danh sách các bài nộp trước đó trong kho dữ liệu để đối chiếu
        const previousSubmissions = await Submission.find().populate('student', 'name code');

        let maxSimilarity = 0;
        let isExactHashMatch = false;
        const matches = [];

        for (const prev of previousSubmissions) {
            // Không so khớp với chính submission cũ của cùng 1 ID nếu cập nhật
            const isHashEqual = prev.fileHash === fileHash;
            const { similarity, matchedTokens } = antiFraudService.calculateSimilarity(contentText, prev.contentSummary);

            const effectiveSimilarity = isHashEqual ? 100 : similarity;
            if (isHashEqual) isExactHashMatch = true;

            if (effectiveSimilarity > maxSimilarity) {
                maxSimilarity = effectiveSimilarity;
            }

            if (effectiveSimilarity >= 15) { // Ngưỡng ghi nhận đối chiếu
                matches.push({
                    matchedWithSubmission: prev._id,
                    matchedStudentName: prev.student?.name || 'Hệ thống lưu trữ',
                    similarityPercentage: effectiveSimilarity,
                    matchedKeywords: matchedTokens,
                    isExactHashMatch: isHashEqual
                });
            }
        }

        const fraudAlertLevel = antiFraudService.evaluateFraudRisk(maxSimilarity, isExactHashMatch);

        const newSubmission = await Submission.create({
            student: targetStudentId,
            title,
            assignmentType: assignmentType || 'Bài tập lớn',
            fileName: effectiveFileName,
            fileHash,
            contentSummary: contentText.slice(0, 5000), // Lưu đoạn văn bản để đối chiếu
            wordCount,
            maxSimilarityPercentage: maxSimilarity,
            fraudAlertLevel,
            matches
        });

        const populated = await Submission.findById(newSubmission._id).populate('student', 'code name classCode');

        return res.status(201).json({
            success: true,
            message: 'Đã hoàn tất phân tích kiểm tra trùng lặp & chống gian lận',
            data: populated,
            analysis: {
                fileHash,
                maxSimilarityPercentage: maxSimilarity,
                fraudAlertLevel,
                isExactHashMatch,
                totalMatchesFound: matches.length
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 3. Xóa bài nộp
exports.deleteSubmission = async (req, res) => {
    try {
        await Submission.findByIdAndDelete(req.params.id);
        return res.status(200).json({ success: true, message: 'Đã xóa bài nộp khỏi kho dữ liệu' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
