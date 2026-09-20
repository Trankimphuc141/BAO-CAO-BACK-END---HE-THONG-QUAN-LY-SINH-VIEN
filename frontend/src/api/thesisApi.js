import { apiClient, API_BASE } from './axiosClient';

/**
 * Standard Thesis API Service for Student Portal
 */
export const thesisApi = {
    // Lấy danh sách đồ án
    getTheses: async () => {
        const res = await apiClient('/theses');
        return res.data;
    },

    // Lấy danh sách giảng viên hướng dẫn
    getAdvisors: async () => {
        const res = await apiClient('/theses/advisors');
        return res.data;
    },

    // Đăng ký đề tài mới kèm file
    registerThesis: async (formData) => {
        const res = await apiClient('/theses', {
            method: 'POST',
            body: formData
        });
        return res.data;
    },

    // Nộp báo cáo cho mốc tiến độ
    uploadMilestoneFile: async (thesisId, milestoneIndex, files, note) => {
        const formData = new FormData();
        if (Array.isArray(files)) {
            files.forEach(f => formData.append('files', f));
        } else if (files) {
            formData.append('files', files);
        }
        if (note) formData.append('note', note);

        const res = await apiClient(`/theses/${thesisId}/milestone/${milestoneIndex}/upload`, {
            method: 'POST',
            body: formData
        });
        return res.data;
    },

    // Nộp thêm file bổ sung vào đồ án mà không bị ghi đè
    uploadAdditionalFiles: async (thesisId, files) => {
        const formData = new FormData();
        if (Array.isArray(files)) {
            files.forEach(f => formData.append('files', f));
        } else if (files) {
            formData.append('files', files);
        }

        const res = await apiClient(`/theses/${thesisId}/upload`, {
            method: 'POST',
            body: formData
        });
        return res.data;
    },

    // Cập nhật tên hoặc ghi chú mốc
    updateMilestoneInfo: async (thesisId, milestoneIndex, data) => {
        const res = await apiClient(`/theses/${thesisId}/milestone/${milestoneIndex}/info`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return res.data;
    },

    // URL tải file
    getDownloadUrl: (thesisId, fileIndex) => {
        return `${API_BASE}/theses/download/${thesisId}${fileIndex !== undefined ? `?fileIndex=${fileIndex}` : ''}`;
    },

    // URL tải file mốc
    getMilestoneDownloadUrl: (thesisId, milestoneIndex, fileIndex) => {
        return `${API_BASE}/theses/download/${thesisId}/milestone/${milestoneIndex}${fileIndex !== undefined ? `?fileIndex=${fileIndex}` : ''}`;
    }
};

export default thesisApi;
