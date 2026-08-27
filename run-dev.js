const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'BAO-CAO-BACK-END---HE-THONG-QUAN-LY-SINH-VIEN/backend');
const frontendDir = path.join(rootDir, 'BAO-CAO-BACK-END---HE-THONG-QUAN-LY-SINH-VIEN/frontend');

console.log('🚀 Đang khởi động đồng thời cả Backend (Port 5000) và Frontend (Vite Port 3000)...');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// 1. Start Backend Dev
const backendProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true
});

// 2. Start Frontend Dev
const frontendProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log('\n🛑 Đang tắt toàn bộ server dev...');
  try { backendProcess.kill(); } catch (e) {}
  try { frontendProcess.kill(); } catch (e) {}
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
