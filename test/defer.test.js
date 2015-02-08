/**!
 * koa-generic-session - test/defer.test.js
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
var app = require('./support/defer')();
var request = require('supertest');
var mm = require('mm');
var should = require('should');
var EventEmitter = require('events').EventEmitter;

describe('test/defer.test.js', function () {

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

    it('should GET /session/notuse response no session', function (done) {
      request(app)
      .get('/session/notuse')
      .set(HEADER, header)
      .expect(/no session/, done);
    });

    it('should GET /wrongpath response no session', function (done) {
      request(app)
      .get('/wrongpath')
      .set(HEADER, header)
      .expect(/no session/, done);
    });

    it('should wrong header GET /session/get ok', function (done) {
      request(app)
      .get('/session/get')
      .set(HEADER, mockHeader)
      .expect(/1/, done);
    });

    it('should wrong header GET /session/get twice ok', function (done) {
      request(app)
      .get('/session/get')
      .set(HEADER, mockHeader)
      .expect(/1/, done);
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

    it('should GET /session/remove before get ok', function (done) {
      request(app)
      .get('/session/remove')
      .expect(/0/, done);
    });

    it('should rewrite session before get ok', function (done) {
      request(app)
      .get('/session/rewrite')
      .expect({foo: 'bar'}, done);
    });
  });
});
