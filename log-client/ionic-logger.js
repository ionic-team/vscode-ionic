var __awaiter =
    (this && this.__awaiter) ||
    function (t, a, c, s) {
      return new (c = c || Promise)(function (n, e) {
        function r(t) {
          try {
            i(s.next(t));
          } catch (t) {
            e(t);
          }
        }
        function o(t) {
          try {
            i(s.throw(t));
          } catch (t) {
            e(t);
          }
        }
        function i(t) {
          var e;
          t.done
            ? n(t.value)
            : ((e = t.value) instanceof c
                ? e
                : new c(function (t) {
                    t(e);
                  })
              ).then(r, o);
        }
        i((s = s.apply(t, a || [])).next());
      });
    },
  __generator =
    (this && this.__generator) ||
    function (r, o) {
      var i,
        a,
        c,
        s = {
          label: 0,
          sent: function () {
            if (1 & c[0]) throw c[1];
            return c[1];
          },
          trys: [],
          ops: [],
        },
        t = { next: e(0), throw: e(1), return: e(2) };
      return (
        'function' == typeof Symbol &&
          (t[Symbol.iterator] = function () {
            return this;
          }),
        t
      );
      function e(n) {
        return function (t) {
          var e = [n, t];
          if (i) throw new TypeError('Generator is already executing.');
          for (; s; )
            try {
              if (
                ((i = 1),
                a &&
                  (c = 2 & e[0] ? a.return : e[0] ? a.throw || ((c = a.return) && c.call(a), 0) : a.next) &&
                  !(c = c.call(a, e[1])).done)
              )
                return c;
              switch (((a = 0), (e = c ? [2 & e[0], c.value] : e)[0])) {
                case 0:
                case 1:
                  c = e;
                  break;
                case 4:
                  return s.label++, { value: e[1], done: !1 };
                case 5:
                  s.label++, (a = e[1]), (e = [0]);
                  continue;
                case 7:
                  (e = s.ops.pop()), s.trys.pop();
                  continue;
                default:
                  if (!(c = 0 < (c = s.trys).length && c[c.length - 1]) && (6 === e[0] || 2 === e[0])) {
                    s = 0;
                    continue;
                  }
                  if (3 === e[0] && (!c || (e[1] > c[0] && e[1] < c[3]))) {
                    s.label = e[1];
                    break;
                  }
                  if (6 === e[0] && s.label < c[1]) {
                    (s.label = c[1]), (c = e);
                    break;
                  }
                  if (c && s.label < c[2]) {
                    (s.label = c[2]), s.ops.push(e);
                    break;
                  }
                  c[2] && s.ops.pop(), s.trys.pop();
                  continue;
              }
              e = o.call(r, s);
            } catch (t) {
              (e = [6, t]), (a = 0);
            } finally {
              i = c = 0;
            }
          if (5 & e[0]) throw e[1];
          return { value: e[0] ? e[1] : void 0, done: !0 };
        };
      }
    },
  __spreadArray =
    (this && this.__spreadArray) ||
    function (t, e, n) {
      if (n || 2 === arguments.length)
        for (var r, o = 0, i = e.length; o < i; o++)
          (!r && o in e) || ((r = r || Array.prototype.slice.call(e, 0, o))[o] = e[o]);
      return t.concat(r || Array.prototype.slice.call(e));
    },
  IonicLogger = (function () {
    function i() {
      (this.pending = void 0),
        (i._privateLog = window.console.log),
        (i._privateWarn = window.console.error),
        (i._privateError = window.console.error),
        (i._privateInfo = window.console.info),
        (i._this = this),
        (window.console.log = this.log),
        (window.console.warn = this.warn),
        (window.console.error = this.error),
        (window.console.info = this.info);
    }
    return (
      (i.Instance = function (t) {
        return i.instance || ((t = t || {}), (i.instance = new i()), i.instance.initialize(t)), i.instance;
      }),
      (i.prototype.post = function (n, r) {
        return __awaiter(this, void 0, void 0, function () {
          var e;
          return __generator(this, function (t) {
            switch (t.label) {
              case 0:
                if (
                  ((e = document.getElementsByTagName('script')),
                  (e = Array.from(e).find(function (t) {
                    return t.src.includes('ionic-logger.js');
                  })),
                  (e = new URL(e.src).hostname + ':' + new URL(e.src).port),
                  !r)
                )
                  return [2, Promise.resolve()];
                t.label = 1;
              case 1:
                return (
                  t.trys.push([1, 3, , 4]),
                  [
                    4,
                    fetch('http://'.concat(e).concat(n), {
                      method: 'post',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(r),
                    }),
                  ]
                );
              case 2:
                return t.sent(), [3, 4];
              case 3:
                return t.sent(), [3, 4];
              case 4:
                return [2];
            }
          });
        });
      }),
      (i.prototype.write = function (t, e, n) {
        var r = this,
          e = Array.prototype.slice.call(e),
          o = t;
        e.forEach(function (t) {
          '' != o && (o += ' '), (o += 'object' == typeof t ? JSON.stringify(t) : t);
        }),
          this.pending ||
            (setTimeout(function () {
              i._this.post('/log', r.pending), (r.pending = void 0);
            }, 500),
            (this.pending = [])),
          this.pending.push({ Id: this.getDeviceIdentifier(), Message: o, LogLevel: n });
      }),
      (i.prototype.getStack = function () {
        var t = new Error().stack.split('\n');
        return t.splice(0, 4), t[0].substr(7, t[0].length - 7);
      }),
      (i.prototype.log = function (t) {
        for (var e, n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
        (e = i._privateLog).call.apply(e, __spreadArray([this, t], n, !1)), i._this.write(t, n, 'log');
      }),
      (i.prototype.warn = function (t) {
        for (var e, n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
        (e = i._privateWarn).call.apply(e, __spreadArray([this, t], n, !1)), i._this.write(t, n, 'warn');
      }),
      (i.prototype.error = function (t) {
        for (var e, n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
        (e = i._privateError).call.apply(e, __spreadArray([this, t], n, !1)), i._this.write(t, n, 'error');
      }),
      (i.prototype.info = function (t) {
        for (var e, n = [], r = 1; r < arguments.length; r++) n[r - 1] = arguments[r];
        (e = i._privateInfo).call.apply(e, __spreadArray([this, t], n, !1)), i._this.write(t, n, 'info');
      }),
      (i.prototype.initialize = function (t) {
        var e,
          n = this;
        i._this.post('/devices', {
          Id: i._this.getDeviceIdentifier(),
          UserAgent: window.navigator.userAgent,
          Title: window.document.title,
        }),
          setInterval(function () {
            document.location.href != e && ((e = document.location.href), n.log('Url changed to '.concat(e)));
          }, 1e3);
      }),
      (i.prototype.getDeviceIdentifier = function () {
        if (this._deviceIdentifier) return this._deviceIdentifier.toString();
        var t = localStorage.IonicLoggerDeviceId,
          e = parseInt(t);
        return (
          (null != t && !isNaN(e)) ||
            ((e = Math.floor(999999999 * Math.random())), (localStorage.IonicLoggerDeviceId = e)),
          (this._deviceIdentifier = e).toString()
        );
      }),
      i
    );
  })();
IonicLogger.Instance({});
