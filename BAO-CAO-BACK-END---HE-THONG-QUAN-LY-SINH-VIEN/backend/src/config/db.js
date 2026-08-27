const mongoose = require('mongoose');

const connectDB = async () => {
    const primaryUri = process.env.MONGODB_URI;
    const localUri = 'mongodb://127.0.0.1:27017/student_db';

    try {
        if (primaryUri) {
            console.log('Đang thử kết nối MongoDB qua MONGODB_URI...');
            await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 3000 });
            console.log('MongoDB Cloud/Primary connected successfully');
            return;
        }
    } catch (cloudErr) {
        console.warn('Không thể kết nối qua MONGODB_URI, đang chuyển hướng sang Local MongoDB (127.0.0.1:27017)...', cloudErr.message);
    }

    try {
        await mongoose.connect(localUri, { serverSelectionTimeoutMS: 3000 });
        console.log('MongoDB Local (127.0.0.1:27017) connected successfully');
    } catch (localErr) {
        console.error('Lỗi kết nối toàn bộ MongoDB:', localErr.message);
    }
};

module.exports = connectDB;