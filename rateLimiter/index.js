'use strict'

const redis = require("redis");
const client = redis.createClient();
const REQUEST_LIMIT = 1000;
const RESET_TIME = 3600000;

client.on("error", (err) => {
	console.log(err);
});

const getIPRemaing = (ip) => {
	return new Promise((resolve, reject) => {
		client.hgetall(ip, (err, obj) => {
			if (err) reject(err);
			resolve(obj);
		});
	});
};

const setIPRemaing = (ip, obj, { requestLimit, resetTime }) => {
	return new Promise((resolve, reject) => {
		const now = +new Date();
		let newValue;
		newValue = {
			remaining: obj ? obj.remaining - 1 : requestLimit - 1,
			resetTime: obj ? obj.resetTime : new Date(now + resetTime)
		};
		client.hmset(ip, newValue);
		if (!obj) {
			client.expireat(ip, parseInt(now / 1000) + resetTime / 1000);
		}
		resolve(newValue);
	});
};

async function checkLimit(ip, config) {
	const oldRemaining = await getIPRemaing(ip);
	const newRemaining = await setIPRemaing(ip, oldRemaining, config);
	return newRemaining;
};

const rateLimiter = (config = { requestLimit: REQUEST_LIMIT, resetTime: RESET_TIME }) => (req, res, next) => {
	checkLimit(req.ip, config)
		.then(({ remaining, resetTime }) => {
			res.set({
				'X-RateLimit-Remaining': remaining >= 0 ? remaining : 0,
				'X-RateLimit-Reset': resetTime
			});
			if (remaining >= 0) {
				next();
			}
			else {
				res.sendStatus(429);
			}
		});
};

module.exports = rateLimiter;
