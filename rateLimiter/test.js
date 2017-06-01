const chai = require('chai');
const chaiHttp = require('chai-http');
const express = require('express');
const rateLimiter = require('./index.js');
const { expect } = chai;
const app = express();
const REQUEST_LIMIT = 4;
const RESET_TIME = 2000;

app.set('port', process.env.PORT || 3000);

//  Disable X-Powered-By Header
app.disable('x-powered-by');
app.listen(app.get('port'));
app.use(rateLimiter({ requestLimit: REQUEST_LIMIT, resetTime: RESET_TIME }));
app.get('/', (req, res) => {
	res.send('GETTTTTT');
});
chai.use(chaiHttp);

describe('rate limiter', function () {
	describe(`request ${REQUEST_LIMIT + 1} times`, function () {
		for (let i = 1; i <= REQUEST_LIMIT + 1; i++) {
			it(`${i} times`, function (done) {
				chai.request(app)
					.get('/')
					.end(function (err, res) {
						if (i == REQUEST_LIMIT + 1) {
							expect(res).to.have.status(429);
						}
						else {
							expect(err).to.be.null;
							expect(res).to.not.have.status(429);
						}
						done();
					});
			});
		}
	});
});
