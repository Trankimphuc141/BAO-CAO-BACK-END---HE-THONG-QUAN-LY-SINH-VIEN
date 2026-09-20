/**
 * Chuẩn hóa định dạng phản hồi RESTful API cho toàn bộ hệ thống
 */
class ApiResponse {
    /**
     * Phản hồi thành công
     * @param {import('express').Response} res 
     * @param {any} data Dữ liệu trả về
     * @param {string} message Thông điệp
     * @param {number} statusCode Mã HTTP (mặc định 200)
     * @param {object} meta Metadata phân trang / thống kê (tùy chọn)
     */
    static success(res, data = null, message = 'Thao tác thành công', statusCode = 200, meta = null) {
        const response = {
            success: true,
            statusCode,
            message,
            data
        };
        if (meta) {
            response.meta = meta;
        }
        return res.status(statusCode).json(response);
    }

    /**
     * Phản hồi khi tạo mới tài nguyên thành công
     */
    static created(res, data = null, message = 'Tạo mới thành công', meta = null) {
        return this.success(res, data, message, 201, meta);
    }

    /**
     * Phản hồi lỗi
     * @param {import('express').Response} res 
     * @param {string} message Thông điệp lỗi
     * @param {number} statusCode Mã lỗi HTTP (mặc định 500)
     * @param {any} errors Chi tiết lỗi (validation errors hoặc exception info)
     */
    static error(res, message = 'Đã có lỗi xảy ra', statusCode = 500, errors = null) {
        const response = {
            success: false,
            statusCode,
            message
        };
        if (errors) {
            response.errors = errors;
        }
        return res.status(statusCode).json(response);
    }

    /**
     * Phản hồi lỗi BadRequest (400)
     */
    static badRequest(res, message = 'Dữ liệu không hợp lệ', errors = null) {
        return this.error(res, message, 400, errors);
    }

    /**
     * Phản hồi Unauthorized (401)
     */
    static unauthorized(res, message = 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ') {
        return this.error(res, message, 401);
    }

    /**
     * Phản hồi Forbidden (403)
     */
    static forbidden(res, message = 'Bạn không có quyền thực hiện thao tác này') {
        return this.error(res, message, 403);
    }

    /**
     * Phản hồi NotFound (404)
     */
    static notFound(res, message = 'Không tìm thấy tài nguyên yêu cầu') {
        return this.error(res, message, 404);
    }
}

module.exports = ApiResponse;
