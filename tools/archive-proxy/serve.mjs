#!/usr/bin/env node
// Runs the archive proxy (worker.js) on this machine, for trying it without Cloudflare: the room on
// http://localhost plays through it with ?videoproxy=http://127.0.0.1:8099/. vrlbry's zim proxy's
// serve.mjs.
//
//   node tools/archive-proxy/serve.mjs [--port 8099] [--origins <list>]
//
// --origins stands in for wrangler.toml's ALLOWED_ORIGINS (the pages that may use it; any by default).

import http from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { handle } from './worker.js';

/**
 * Serves `handler` (a Worker's fetch: Request → Response) over HTTP on this machine.
 * @returns {Promise<http.Server>}
 */
export async function serveWorker(handler, { port = 8099, host = '127.0.0.1' } = {}) {
  const server = http.createServer(async (req, res) => {
    try {
      const headers = {};
      for (const h of ['range', 'origin', 'access-control-request-method', 'access-control-request-headers']) {
        if (req.headers[h]) headers[h] = req.headers[h];
      }
      const answer = await handler(new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers }));
      res.writeHead(answer.status, Object.fromEntries(answer.headers));
      if (answer.body && req.method !== 'HEAD') {
        const body = Readable.fromWeb(/** @type {any} */ (answer.body)).on('error', () => res.destroy());
        res.on('close', () => body.destroy()); // the video seeks: it drops this part and asks for another
        body.pipe(res);
      } else res.end();
    } catch (err) {
      res.writeHead(500, { 'access-control-allow-origin': '*' });
      res.end(`${err.message}\n`);
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject); // the port taken, or reserved (Windows keeps ranges such as 8754-8953)
    server.listen(port, host, resolve);
  });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { port: { type: 'string', default: '8099' }, origins: { type: 'string', default: '*' } } });
  const server = await serveWorker((request) => {
    const t = performance.now();
    return handle(request, { origins: values.origins }).then((res) => {
      console.log(`${request.method} ${decodeURIComponent(new URL(request.url).pathname)} ${request.headers.get('range') ?? ''} → ${res.status} ${(performance.now() - t).toFixed(0)} ms`);
      return res;
    });
  }, { port: Number(values.port) });
  console.log(`The archive proxy on http://127.0.0.1:${server.address().port}/`);
}
