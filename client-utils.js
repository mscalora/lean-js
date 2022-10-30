/***********************
 * 
 *  
 * 
 * 
 * 
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
      // AMD. Register as an anonymous module.
      define(['exports'], factory);
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
      // CommonJS
      factory(exports);
  } else {
      // Browser globals
      factory(root.leanjs = {});
  }
}(typeof self !== 'undefined' ? self : this, function (exports) {

  /** 
   * @typedef {object} SyncTimerState
   * @property {number} [id] timer id can be used to clear (cancel) timer with clearSyncInterval
   * @property {number} [count] count of times callback has been invoked
   * @property {number} [interval] timer interval in ms 
   * @property {number} [target] scheduled realtime timestamp
   */

  /**
   * create an interval timer synced to the real-time clock (best effort)
   * @param {callback<SyncTimerState>} callback callable to be invoked
   * @param {number} interval milliseconds between each invocation of callback 
   * @returns {number} timer id
   */
  function setSyncInterval(callback, interval) {
    const MAX_DRIFT = 15,
        state = {id: Date.now(), count: 0, interval: interval};
    window.SYNC_INTERVAL_TIMERS = window.SYNC_INTERVAL_TIMERS || {};
    window.SYNC_INTERVAL_TIMERS[state.id] = state;
    function schedule () {
      let now = Date.now(),
          target = now + 10 + interval - (now+10) % interval;
      state.timer = setTimeout(() => {
        callback({id: state.id, count: state.count++, interval: interval, target: target});
        schedule();
      }, target - Date.now());
    }
    if (window.SYNC_INTERVAL_TIMERS[state.id]) {
      schedule();
    }
    return state.id;
  }

  /**
   * stop syn interval timer
   * @param {number} id timer id to stop
   */
  function clearSyncInterval(id) {
    clearTimeout(window.SYNC_INTERVAL_TIMERS[id].timer);
    delete window.SYNC_INTERVAL_TIMERS[id];
  }

  /** 
   * @typedef {object} xgetOptions
   * @property {callback<XMLHttpRequest>} [beforeOpen] called just before open()
   * @property {callback<XMLHttpRequest>} [afterOpen] called just after open()
   * @property {boolean} [responseOnly] default: false
   */

  /**
   * perform http request async, no auth so only publicly readable data may be retrieved
   * @param url
   * @param {XMLHttpRequestResponseType} [responseType] defaults to 'text' unless url ends in '.json', then 'json'
   * @param {Function|xgetOptions} [options] chance to modify request
   * @returns {Promise<XMLHttpRequest>} resolves
   */
  function xget(url, responseType, options) {
    const defaultOptions = {
          beforeOpen: null, // callback (XMLHttpRequest)
          afterOpen: null, // callback (XMLHttpRequest)
          responseOnly: false, // return just the "response" property of the XMLHttpRequest
        },
        xhr = new XMLHttpRequest(),
        optionsObj = typeof options === 'function' ? {beforeOpen: options} : options,
        opts = Object.assign({}, defaultOptions, optionsObj),
        promise = new Promise(function (resolve, reject) {
          xhr.addEventListener('load', function () {
            resolve(xhr);
          });
          xhr.addEventListener('error', function (errorEvent) {
            xhr.errorEvent = errorEvent;
            reject(xhr);
          });
          xhr.responseType = typeof responseType === 'string' ? responseType : /\.json$/.test(url) ? 'json' : 'text';
          if (opts.beforeOpen) {
            opts.beforeOpen(xhr);
          }
          xhr.open('GET', url);
          xhr.send();
        });
    Object.defineProperty(promise, 'xhr', {
      value: xhr
    });
    return promise;
  }

  /**
   * @property {object} object - The object to query
   * @property {string} path - The path of the property to get
   * @property {object} fallback - The default value to return if no value found in path
   * @returns {*} Returns the resolved value (undefined / fallback value / value found).
   */
  function get(object, path, fallback) {
    const dot = path.indexOf('.');
    
    if (object === undefined) {
      return fallback || undefined;
    }
    
    if (dot === -1) {
      if (path.length && path in object) {
        return object[path];
      }
      
      return fallback;
    }
    
    return get(object[path.substr(0, dot)], path.substr(dot + 1), fallback);
  }

  exports.setSyncInterval = setSyncInterval;
  exports.clearSyncInterval = clearSyncInterval;
  exports.xget = xget;
  exports.get = get;
}));