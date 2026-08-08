import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const root = import.meta.dirname;
const port = Number(process.env.PORT || 4173);
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  try {
    const body = await readFile(resolve(root, file));
    response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Local: http://127.0.0.1:${port}`);
});
