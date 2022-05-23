import * as http from 'http';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { getOutputChannel } from './extension';
import { ionicState } from './ionic-tree-provider';
import { replaceStringIn, setStringIn } from './utilities';
import { OutputChannel } from 'vscode';

let logServer: http.Server;

export function startLogServer(folder: string) {
  const channel = getOutputChannel();
  if (logServer) {
    logServer.close();
    removeInjectedScript(folder);
    logServer = undefined;
    channel.appendLine(`[Ionic] Remote logging stopped.`);
    return;
  }

  const port = 8042;
  const basePath = path.join(ionicState.context.extensionPath, 'log-client');
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
      const filePath = path.join(basePath, name);
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

  const addressInfo = getAddress();

  removeInjectedScript(folder);
  if (injectInIndexHtml(folder, addressInfo, port)) {
    channel.appendLine(
      `[Ionic] Remote logging was added to index.html (Server is running at ${addressInfo} port ${port}).`
    );
    channel.appendLine(`[Ionic] Build and run your application on a device to start logging.`);
  } else {
    channel.appendLine(`[Ionic] Error: Unable to start remote logging. index.html couldn't be found or written to.`);
  }
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

// [{"Id":"712087700","Message":"","LogLevel":"info","CodeRef":"logger (http://localhost:8100/polyfills.js:1938:22)"},{"Id":"712087700","Message":"","LogLevel":"warn","CodeRef":"new BrowserVault (http://localhost:8100/vendor.js:6246:13)"},{"Id":"712087700","Message":"","LogLevel":"log","CodeRef":"AppComponent.<anonymous> (http://localhost:8100/main.js:119:21)"},{"Id":"712087700","Message":"","LogLevel":"log","CodeRef":"Console.log (http://localhost:8100/vendor.js:86806:17)"},{"Id":"712087700","Message":"","LogLevel":"log","CodeRef":"BrowserVault.unlockCallback (http://localhost:8100/main.js:469:25)"},{"Id":"712087700","Message":"","LogLevel":"log","CodeRef":"BrowserVault.unlockCallback (http://localhost:8100/main.js:469:25)"},{"Id":"712087700","Message":"","LogLevel":"log","CodeRef":"http://192.168.0.107:8042/ionic-logger.js:1:3633"}]
function writeLog(body: string, channel: OutputChannel) {
  try {
    const lines = JSON.parse(body);
    for (const line of lines) {
      channel.appendLine(`[${line.LogLevel}] ${line.Message} ${line.stack}`);
    }
  } catch {
    channel.appendLine(body);
  }
}

// {"Id":"712087700","UserAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36 Edg/101.0.1210.53","Title":""}
function writeDevices(body: string, channel: OutputChannel) {
  try {
    const device = JSON.parse(body);
    channel.appendLine(`[Ionic] ${device.UserAgent}`);
  } catch {
    channel.appendLine(body);
  }
}

function injectInIndexHtml(folder: string, address: string, port: number): boolean {
  const indexHtml = path.join(folder, 'src', 'index.html');
  if (!fs.existsSync(indexHtml)) {
    return false;
  }
  let txt = fs.readFileSync(indexHtml, 'utf8');

  if (!txt.includes('</head>')) {
    return false;
  }
  txt = setStringIn(
    txt,
    '<head>',
    '',
    `${commentStart()}<script src="http://${address}:${port}/ionic-logger.js?${Math.random()}"></script>${commentEnd()}`
  );
  fs.writeFileSync(indexHtml, txt);
  return true;
}

function commentStart(): string {
  return '\r\n<!-- Ionic Extension Remote Logging -->';
}

function commentEnd(): string {
  return '<!--  End Ionic Extension -->\r\n';
}

function removeInjectedScript(folder: string): boolean {
  const indexHtml = path.join(folder, 'src', 'index.html');
  if (!fs.existsSync(indexHtml)) {
    return false;
  }
  let txt = fs.readFileSync(indexHtml, 'utf8');
  txt = replaceStringIn(txt, commentStart(), commentEnd(), '');
  fs.writeFileSync(indexHtml, txt);
  return true;
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
