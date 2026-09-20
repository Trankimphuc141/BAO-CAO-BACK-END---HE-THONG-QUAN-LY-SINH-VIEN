// Antigravity Server Init
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io accessible in controllers via req.app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    const handleJoin = (data) => {
        const userId = typeof data === 'string' ? data : (data?.userId || data?.id);
        if (userId) {
            socket.join(String(userId));
            console.log(`👤 Socket ${socket.id} joined user room: ${userId}`);
        }
        const role = typeof data === 'object' ? data?.role : null;
        if (role) {
            socket.join(String(role));
            console.log(`🎭 Socket ${socket.id} joined role room: ${role}`);
        }
    };

    socket.on('join-room', handleJoin);
    socket.on('join', handleJoin);

    socket.on('disconnect', () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket (Socket.IO) ready`);
});