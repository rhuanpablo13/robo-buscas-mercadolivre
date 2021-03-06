const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const passport = require('passport');
const session = require('express-session');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const loginRouter = require('./routes/login');
const listaRouter = require('./routes/lista');
const logRouter   = require('./routes/log');


function authenticationMiddleware(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login?fail=true');
}

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.set('port', process.env.PORT || 3001);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

require('./auth')(passport);
app.use(session({  
  secret: '123',//configure um segredo seu aqui,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 60 * 1000 }//30min
}))
app.use(passport.initialize());
app.use(passport.session());


app.use('/log', logRouter);
app.use('/login', loginRouter);
app.use('/users', authenticationMiddleware, usersRouter);
app.use('/', authenticationMiddleware,  indexRouter);
app.use('/lista', authenticationMiddleware, listaRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const main = require('./resources/main');
const cron = require('./resources/cron');
const resources = require('./resources/resources');
const servidorEmails = require('./resources/servidorEmails');
const connection = require('./resources/connections');


(async () => {
  let con = connection.getConnection()
  if (con != null) {
    resources.setConnection(con)
    await cron.roboCron()
    // await resources.roboCron()
    // await main.executarRobo()    
    // await servidorEmails.enviarEmailTeste('rhuanpablo13@hotmail.com')
  }
})();

module.exports = app;
