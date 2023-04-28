import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { writeIonic } from './logging';

export function startSourceMapServer(folder: string) {
  writeIonic('Starting source map server on port 80....');
  http
    .createServer((request, response) => {
      const filePath = path.join(folder, request.url);
      writeIonic(`Serving ${filePath}`);

      const extname = path.extname(filePath);
      const contentType = getMimeType(extname);

      fs.readFile(filePath, (error, content) => {
        if (error) {
          if (error.code == 'ENOENT') {
            fs.readFile('./404.html', function (error, content) {
              response.writeHead(200, { 'Content-Type': contentType });
              response.end(content, 'utf-8');
            });
          } else {
            response.writeHead(500);
            response.end('Oh bummer error: ' + error.code + ' ..\n');
            response.end();
          }
        } else {
          response.writeHead(200, { 'Content-Type': contentType });
          response.end(content, 'utf-8');
        }
      });
    })
    .listen(80);
}

function getMimeType(extname: string): string {
  switch (extname) {
    case '.js':
      return 'text/javascript';
    case '.css':
      return 'text/css';
    case '.json':
      return 'application/json';
    case '.png':
      return 'image/png';
    case '.jpg':
      return 'image/jpg';
    case '.wav':
      return 'audio/wav';
  }
  return 'text/html';
}
