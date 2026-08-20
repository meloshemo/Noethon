/**
 * A static file server, in one file and with no dependencies.
 *
 * ES modules do not load over `file://`, so the game needs *a* server — and
 * asking somebody to have Python, or npx, or a particular global CLI installed
 * before they can press play is three ways for the first five minutes to go
 * wrong. This is the fourth: `npm start`.
 *
 *   node tools/serve.mjs [port]
 */

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] ?? process.env.PORT ?? 8123);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/**
 * Start the server, moving to the next free port if this one is taken.
 *
 * A stray `python -m http.server` from an hour ago should not be able to fail
 * the test suite, and on a shared machine somebody else's process on 8123 is
 * not an error worth stopping for either. The caller is told which port it
 * actually got.
 */
export async function serveFree(from = port, tries = 10) {
  for (let i = 0; i < tries; i++) {
    try {
      return await serve(from + i);
    } catch (err) {
      if (err?.code !== 'EADDRINUSE') throw err;
    }
  }
  throw new Error(`${from}–${from + tries - 1} arası boş port yok`);
}

export function serve(at = port) {
  const server = createServer(async (req, res) => {
    // Everything is served from the project root and nothing above it: a path
    // that climbs out with `..` is answered with a 403 rather than with the
    // contents of somebody's home directory.
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const rel = normalize(url === '/' ? '/index.html' : url).replace(/^(\.\.[/\\])+/, '');
    const file = join(root, rel);
    if (!file.startsWith(root)) {
      res.writeHead(403).end('403');
      return;
    }
    try {
      const info = await stat(file);
      const target = info.isDirectory() ? join(file, 'index.html') : file;
      const size = info.isDirectory() ? (await stat(target)).size : info.size;
      res.writeHead(200, {
        'content-type': TYPES[extname(target)] ?? 'application/octet-stream',
        'content-length': size,
        // Never cached: this is a development server, and a stale module is
        // half an hour of debugging a bug that was fixed twenty minutes ago.
        'cache-control': 'no-store',
      });
      createReadStream(target).pipe(res);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404');
    }
  });
  return new Promise((ok, fail) => {
    // Without this the EADDRINUSE arrives as an unhandled 'error' event and
    // takes the whole process with it, which is a hard way to find out that
    // something else is on the port.
    server.once('error', fail);
    server.listen(at, () => {
      server.removeListener('error', fail);
      ok(server);
    });
  });
}

// Run directly rather than imported: `node tools/serve.mjs`
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = await serveFree(port);
  console.log(`Pengu  →  http://localhost:${server.address().port}`);
  console.log('Durdurmak için Ctrl+C.');
}
