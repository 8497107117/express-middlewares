const chai = require('chai');
const chaiHttp = require('chai-http');
const express = require('express');
const {
	getIPRemaing,
	setIPRemaing,
	checkLimit,
	rateLimiter
} = require('./index.js');
const { expect } = chai;
const app = express();
const REQUEST_LIMIT = 4;
const RESET_TIME = 3000;

app.set('port', process.env.PORT || 3000);
app.disable('x-powered-by');
app.listen(app.get('port'));
app.use(rateLimiter({ requestLimit: REQUEST_LIMIT, resetTime: RESET_TIME }));
app.get('/', (req, res) => {
	res.send('GETTTTTT');
});
chai.use(chaiHttp);


describe('set info of ip to redis', function () {
	describe('value of origin key is null', function () {
		this.timeout(RESET_TIME + 3000);
		it('it should set proper config and return config in promise', function (done) {
			setIPRemaing('test', null, { requestLimit: REQUEST_LIMIT, resetTime: RESET_TIME })
				.then(info => {
					expect(typeof info).to.be.string('object');
					expect(info.remaining).to.equal(REQUEST_LIMIT - 1);
					expect((new Date().getTime() - info.resetTime.getTime()) < 100).to.be.true;
					done();
				});
		});
		it('it should reset the value of the key right after reset time', function (done) {
			setTimeout(function () {
				getIPRemaing('test')
					.then(info => {
						expect(typeof info).to.be.string('object');
						expect(info).to.be.null;
						done();
					});
			}, RESET_TIME);
		});
	});
	describe('value of origin key is defined', function () {
		let oldValue;
		before(function (done) {
			setIPRemaing('test', null, { requestLimit: REQUEST_LIMIT, resetTime: RESET_TIME })
				.then(info => {
					oldValue = info;
					done();
				});
		});
		this.timeout(RESET_TIME + 3000);
		for (let i = 2; i < REQUEST_LIMIT + 4; i++) {
			it(`it should set proper config and return config in promise: remaining = ${REQUEST_LIMIT - i} `, function (done) {
				setIPRemaing('test', oldValue, { requestLimit: REQUEST_LIMIT, resetTime: RESET_TIME })
					.then(info => {
						expect(typeof info).to.be.string('object');
						expect(info.remaining).to.equal(REQUEST_LIMIT - i);
						expect((info.resetTime.getTime() - new Date().getTime()) > 0).to.be.true;
						oldValue = info;
						done();
					});
			});
		}
		it('it should reset the value of the key right after reset time', function (done) {
			setTimeout(function () {
				getIPRemaing('test')
					.then(info => {
						expect(typeof info).to.be.string('object');
						expect(info).to.be.null;
						done();
					});
			}, RESET_TIME);
		});
	});
});

describe('integration w/ http and redis', function () {
	describe(`send request w/ request limit: ${REQUEST_LIMIT} and reset time: ${RESET_TIME}`, function () {
		describe(`request ${REQUEST_LIMIT + 2} times`, function () {
			for (let i = 1; i <= REQUEST_LIMIT + 2; i++) {
				//	get info of ip from redis before request
				it(`res #${i} should get proper info of ip from redis before request`, function (done) {
					getIPRemaing('::ffff:127.0.0.1')
						.then(info => {
							expect(typeof info).to.be.string('object');
							if (i == 1) {
								expect(info).to.be.null;
							}
							else {
								expect(info.remaining).to.equal((REQUEST_LIMIT - i + 1).toString());
								expect(new Date(info.resetTime).getTime()).to.be.above(new Date().getTime());
							}
							done();
						});
				});
				//	behavior and integration w/ http
				it(`res #${i} should have proper status and header`, function (done) {
					chai.request(app)
						.get('/')
						.end(function (err, res) {
							const resetTime = res.headers['x-ratelimit-reset'];
							expect(new Date(resetTime).getTime()).to.be.above(new Date().getTime());
							if (i > REQUEST_LIMIT) {
								expect(res).to.have.status(429);
								expect(res).to.have.header('X-RateLimit-Remaining', '0');
							}
							else {
								expect(err).to.be.null;
								expect(res).to.not.have.status(429);
								expect(res).to.have.header('X-RateLimit-Remaining', (REQUEST_LIMIT - i).toString());
							}
							done();
						});
				});
				//	get info of ip from redis after request
				it(`res #${i} should get proper info of ip from redis after request`, function (done) {
					getIPRemaing('::ffff:127.0.0.1')
						.then(info => {
							expect(typeof info).to.be.string('object');
							expect(info.remaining).to.equal((REQUEST_LIMIT - i).toString());
							expect(new Date(info.resetTime).getTime()).to.be.above(new Date().getTime());
							done();
						});
				});
			}
		});
		describe('reset limit', function () {
			this.timeout(RESET_TIME + 3000);
			describe('before reset', function () {
				it('it should get proper info of ip from redis before reset', function (done) {
					setTimeout(function () {
						getIPRemaing('::ffff:127.0.0.1')
							.then(info => {
								expect(typeof info).to.be.string('object');
								expect(info.remaining <= 0).to.be.true;
								expect(new Date(info.resetTime).getTime()).to.be.above(new Date().getTime());
								done();
							});
					}, RESET_TIME - 1000);
				});
				it('request limit still 0', function (done) {
					chai.request(app)
						.get('/')
						.end(function (err, res) {
							const resetTime = res.headers['x-ratelimit-reset'];
							expect(new Date(resetTime).getTime()).to.be.above(new Date().getTime());
							expect(res).to.have.status(429);
							expect(res).to.have.header('X-RateLimit-Remaining', '0');
							done();
						});
				});
			});
			describe('right after reset', function () {
				it('it should get proper info of ip from redis after reset', function (done) {
					setTimeout(function () {
						getIPRemaing('::ffff:127.0.0.1')
							.then(info => {
								expect(typeof info).to.be.string('object');
								expect(info).to.be.null;
								done();
							});
					}, 1000);
				});
			});
		});
	});
});
