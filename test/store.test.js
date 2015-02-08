/**!
 * koa-generic-session - test/store.test.js
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
var request = require('supertest');
var mm = require('mm');
var should = require('should');
var EventEmitter = require('events').EventEmitter;
var MemoryStore = require('./../lib/memory_store');

[require('koa-redis')(), require('koa-mongodb')(), new MemoryStore()].forEach(function(store) {
  var deferApp = require('./support/defer')(store);
  var commonApp = require('./support/server')(store);

  describe('test/store.test.js', function () {
    afterEach(mm.restore);
    describe('common session middleware', function () {
      afterEach(function () {
        commonApp.store.emit('connect');
        mm.restore();
      });
      var header;
      var mockHeader = 'oFXT7g-1gwIBH4X_zMua7A43qSuu-PW_';

      it('should get session error when disconnect', function (done) {
        commonApp.store.emit('disconnect');
        request(commonApp)
        .get('/session/get')
        .expect(500)
        .expect('Internal Server Error', done);
      });

      it('should get session ok when store.get error but session not exist', function (done) {
        mm.error(commonApp.store, 'get', 'mock error');
        request(commonApp)
        .get('/session/get')
        .expect(/1/)
        .expect(200, function (err, res) {
          header = res.headers[HEADER.toLowerCase()];
          done(err);
        });
      });

      it('should get session error when store.get error', function (done) {
        mm(commonApp.store, 'get', function *() {
          throw new Error('mock get error');
        });
        request(commonApp)
        .get('/session/get')
        .set(HEADER, header)
        .expect(500, done);
      });

      it('should get /session/notuse error when store.get error', function (done) {
        mm(commonApp.store, 'get', function *() {
          throw new Error('mock get error');
        });
        request(commonApp)
        .get('/session/notuse')
        .set(HEADER, header)
        .expect(500, done);
      });

      it('should handler session error when store.set error', function (done) {
        request(commonApp)
        .get('/session/get')
        .set(HEADER, header)
        .expect(200)
        .expect(/2/, function () {
          mm(commonApp.store, 'set', function *() {
            throw new Error('mock set error');
          });
          request(commonApp)
          .get('/session/get')
          .set(HEADER, header)
          .expect(500)
          .expect(/Internal Server Error/, done);
        });
      });
    });

    describe('defer session middleware', function () {
      afterEach(function () {
        deferApp.store.emit('connect');
        mm.restore();
      });
      var header;
      var mockHeader = 'oFXT7g-1gwIBH4X_zMua7A43qSuu-PW_';

      it('should get session error when disconnect', function (done) {
        deferApp.store.emit('disconnect');
        request(deferApp)
        .get('/session/get')
        .expect(500)
        .expect('Internal Server Error', done);
      });

      it('should get session ok when store.get error but session not exist', function (done) {
        mm.error(deferApp.store, 'get', 'mock error');
        request(deferApp)
        .get('/session/get')
        .expect(/1/)
        .expect(200, function (err, res) {
          header = res.headers[HEADER.toLowerCase()];
          done(err);
        });
      });

      it('should get session error when store.get error', function (done) {
        mm(deferApp.store, 'get', function *() {
          throw new Error('mock get error');
        });
        request(deferApp)
        .get('/session/get')
        .set(HEADER, header)
        .expect(500, done);
      });

      it('should get /session/notuse ok when store.get error', function (done) {
        mm(deferApp.store, 'get', function *() {
          throw new Error('mock get error');
        });
        request(deferApp)
        .get('/session/notuse')
        .set(HEADER, header)
        .expect(200, done);
      });

      it('should handler session error when store.set error', function (done) {
        request(commonApp)
        .get('/session/get')
        .set(HEADER, header)
        .expect(200)
        .expect(/2/, function () {
          mm(commonApp.store, 'set', function *() {
            throw new Error('mock set error');
          });
          request(commonApp)
          .get('/session/get')
          .set(HEADER, header)
          .expect(500)
          .expect(/Internal Server Error/, done);
        });
      });
    });
  });
});