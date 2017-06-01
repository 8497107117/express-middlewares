const express = require('express');
const app = express();
const middleWares = require('./index.js');
const {cors, morgan, rateLimiter} = middleWares;

app.set('port', process.env.PORT || 3000);

//  Disable X-Powered-By Header
app.disable('x-powered-by');

app.listen(app.get('port'), () => {
  console.log('Http server is listening on ' + app.get('port'));
});

app.use(cors());
app.use(morgan());
app.use(rateLimiter({ requestLimit: 4, resetTime: 3000 }));

app.get('/', (req, res) => {
  res.send('GETTTTTT');
});
