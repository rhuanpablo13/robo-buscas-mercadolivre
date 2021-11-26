var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  const file = `${__dirname.replace('routes', '')}/log.txt`;
  res.download(file); // Set disposition and send it.
});

module.exports = router;
