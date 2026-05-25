#!/usr/bin/env node
/**
 * Localtunnel fallback for Expo Go on Chromebook.
 *
 * Why a proxy is needed:
 *   localtunnel/cloudflared create HTTPS-only tunnels (port 443).
 *   Metro embeds its local port (8081) in every bundle URL it serves.
 *   Expo Go downloads the manifest fine through the tunnel, then tries
 *   to reach hostname:8081 directly — which isn't exposed — and fails.
 *
 * This script:
 *   1. Starts localtunnel pointing at a local proxy (port 8082)
 *   2. Runs a reverse proxy that forwards requests to Metro (8081)
 *      and rewrites JSON manifest responses, replacing any :8081
 *      reference with the tunnel URL so all subsequent requests
 *      go back through the tunnel end-to-end.
 *   3. Starts Metro with REACT_NATIVE_PACKAGER_HOSTNAME set so its
 *      advertised URLs use the tunnel hostname.
 *
 * Usage:  npm run start:lt
 *
 * In Expo Go → tap "Enter URL manually" → paste the printed URL.
 */

const localtunnel = require('localtunnel');
const http = require('http');
const { spawn } = require('child_process');

const METRO_PORT = 8081;
const PROXY_PORT = 8082;

(async () => {
  console.log('Starting localtunnel on proxy port', PROXY_PORT, '...');

  const tunnel = await localtunnel({ port: PROXY_PORT }).catch(err => {
    console.error('Failed to start localtunnel:', err.message);
    console.error('Try: npm install --save-dev localtunnel');
    process.exit(1);
  });

  const tunnelUrl = tunnel.url;                      // https://abc.loca.lt
  const tunnelHost = new URL(tunnelUrl).hostname;    // abc.loca.lt

  console.log('\n─────────────────────────────────────────────');
  console.log(' Tunnel active:', tunnelUrl);
  console.log(' In Expo Go → "Enter URL manually" → paste:');
  console.log('  ', tunnelUrl);
  console.log('─────────────────────────────────────────────\n');

  // Reverse proxy: lt → :PROXY_PORT → Metro :METRO_PORT
  // Intercepts JSON responses and rewrites Metro's local host:8081
  // references to the public tunnel URL so Expo Go can reach them.
  const proxy = http.createServer((req, res) => {
    const upstream = {
      hostname: '127.0.0.1',
      port: METRO_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${METRO_PORT}` },
    };

    const proxyReq = http.request(upstream, proxyRes => {
      const ct = proxyRes.headers['content-type'] || '';
      const isText = ct.includes('application/json') || ct.includes('text/plain')
        || req.url === '/' || req.url.startsWith('/?');

      if (isText) {
        let body = '';
        proxyRes.setEncoding('utf8');
        proxyRes.on('data', chunk => { body += chunk; });
        proxyRes.on('end', () => {
          // Replace every occurrence of Metro's local address with the tunnel URL.
          const rewritten = body.replace(/https?:\/\/[^"'\s\\]+:8081/g, tunnelUrl);
          const buf = Buffer.from(rewritten, 'utf8');
          const headers = {
            ...proxyRes.headers,
            'content-length': String(buf.length),
          };
          delete headers['transfer-encoding'];
          res.writeHead(proxyRes.statusCode ?? 200, headers);
          res.end(buf);
        });
      } else {
        res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
        proxyRes.pipe(res);
      }
    });

    proxyReq.on('error', () => {
      if (!res.headersSent) res.writeHead(502).end('Metro not ready — wait a moment');
    });

    req.pipe(proxyReq);
  });

  proxy.listen(PROXY_PORT, () => {
    console.log(`Proxy :${PROXY_PORT} → Metro :${METRO_PORT}`);
    console.log('Starting Expo bundler...\n');
  });

  const expo = spawn('npx', ['expo', 'start', '--clear'], {
    env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: tunnelHost },
    stdio: 'inherit',
  });

  const cleanup = () => { tunnel.close(); proxy.close(); expo.kill(); };
  process.on('SIGINT',  () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
  tunnel.on('close', () => { console.log('\nTunnel closed.'); cleanup(); process.exit(0); });
  expo.on('close', code => { cleanup(); process.exit(code ?? 0); });
})();
