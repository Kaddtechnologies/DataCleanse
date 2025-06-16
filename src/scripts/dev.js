// Dev helper: start Next.js, automatically switch to a free port if the default
// one is busy and open the browser cross-platform (Windows, macOS, Linux/WSL).

const { spawn } = require('child_process');
const { platform } = require('os');
const net = require('net');

const DEFAULT_PORT = Number(process.env.PORT) || 9003;

/**
 * Recursively find the first free TCP port starting at the given one.
 * @param {number} port
 * @returns {Promise<number>}
 */
function findFreePort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      // Port in use → try the next port
      server.close(() => resolve(findFreePort(port + 1)));
    });

    server.once('listening', () => {
      const { port: freePort } = server.address();
      server.close(() => resolve(freePort));
    });

    server.listen(port, '0.0.0.0');
  });
}

/**
 * Open the default browser in a cross-platform way.
 * Falls back gracefully under WSL/Linux.
 * @param {string} url
 */
function openBrowser(url) {
  const plt = platform();

  if (plt === 'win32') {
    // 'start' is an internal cmd.exe command → must invoke through cmd
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' });
  } else if (plt === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' });
    } else {
      // Linux / WSL handling
      if (process.env.WSL_DISTRO_NAME) {
        // We are inside WSL → ask Windows to open the URL
        spawn('cmd.exe', ['/c', 'start', '', url], {
          detached: true,
          stdio: 'ignore'
        });
      } else {
        // Native Linux: try wslview first (if installed) then fall back to xdg-open
        const opener = 'wslview';
        const child = spawn(opener, [url], {
          detached: true,
          stdio: 'ignore'
        });
        child.on('error', () => {
          spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
        });
      }
    }
}

(async () => {
  const port = await findFreePort(DEFAULT_PORT);
  const url = `http://localhost:${port}`;

  console.log(`➡  Starting Next.js on ${url}`);

    // Start Next.js development server
    // Invoke the local Next.js CLI directly to avoid the npm / npx lookup delay.
    const nextExecutable = process.platform === 'win32' ? 'next.cmd' : 'next';
    const nextProcess = spawn(
      nextExecutable,
      ['dev', '--turbo', '-p', String(port)],
      { stdio: 'inherit', shell: true }
    );

  // Give Next.js some time to compile before opening the browser
  setTimeout(() => openBrowser(url), 5_000);

  // Ensure the child process dies when we exit
  const cleanExit = () => {
    if (!nextProcess.killed) nextProcess.kill('SIGINT');
    process.exit(0);
  };

  process.on('SIGINT', cleanExit);
  process.on('SIGTERM', cleanExit);
  process.on('exit', cleanExit);
})();
