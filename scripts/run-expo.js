const net = require('net');
const { spawn } = require('child_process');
const path = require('path');

function isPortOpen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findFreePort(startPort) {
  let port = startPort;
  while (port < startPort + 20) {
    if (await isPortOpen(port)) {
      return port;
    }
    port += 1;
  }
  return startPort;
}

async function main() {
  const preferredPort = Number(process.env.EXPO_PORT || 8082);
  const port = await findFreePort(preferredPort);
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = ['expo', 'start', '--web', '--port', String(port)];

  process.env.CI = '1';
  process.env.EXPO_NO_TELEMETRY = '1';
  console.log(`[expo-launcher] Starting Expo on port ${port}`);

  const child = spawn(command, args, {
    cwd: path.resolve(__dirname, '..', 'apps', 'mobile'),
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  child.on('exit', (code) => process.exit(code ?? 1));
}

main().catch((error) => {
  console.error('[expo-launcher] Error:', error);
  process.exit(1);
});
