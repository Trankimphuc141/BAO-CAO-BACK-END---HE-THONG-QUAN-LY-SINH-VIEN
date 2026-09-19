const mongoose = require('mongoose');

const connectDB = async () => {
    const primaryUri = process.env.MONGODB_URI;
    const localUri = 'mongodb://127.0.0.1:27017/student_db';

    // 1. Thử kết nối MONGODB_URI (Cloud MongoDB Atlas)
    if (primaryUri) {
        try {
            console.log('⚡ Đang kết nối MongoDB Atlas Cloud...');
            await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 8000 });
            console.log('✅ Kết nối MongoDB Atlas Cloud thành công!');
            return;
        } catch (cloudErr) {
            console.warn('⚠️ Không thể kết nối qua MONGODB_URI Cloud:', cloudErr.message);
        }
    }

    // 2. Thử kết nối Local MongoDB (27017)
    try {
        console.log('Đang thử kết nối MongoDB Local (27017)...');
        await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
        console.log('✅ MongoDB Local connected successfully');
        return;
    } catch (localErr) {
        console.warn('MongoDB Local không chạy trên máy bạn.');
    }

    // 3. Dự phòng: MongoDB In-Memory Server
    try {
        console.log('Đang tự động khởi chạy MongoDB In-Memory Server dự phòng...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        const memoryUri = mongoServer.getUri();
        await mongoose.connect(memoryUri, { dbName: 'student_db' });
        console.log('✅ MongoDB In-Memory Server đã khởi chạy thành công!');
    } catch (memErr) {
        console.error('❌ Lỗi không thể khởi chạy MongoDB In-Memory:', memErr.message);
    }
};

module.exports = connectDB;