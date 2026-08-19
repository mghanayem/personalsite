// app.js
// ─────────────────────────────────────────────────────────────
// Hostinger startup file for the personal website.
// Hostinger runs: node app.js
// This file then runs: tsx server.ts (with production env)
// ─────────────────────────────────────────────────────────────
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsx = join(__dirname, 'node_modules', '.bin', 'tsx');

console.log('[startup] Starting personal website server...');
console.log('[startup] tsx path:', tsx);
console.log('[startup] NODE_ENV:', process.env.NODE_ENV);
console.log('[startup] PORT:', process.env.PORT);
console.log('[startup] BASE_PATH:', process.env.BASE_PATH);

const server = spawn(tsx, ['server.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
  },
});

server.on('error', (err) => {
  console.error('[startup] Failed to start server:', err.message);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`[startup] Server exited with code ${code}`);
  process.exit(code ?? 0);
});

// Forward OS signals to the child process so it shuts down cleanly
for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  process.on(signal, () => {
    console.log(`[startup] Received ${signal}, shutting down...`);
    server.kill(signal);
  });
}
