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

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../../frontend')));

// API Routes
app.use('/api', routes);

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
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

module.exports = app;
