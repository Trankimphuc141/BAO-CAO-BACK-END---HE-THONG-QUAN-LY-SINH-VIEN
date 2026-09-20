require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const connectDB = require('../src/config/db');

async function backupDatabase() {
    try {
        console.log('🔄 Đang khởi tạo kết nối MongoDB để sao lưu dữ liệu...');
        await connectDB();

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '../backups', `backup-${timestamp}`);

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`📦 Tìm thấy ${collections.length} collections. Đang xuất dữ liệu ra: ${backupDir}`);

        let totalRecords = 0;
        for (const col of collections) {
            const data = await mongoose.connection.db.collection(col.name).find({}).toArray();
            const filePath = path.join(backupDir, `${col.name}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
            console.log(`  - Đã sao lưu collection '${col.name}': ${data.length} bản ghi -> ${col.name}.json`);
            totalRecords += data.length;
        }

        console.log(`✅ SAO LƯU HOÀN TẤT: Tổng cộng ${totalRecords} bản ghi đã được lưu trữ an toàn tại:`);
        console.log(`   📂 ${backupDir}\n`);
        return backupDir;
    } catch (err) {
        console.error('❌ Lỗi khi sao lưu cơ sở dữ liệu:', err);
        throw err;
    }
}

if (require.main === module) {
    backupDatabase().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = backupDatabase;
