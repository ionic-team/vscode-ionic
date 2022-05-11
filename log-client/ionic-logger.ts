class IonicLogger {
  private static instance: IonicLogger;

  public static Instance(options) {
    if (!IonicLogger.instance) {
      if (!options) options = {};
      IonicLogger.instance = new IonicLogger();
      IonicLogger.instance.initialize(options);
    }
    return IonicLogger.instance;
  }

  private static _privateLog;
  private static _privateWarn;
  private static _privateError;
  private static _privateInfo;
  private _deviceIdentifier;
  private pending = undefined;
  private static _this;

  async post(url: string, data: any): Promise<any> {
    // TODO: Replace dynamically
    const remoteHost = '192.168.0.112:8042';

    const response: Response = await fetch(`http://${remoteHost}${url}`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        //'Authorization': `bearer ${apiKey}`
      },
      body: JSON.stringify(data),
    });
    //return response.json();
  }

  private write(_arguments, level) {
    const args = Array.prototype.slice.call(_arguments);
    let msg = '';
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
    const stack = this.getStack();
    if (!this.pending) {
      setTimeout(() => {
        // Push pending log entries. We wait around for 1 second to see how much accumulates
        IonicLogger._this.post('/log', this.pending);
        this.pending = undefined;
      }, 1000);
      this.pending = [];
    }
    this.pending.push({ Id: this.getDeviceIdentifier(), Message: msg, LogLevel: level, CodeRef: stack });
  }

  private getStack(): string {
    const stack = new Error().stack;
    const lines = stack.split('\n');
    lines.splice(0, 4);
    return lines[0].substr(7, lines[0].length - 7); // This returns just the top of the stack
  }

  public log(message, ...args) {
    IonicLogger._this.write(args, 'log');
    IonicLogger._privateLog.apply(this, args);
  }

  public warn(message, ...args) {
    IonicLogger._this.write(args, 'warn');
    IonicLogger._privateWarn.apply(this, args);
  }

  public error(message, ...args) {
    IonicLogger._this.write(args, 'error');
    IonicLogger._privateError.apply(this, args);
  }

  public info(message, ...args) {
    IonicLogger._this.write(args, 'info');
    IonicLogger._privateInfo.apply(this, args);
  }

  constructor() {
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

  public initialize(options) {
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

  private getDeviceIdentifier(): string {
    if (this._deviceIdentifier) {
      return this._deviceIdentifier.toString();
    }
    const tmp = localStorage.IonicLoggerDeviceId;
    let id: number = parseInt(tmp);
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
