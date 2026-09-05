const mongoose = require('mongoose');

const connectDB = async () => {
    const primaryUri = process.env.MONGODB_URI;
    const localUri = 'mongodb://127.0.0.1:27017/student_db';

    // 1. Thử kết nối MONGODB_URI (nếu có và không phải local)
    try {
        if (primaryUri && !primaryUri.includes('127.0.0.1')) {
            console.log('Đang thử kết nối MongoDB qua MONGODB_URI...');
            await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 3000 });
            console.log('MongoDB Cloud/Primary connected successfully');
            return;
        }
    } catch (cloudErr) {
        console.warn('Không thể kết nối qua MONGODB_URI...');
    }

    // 2. Thử kết nối Local (nếu user có cài MongoDB)
    try {
        console.log('Đang thử kết nối MongoDB Local (27017)...');
        await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
        console.log('MongoDB Local connected successfully');
        return;
    } catch (localErr) {
        console.warn('MongoDB Local không chạy trên máy bạn.');
    }

    // 3. Giải pháp dự phòng: Chạy MongoDB In-Memory (không cần cài đặt)
    try {
        console.log('Đang tự động tải và khởi chạy MongoDB In-Memory Server... (Có thể mất vài giây ở lần đầu tiên)');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        const memoryUri = mongoServer.getUri();
        await mongoose.connect(memoryUri, { dbName: 'student_db' });
        console.log('✅ MongoDB In-Memory Server đã khởi chạy và kết nối thành công!');
        
        // Tự động seed data nếu database trống (vì in-memory sẽ mất dữ liệu khi restart)
        const User = require('../models/User');
        const count = await User.countDocuments();
        if (count === 0) {
            console.log('Đang tự động nạp dữ liệu mẫu vào In-Memory Database...');
            try {
                const seedDB = require('../utils/seedData');
                await seedDB();
                console.log('✅ Đã nạp đầy đủ dữ liệu mẫu thành công!');
            } catch (seedErr) {
                console.error('Lỗi khi nạp dữ liệu mẫu In-Memory:', seedErr.message);
            }
        }
    } catch (memErr) {
        console.error('Lỗi toàn bộ: Không thể khởi chạy In-Memory MongoDB:', memErr.message);
    }
};

module.exports = connectDB;