import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { musicPlaylistModule, scanMusicFiles } from './music-manifest.mjs';
const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const musicDirectory = path.join(root, 'assets', 'audio', 'music');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac', '.opus': 'audio/ogg', '.webm': 'audio/webm', '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    let data;
    if (file === path.join(musicDirectory, 'playlist.js')) {
      // Refresh from the folder on each page load, even while this server is running.
      data = Buffer.from(musicPlaylistModule(await scanMusicFiles(musicDirectory)));
    } else {
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      data = await readFile(file);
    }
    const headers = { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
    // Native music playback needs a known length and byte ranges to report its
    // duration, seek, and advance through the playlist reliably.
    if (req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      let start = 0, end = data.length - 1;
      if (match && (match[1] || match[2])) {
        start = match[1] ? Number(match[1]) : Math.max(0, data.length - Number(match[2]));
        end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
      }
      if (!match || !(match[1] || match[2]) || start >= data.length || start > end || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
        res.writeHead(416, { ...headers, 'Content-Range': `bytes */${data.length}`, 'Content-Length': 0 }).end(); return;
      }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 });
      res.end(req.method === 'HEAD' ? undefined : data.subarray(start, end + 1));
    } else {
      res.writeHead(200, { ...headers, 'Content-Length': data.length });
      res.end(req.method === 'HEAD' ? undefined : data);
    }
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Castle Strike: http://localhost:${port}/games/castlestrike/`));
