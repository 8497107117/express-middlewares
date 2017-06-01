const chai = require('chai');
const chaiHttp = require('chai-http');
const express = require('express');
const rateLimiter = require('./index.js');
const { expect } = chai;
const app = express();
const REQUEST_LIMIT = 4;
const RESET_TIME = 3000;

app.set('port', process.env.PORT || 3000);

//  Disable X-Powered-By Header
app.disable('x-powered-by');
app.listen(app.get('port'));
app.use(rateLimiter({ requestLimit: REQUEST_LIMIT, resetTime: RESET_TIME }));
app.get('/', (req, res) => {
	res.send('GETTTTTT');
});
chai.use(chaiHttp);

//	test

describe(`send request w/ request limit: ${REQUEST_LIMIT}`, function () {
	describe(`request ${REQUEST_LIMIT + 2} times`, function () {
		for (let i = 1; i <= REQUEST_LIMIT + 2; i++) {
			it(`res #${i} should have proper status and header`, function (done) {
				chai.request(app)
					.get('/')
					.end(function (err, res) {
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
		}
	});
	describe('reset limit', function () {
		this.timeout(RESET_TIME + 3000);
		it('be going to reset', function (done) {
			setTimeout(function () {
				chai.request(app)
					.get('/')
					.end(function (err, res) {
						expect(res).to.have.status(429);
						expect(res).to.have.header('X-RateLimit-Remaining', '0');
						done();
					});
			}, RESET_TIME - 1000);
		});
		it('limit should reset', function (done) {
			setTimeout(function () {
				chai.request(app)
					.get('/')
					.end(function (err, res) {
						expect(err).to.be.null;
						expect(res).to.not.have.status(429);
						expect(res).to.have.header('X-RateLimit-Remaining', (REQUEST_LIMIT - 1).toString());
						done();
					});
			}, 1000);
		});
	});
});
