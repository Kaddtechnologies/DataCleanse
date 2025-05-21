const { spawn } = require('child_process');
const { platform } = require('os');

// Start Next.js development server
const nextProcess = spawn('npx', ['next', 'dev', '--turbopack', '-p', '9003'], {
  stdio: 'inherit',
  shell: true
});

// Wait a moment for the server to start
setTimeout(() => {
  // Open browser based on platform
  const openCommand = platform() === 'win32' ? 'start' : platform() === 'darwin' ? 'open' : 'xdg-open';
  const browserProcess = spawn(openCommand, ['http://localhost:9003'], {
    stdio: 'inherit',
    shell: true
  });

  browserProcess.on('error', (err) => {
    console.error('Failed to open browser:', err);
  });
}, 3000); // Wait 3 seconds before opening browser

// Handle process termination
process.on('SIGINT', () => {
  nextProcess.kill('SIGINT');
  process.exit(0);
});
