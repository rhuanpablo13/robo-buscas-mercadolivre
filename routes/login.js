const express = require('express');
const router = express.Router();
const passport = require('passport');

/* GET login page. */
router.get('/', (req, res, next) => {
    if (req.query.fail)
        res.render('login', { message: 'Usuário e/ou senha incorretos!' });
    else
        res.render('login', { message: '' });
});

/* POST login page */
router.post('/',
    passport.authenticate('local', { 
        successRedirect: '/lista', 
        failureRedirect: '/login?fail=true' 
    })
);

module.exports = router;
