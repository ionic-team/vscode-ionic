class IonicLogger {
  constructor() {
    this.pending = undefined;
    IonicLogger._privateLog = window.console.log;
    IonicLogger._privateWarn = window.console.error;
    IonicLogger._privateError = window.console.error;
    IonicLogger._privateInfo = window.console.info;
    IonicLogger._this = this;
    window.console.log = this.log;
    window.console.warn = this.warn;
    window.console.error = this.error;
    window.console.info = this.info;
  }
  static Instance(options) {
    if (!IonicLogger.instance) {
      if (!options) options = {};
      IonicLogger.instance = new IonicLogger();
      IonicLogger.instance.initialize(options);
    }
    return IonicLogger.instance;
  }
  async post(url, data) {
    const scripts = document.getElementsByTagName('script');
    const found = Array.from(scripts).find((script) => script.src.includes('ionic-logger.js'));
    const remoteHost = new URL(found.src).hostname + ':' + new URL(found.src).port;
    if (!data) {
      return Promise.resolve();
    }
    try {
      const response = await fetch(`http://${remoteHost}${url}`, {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          //'Authorization': `bearer ${apiKey}`
        },
        body: JSON.stringify(data),
      });
    } catch {
      // Logging should cause failures
    }
    //return response.json();
  }
  write(message, _arguments, level) {
    const args = Array.prototype.slice.call(_arguments);
    let msg = message;
    args.forEach((element) => {
      if (msg != '') {
        msg += ' ';
      }
      if (typeof element == 'object') {
        msg += JSON.stringify(element);
      } else {
        msg += element;
      }
    });
    // Commenting out for now. Stack is hard as it may be in the source map
    //const stack = this.getStack();
    if (!this.pending) {
      setTimeout(() => {
        // Push pending log entries. We wait around for 1 second to see how much accumulates
        IonicLogger._this.post('/log', this.pending);
        this.pending = undefined;
      }, 500);
      this.pending = [];
    }
    this.pending.push({ Id: this.getDeviceIdentifier(), Message: msg, LogLevel: level });
  }
  getStack() {
    const stack = new Error().stack;
    const lines = stack.split('\n');
    lines.splice(0, 4);
    return lines[0].substr(7, lines[0].length - 7); // This returns just the top of the stack
  }
  log(message, ...args) {
    IonicLogger._privateLog.call(this, message, ...args);
    IonicLogger._this.write(message, args, 'log');
  }
  warn(message, ...args) {
    IonicLogger._privateWarn.call(this, message, ...args);
    IonicLogger._this.write(message, args, 'warn');
  }
  error(message, ...args) {
    IonicLogger._privateError.call(this, message, ...args);
    IonicLogger._this.write(message, args, 'error');
  }
  info(message, ...args) {
    IonicLogger._privateInfo.call(this, message, ...args);
    IonicLogger._this.write(message, args, 'info');
  }
  initialize(options) {
    let lastUrl;
    IonicLogger._this.post('/devices', {
      Id: IonicLogger._this.getDeviceIdentifier(),
      UserAgent: window.navigator.userAgent,
      Title: window.document.title,
    });
    // Report urls
    setInterval(() => {
      if (document.location.href != lastUrl) {
        lastUrl = document.location.href;
        this.log(`Url changed to ${lastUrl}`);
      }
    }, 1000);
  }
  getDeviceIdentifier() {
    if (this._deviceIdentifier) {
      return this._deviceIdentifier.toString();
    }
    const tmp = localStorage.IonicLoggerDeviceId;
    let id = parseInt(tmp);
    if (tmp == null || isNaN(id)) {
      // Create a random device identifier
      id = Math.floor(Math.random() * 999999999);
      localStorage.IonicLoggerDeviceId = id;
    }
    this._deviceIdentifier = id;
    return id.toString();
  }
}
IonicLogger.Instance({});
//# sourceMappingURL=ionic-logger.js.map
