// Concepcion Transparente Scraper
var time = require('node-tictoc');
var mongoose = require('mongoose');
var http = require('http');
var debug = require('debug')('CTS:server');

var scrape = require('./scrape');
require('./models');

// Connect to database
require('dotenv').config();

function scheduleScraping() {
    var now = new Date();

    scrape();

    // La siguiente ejecución se agenda para en cuatro horas
    // var nextExecutionDelay = 4 * 60 * 60 * 1000;

    var nextExecutionDelay = 5 * 1000;

    console.log('Setting next execution after ' + (nextExecutionDelay / 1000) + ' seconds');

    setTimeout(function() {
        scheduleScraping();
    }, nextExecutionDelay);
}

mongoose.connect(
  process.env.MONGODB_URI + '?socketTimeoutMS=90000',

  function(err, db) {
    if (err) {
      console.log('Unable to connect to the server. Please start the server.', err);

      return;
    }

    console.log('Successfully connected to server');

    scheduleScraping();

    // Dado que las operaciones de Mongoose son asíncronas, cerrar esta conexión
    // resulta en problemas
    // mongoose.connection.close();
  }
);

// Connect to port to allow Heroku consider this as a running app
var server = http.createServer();

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

var port = normalizePort(process.env.PORT || '3000');
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
