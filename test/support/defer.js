/**!
 * koa-generic-session - test/support/defer.js
 * Copyright(c) 2013
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

'use strict';

/**
 * Module dependencies.
 */
var koa = require('koa');
var http = require('http');
var session = require('../../');
var Store = require('./store');

module.exports = function(store) {
  store = store || new Store();

  var app = koa();

  app.name = 'koa-session-test';
  app.outputErrors = true;
  app.proxy = true; // to support `X-Forwarded-*` header

  app.use(session({
    defer: true,
    store: store,
    path: '/session'
  }));

  // will ignore repeat session
  app.use(session({
    defer: true,
    path: '/session'
  }));

  app.use(function *controllers() {
    switch (this.request.url) {
    case '/favicon.ico':
      this.staus = 404;
      break;
    case '/wrongpath':
      this.body = this.session ? 'has session' : 'no session';
      break;
    case '/session/rewrite':
      this.session = {foo: 'bar'};
      this.body = yield this.session;
      break;
    case '/session/notuse':
      nosession(this);
      break;
    case '/session/get':
      yield get(this);
      break;
    case '/session/nothing':
      yield nothing(this);
      break;
    case '/session/remove':
      yield remove(this);
      break;
    default:
      yield other(this);
    }
  });

  function nosession(ctx) {
    ctx.body = ctx._session !== undefined ? 'has session' : 'no session';
  }

  function *nothing(ctx) {
    ctx.body = (yield ctx.session).count;
  }

  function *get(ctx) {
    var session = yield ctx.session;
    session = yield ctx.session;
    session.count = session.count || 0;
    session.count++;
    ctx.body = session.count;
  }

  function *remove(ctx) {
    ctx.session = null;
    ctx.body = 0;
  }

  function *other(ctx) {
    ctx.body = ctx.session ? 'has session' : 'no session';
  }

  // app.listen(7001)
  var app = http.createServer(app.callback());
  app.store = store;

  return app;
};