const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const connectDB = require('./config/db');
const routes = require('./routes');

// Kết nối MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory for project files, theses, and documents
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const thesesUploadDir = path.join(uploadsDir, 'theses');
if (!fs.existsSync(thesesUploadDir)) {
    fs.mkdirSync(thesesUploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Serve static frontend files (React Vite build)
const distPath = path.join(__dirname, '../../frontend/dist');
const frontendPath = path.join(__dirname, '../../frontend');
const staticPath = fs.existsSync(distPath) ? distPath : frontendPath;

app.use(express.static(staticPath));

// Activity Log Middleware (tự động ghi log mọi hành động quan trọng)
const activityLogMiddleware = require('./middlewares/activityLogMiddleware');
app.use('/api', activityLogMiddleware);

// API Routes
app.use('/api', routes);


// Seeding endpoint
app.get('/api/seed', async (req, res) => {
    try {
        const seedDB = require('./utils/seedData');
        await seedDB();
        res.json({ success: true, message: 'Database seeded successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Base route test
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Hệ thống Quản lý Sinh viên - Back End API đang hoạt động ổn định',
        timestamp: new Date().toISOString()
    });
});

// Global Error Handling Middleware
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);

// Fallback to Frontend index.html for Single Page Application
app.use((req, res) => {
    const indexPath = fs.existsSync(path.join(distPath, 'index.html'))
        ? path.join(distPath, 'index.html')
        : path.join(frontendPath, 'index.html');
    res.sendFile(indexPath);
});

module.exports = app;


