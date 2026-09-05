const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');
const routes = require('./routes');

// Kết nối MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files (React Vite build)
const fs = require('fs');
const distPath = path.join(__dirname, '../../frontend/dist');
const frontendPath = path.join(__dirname, '../../frontend');
const staticPath = fs.existsSync(distPath) ? distPath : frontendPath;

app.use(express.static(staticPath));

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

// Fallback to Frontend index.html for Single Page Application
app.use((req, res) => {
    const indexPath = fs.existsSync(path.join(distPath, 'index.html'))
        ? path.join(distPath, 'index.html')
        : path.join(frontendPath, 'index.html');
    res.sendFile(indexPath);
});

module.exports = app;
