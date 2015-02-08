/**!
 * koa-header-session - lib/memory_store.js
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

var debug = require('debug')('koa-header-session:memory_store');

var EventEmitter = require('events').EventEmitter;

var MemoryStore = module.exports = function () {
  EventEmitter.call(this);
  this.sessions = {};
};

MemoryStore.prototype = Object.create(EventEmitter.prototype);

MemoryStore.prototype.get = function *(sid) {
  debug('get value %j with key %s', this.sessions[sid], sid);
  return this.sessions[sid];
};

MemoryStore.prototype.set = function *(sid, val) {
  debug('set value %j for key %s', val, sid);
  this.sessions[sid] = val;
};

MemoryStore.prototype.destroy = function *(sid) {
  delete this.sessions[sid];
};
