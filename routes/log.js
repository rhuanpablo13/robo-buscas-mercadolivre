var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/log', function(req, res, next) {
  res.redirect('../../app/log.txt')
});

module.exports = router;
