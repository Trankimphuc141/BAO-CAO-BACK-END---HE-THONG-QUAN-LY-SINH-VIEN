const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware wrapper kiểm tra dữ liệu đầu vào dựa trên validation schema / function
 * @param {Function} validateFn Hàm kiểm tra trả về { isValid, errors }
 */
const validate = (validateFn) => {
    return (req, res, next) => {
        const { isValid, errors } = validateFn(req);
        if (!isValid) {
            return ApiResponse.badRequest(res, 'Dữ liệu đầu vào không hợp lệ', errors);
        }
        next();
    };
};

module.exports = {
    validate
};
