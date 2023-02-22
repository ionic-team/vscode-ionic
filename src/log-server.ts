import * as http from 'http';
import * as os from 'os';
import { getOutputChannel } from './extension';
import { ionicState } from './ionic-tree-provider';
import { OutputChannel } from 'vscode';
import { injectScript, removeScript } from './log-server-scripts';
import { extname, join } from 'path';
import { readFile } from 'fs';

let logServer: http.Server;

export async function startStopLogServer(folder: string): Promise<boolean> {
  const channel = getOutputChannel();
  if (logServer) {
    logServer.close();
    removeScript(folder);
    logServer = undefined;
    channel.appendLine(`[Ionic] Remote logging stopped.`);
    return true;
  }

  const port = 8942;
  const basePath = join(ionicState.context.extensionPath, 'log-client');
  logServer = http
    .createServer((request, response) => {
      let body = '';

      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Request-Method', '*');
      response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
      response.setHeader('Access-Control-Allow-Headers', '*');

      if (request.method == 'OPTIONS') {
        response.writeHead(200);
        response.end();
        return;
      }
      if (request.method == 'POST') {
        request.on('data', (chunk) => {
          body += chunk.toString();
        });
        request.on('end', () => {
          if (request.url == '/log') {
            writeLog(body, channel);
          } else if (request.url == '/devices') {
            writeDevices(body, channel);
          } else {
            channel.appendLine('[Ionic] ' + body);
          }
          response.writeHead(200);
          response.end();
        });
        // logging
        //        response.writeHead(200);
        //        response.end();
        return;
      }

      const name = request.url.includes('?') ? request.url.split('?')[0] : request.url;
      const filePath = join(basePath, name);
      const contentType = getMimeType(extname(filePath));
      readFile(filePath, (error, content) => {
        if (error) {
          if (error.code == 'ENOENT') {
            readFile('./404.html', function (error, content) {
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

  const addressInfo = getAddress();
  channel.appendLine(`[Ionic] Remote logging service has started at http://${addressInfo}:${port}`);
  removeScript(folder);
  if (!(await injectScript(folder, addressInfo, port))) {
    channel.appendLine(`[error] Unable to start remote logging (index.html or equivalent cannot be found).`);
    channel.show();
    return false;
  }
  return true;
}

function getAddress(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
}

function writeLog(body: string, channel: OutputChannel) {
  function write(level, message) {
    if (typeof message === 'object') {
      channel.appendLine(`[${level}] ${JSON.stringify(message)}`);
    } else {
      channel.appendLine(`[${level}] ${message}`);
    }
  }
  try {
    const lines = JSON.parse(body);
    console.log(lines);
    if (!Array.isArray(lines)) {
      write(lines.level, lines.message);
    } else {
      for (const line of lines) {
        write(line.level, line.message);
      }
    }
  } catch {
    channel.appendLine(body);
  }
}

function writeDevices(body: string, channel: OutputChannel) {
  try {
    const device = JSON.parse(body);
    channel.appendLine(`[Ionic] ${device.agent}`);
  } catch {
    channel.appendLine(body);
  }
}

function getMimeType(ext: string): string {
  switch (ext) {
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
