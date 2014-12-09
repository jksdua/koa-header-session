/**!
 * koa-generic-session - lib/store.js
 * Copyright(c) 2014
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

'use strict';

/**
 * Module dependencies.
 */

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('koa-generic-session:store');
var copy = require('copy-to');

var defaultOptions = {
  prefix: 'koa:sess:'
};

function Store(client, options) {
  this.client = client;
  this.options = {};
  copy(options).and(defaultOptions).to(this.options);
  EventEmitter.call(this);

  // delegate client connect / disconnect event
  if (typeof client.on === 'function') {
    client.on('disconnect', this.emit.bind(this, 'disconnect'));
    client.on('connect', this.emit.bind(this, 'connect'));
  }
}

util.inherits(Store, EventEmitter);

Store.prototype.get = function *(sid) {
  var data;
  sid = this.options.prefix + sid;
  debug('GET %s', sid);
  data = yield this.client.get(sid);
  if (!data) {
    debug('GET empty');
    return null;
  }

  debug('GOT %j', data);
  return data;
};

Store.prototype.set = function *(sid, sess) {
  var ttl = this.options.ttl;

  sid = this.options.prefix + sid;
  debug('SET key: %s, value: %s, ttl: %d', sid, sess, ttl);
  yield this.client.set(sid, sess, ttl);
  debug('SET complete');
};

Store.prototype.destroy = function *(sid) {
  sid = this.options.prefix + sid;
  debug('DEL %s', sid);
  yield this.client.destroy(sid);
  debug('DEL %s complete', sid);
};

module.exports = Store;
