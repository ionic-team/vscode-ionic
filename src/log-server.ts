import * as http from 'http';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { getOutputChannel } from './extension';
import { ionicState } from './ionic-tree-provider';

let logServer: http.Server;

export function startLogServer(folder: string) {
  const channel = getOutputChannel();
  if (logServer) {
    logServer.close(() => {
      logServer = undefined;
      channel.appendLine(`[Ionic] Remote logging stopped.`);
    });
    channel.appendLine(`[Ionic] Stopping remote logging...`);
    return;
  }

  const port = 8042;
  const basePath = path.join(ionicState.context.extensionPath, 'log-client');
  logServer = http
    .createServer((request, response) => {
      const filePath = path.join(basePath, request.url);
      channel.appendLine(`[Ionic] Serving ${filePath}`);

      if (request.method == 'OPTIONS') {
        response.writeHead(200);
        response.end;
        return;
      }
      if (request.method == 'POST') {
        if (request.url == '/log') {
          // logging
        }
      }

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
    .listen(port);

  const addressInfo = listAddresses(true);

  channel.appendLine(
    `[Ionic] Remote logging has started on ${addressInfo} port ${port} and the remote logging script was added to index.html.`
  );
  channel.appendLine(`[Ionic] Build and run your application on a device to start logging.`);
}

function listAddresses(asText: boolean): any {
  const nets = os.networkInterfaces();
  const results = {};
  const text = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        text.push(`${net.address} (${name})`);
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }
  if (asText) {
    return text.join(', ');
  }
  return results;
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
