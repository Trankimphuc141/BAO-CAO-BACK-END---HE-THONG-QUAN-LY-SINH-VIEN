const ApiResponse = require('../utils/apiResponse');

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Unhandled Exception:', err);

    // Mongoose CastError (Sai format ObjectId)
    if (err.name === 'CastError') {
        return ApiResponse.badRequest(res, `Định dạng ID không hợp lệ: ${err.value}`);
    }

    // Mongoose ValidationError
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => ({
            field: el.path,
            message: el.message
        }));
        return ApiResponse.badRequest(res, 'Dữ liệu không vượt qua validation', errors);
    }

    // Mongoose Duplicate Key Error (code 11000)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return ApiResponse.badRequest(res, `Giá trị trường '${field}' đã tồn tại trên hệ thống`);
    }

    // JWT Errors
    if (err.name === 'JsonWebTokenError') {
        return ApiResponse.unauthorized(res, 'Mã token không hợp lệ');
    }
    if (err.name === 'TokenExpiredError') {
        return ApiResponse.unauthorized(res, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    }

    // Custom App Error hoặc Server Error 500
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : (process.env.NODE_ENV === 'production' ? 'Đã có lỗi xảy ra trong máy chủ' : err.message || 'Lỗi máy chủ nội bộ');

    return ApiResponse.error(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : null);
};

module.exports = errorHandler;
