/**!
 * koa-header-session - lib/session.js
 * Copyright(c) 2013 - 2014
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

'use strict';

/**
 * Module dependencies.
 */

var debug = require('debug')('koa-header-session:session');
var MemoryStore = require('./memory_store');
var crc32 = require('crc').crc32;
var parse = require('parseurl');
var Store = require('./store');
var uid = require('uid-safe');

/**
 * Warning message for `MemoryStore` usage in production.
 */

var warning = 'Warning: koa-header-session\'s MemoryStore is not\n' +
  'designed for a production environment, as it will leak\n' +
  'memory, and will not scale past a single process.';

/**
 * setup session store with the given `options`
 * @param {Object} options
 *   - [`store`] session store instance, default to MemoryStore
 *   - [`ttl`] store ttl in `ms`, default to oneday
 *   - [`prefix`] session prefix for store, defaulting to `koa:sess:`
 *   - [`defer`] defer get session,
 *   - [`rolling`]  rolling session, always reset the cookie and sessions, default is false
 *     you should `yield this.session` to get the session if defer is true, default is false
 *   - [`genSid`] you can use your own generator for sid
 *   - [`errorHanlder`] handler for session store get or set error
 *
 *   - [`path`] Allowed path for sessions, default to `/`
 *   - [`header`] HTTP header used for session ids, default to `X-Session-ID`
 */

module.exports = function (options) {
  options = options || {};
  options.ttl = options.ttl || 24 * 60 * 60 * 1000; //one day in ms
  options.path = options.path || '/';
  var header = options.header || 'X-Session-ID';
  var client = options.store || new MemoryStore();
  var errorHandler = options.errorHandler || defaultErrorHanlder;

  var store = new Store(client, {
    ttl: options.ttl,
    prefix: options.prefix
  });

  var genSid = options.genSid || uid;

  var storeAvailable = true;

  // notify user that this store is not
  // meant for a production environment
  if (client instanceof MemoryStore) console.warn(warning);

  store.on('disconnect', function() { storeAvailable = false; });
  store.on('connect', function() { storeAvailable = true; });

  // save empty session hash for compare
  var EMPTY_SESSION_HASH = hash(generateSession());

  return options.defer ? deferSession : session;

  /**
   * generate a new session
   */
  function generateSession() {
    return {};
  }

  /**
   * check url match cookie's path
   */
  function matchPath(ctx) {
    var pathname = parse(ctx).pathname;

    if (pathname.indexOf(options.path || '/') !== 0) {
      debug('session path not match');
      return false;
    }
    return true;
  }

  /**
   * get session from store
   *   get sessionId from cookie
   *   save sessionId into context
   *   get session from store
   */
  function *getSession() {
    if (!storeAvailable) {
      debug('store is disconnect');
      throw new Error('session store error');
    }

    if (!matchPath(this)) return;

    if (!this.sessionId) {
	    this.sessionId = this.get(header);
	}

    var session;
    var isNew = false;
    if (!this.sessionId) {
      debug('session id not exist, generate a new one');
      session = generateSession();
      this.sessionId = yield genSid.call(this, 24);
      isNew = true;
    } else {
      try {
        session = yield store.get(this.sessionId);
        debug('get session %j with key %s', session, this.sessionId);
      } catch (err) {
        if (err.code === 'ENOENT') {
          debug('get session error, code = ENOENT');
        } else {
          debug('get session error: ', err.message);
        }
        errorHandler(err, 'get', this);
      }
    }

    if (!session) {
      debug('can not get with key:%s from session store, generate a new one', this.sessionId);
      session = generateSession();
      this.sessionId = yield genSid.call(this, 24);
      isNew = true;
    }

    // get the originHash
    var originalHash = !isNew && hash(session);

    return {
      status: 200,
      originalHash: originalHash,
      session: session,
      isNew: isNew
    };
  }

  /**
   * after everything done, refresh the session
   *   if session === null; delete it from store
   *   if session is modified, update cookie and store
   */
  function *refreshSession (session, originalHash, isNew) {
    //delete session
    if (!session) {
      if (!isNew) {
        debug('session set to null, destroy session: %s', this.sessionId);
        return yield store.destroy(this.sessionId);
      }
      return debug('a new session and set to null, ignore destroy');
    }

    var newHash = hash(session);
    // if new session and not modified, just ignore
    if (!options.allowEmpty && isNew && newHash === EMPTY_SESSION_HASH) {
      return debug('new session and do not modified');
    }

    // rolling session will always reset cookie and session
    if (!options.rolling && newHash === originalHash) {
      return debug('session not modified');
    }

    debug('session modified');

    //update session
    try {
      yield store.set(this.sessionId, session);
      debug('saved');
    } catch (err) {
      debug('set session error: ', err.message);
      errorHandler(err, 'set', this);
    }
  }

  /**
   * common session middleware
   * each request will generate a new session
   *
   * ```
   * var session = this.session;
   * ```
   */
  function *session(next) {
    this.sessionStore = store;
    if (this.session) {
      return yield *next;
    }
    var result = yield *getSession.call(this);
    if (!result) {
      return yield* next;
    }

    this.session = result.session;
    yield *next;
    yield *refreshSession.call(this, this.session, result.originalHash, result.isNew);
  }

  /**
   * defer session middleware
   * only generate and get session when request use session
   *
   * ```
   * var session = yield this.session;
   * ```
   */
  function *deferSession(next) {
    this.sessionStore = store;

    if (this.session) {
      return yield *next;
    }
    var isNew = false;
    var originalHash = null;
    var touchSession = false;
    var getter = false;

    // if path not match
    if (!matchPath(this)) {
      return yield *next;
    }

    this.__defineGetter__('session', function *() {
      if (touchSession) {
        return this._session;
      }
      touchSession = true;
      getter = true;

      var result = yield *getSession.call(this);
      // if cookie path not match
      // this route's controller should never use session
      if (!result) return;

      originalHash = result.originalHash;
      isNew = result.isNew;
      this._session = result.session;
      return this._session;
    });

    this.__defineSetter__('session', function (value) {
      touchSession = true;
      this._session = value;
    });

    yield *next;

    if (touchSession) {
      // if only this.session=, need try to decode and get the sessionID
      if (!getter) {
        this.sessionId = this.get(header);
      }

      yield *refreshSession.call(this, this._session, originalHash, isNew);
    }
  }
};

/**
 * get the hash of a session include options.
 */
function hash(sess) {
  return crc32.signed(JSON.stringify(sess));
}

function defaultErrorHanlder (err, type, ctx) {
  err.name = 'koa-header-session ' + type + ' error';
  throw err;
}

module.exports.MemoryStore = MemoryStore;