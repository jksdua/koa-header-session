/**!
 * koa-generic-session - test/session.test.js
 * Copyright(c) 2013
 * MIT Licensed
 *
 * Authors:
 *   dead_horse <dead_horse@qq.com> (http://deadhorse.me)
 */

'use strict';


var HEADER = 'X-Session-ID';


/**
 * Module dependencies.
 */

var Session = require('..');
var koa = require('koa');
var app = require('./support/server');
var request = require('supertest');
var mm = require('mm');
var should = require('should');
var EventEmitter = require('events').EventEmitter;

describe('test/session.test.js', function () {
  describe('init', function () {
    afterEach(mm.restore);
    it('should warn when in production', function (done) {
      mm(process.env, 'NODE_ENV', 'production');
      mm(console, 'warn', function (message) {
        message.should.equal('Warning: koa-generic-session\'s MemoryStore is not\n' +
        'designed for a production environment, as it will leak\n' +
        'memory, and will not scale past a single process.');
        done();
      });

      Session();
    });

    it('should listen disconnect and connect', function () {
      var store = new EventEmitter();
      Session({
        store: store
      });
      store._events.disconnect.should.be.Function;
      store._events.connect.should.be.Function;
    });
  });

  describe('use', function () {
    var header;
    var mockHeader = 'oFXT7g-1gwIBH4X_zMua7A43qSuu-PW_';

    it('should GET /session/get ok', function (done) {
      request(app)
      .get('/session/get')
      .expect(/1/)
      .end(function (err, res) {
        header = res.headers[HEADER.toLowerCase()];
        done();
      });
    });

    it('should GET /session/get second ok', function (done) {
      request(app)
      .get('/session/get')
      .set(HEADER, header)
      .expect(/2/, done);
    });

    it('should another user GET /session/get ok', function (done) {
      request(app)
      .get('/session/get')
      .expect(/1/, done);
    });

    it('should GET /session/nothing ok', function (done) {
      request(app)
        .get('/session/nothing')
        .set(HEADER, header)
        .expect(/2/, done);
    });

    it('should wrong cookie GET /session/get ok', function (done) {
      request(app)
      .get('/session/get')
      .set(HEADER, mockHeader)
      .expect(/1/, done);
    });

    it('should wrong cookie GET /session/get twice ok', function (done) {
      request(app)
      .get('/session/get')
      .set(HEADER, mockHeader)
      .expect(/1/, done);
    });

    it('should GET /wrongpath response no session', function (done) {
      request(app)
      .get('/wrongpath')
      .set(HEADER, header)
      .expect(/no session/, done);
    });

    it('should GET /session/remove ok', function (done) {
      request(app)
      .get('/session/remove')
      .set(HEADER, header)
      .expect(/0/, function () {
        request(app)
        .get('/session/get')
        .set(HEADER, header)
        .expect(/1/, done);
      });
    });

    it('should GET / error by session ok', function (done) {
      request(app)
      .get('/')
      .expect(/no session/, done);
    });

    it('should GET /session ok', function (done) {
      request(app)
      .get('/session')
      .expect(/has session/, done);
    });

    it('should rewrite session before get ok', function (done) {
      request(app)
      .get('/session/rewrite')
      .expect({foo: 'bar'}, done);
    });
  });
});
