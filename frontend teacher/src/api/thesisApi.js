import axiosClient from './axiosClient';

/**
 * Standard Thesis API Service for Teacher Portal
 */
export const thesisApi = {
    // Lấy danh sách đồ án giảng viên hướng dẫn / phản biện
    getTheses: () => {
        return axiosClient.get('/theses');
    },

    // Cập nhật tiến độ / chấm điểm mốc
    updateMilestone: (thesisId, { milestoneIndex, status, score, comment }) => {
        return axiosClient.put(`/theses/${thesisId}`, {
            milestoneIndex,
            status,
            score,
            comment
        });
    },

    // URL tải file đồ án
    getDownloadUrl: (thesisId, fileIndex) => {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        return `${base}/theses/download/${thesisId}${fileIndex !== undefined ? `?fileIndex=${fileIndex}` : ''}`;
    },

    // URL tải file mốc
    getMilestoneDownloadUrl: (thesisId, milestoneIndex, fileIndex) => {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        return `${base}/theses/download/${thesisId}/milestone/${milestoneIndex}${fileIndex !== undefined ? `?fileIndex=${fileIndex}` : ''}`;
    }
};

export default thesisApi;
