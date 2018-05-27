// Concepcion Transparente Scraper
var time = require('node-tictoc');
var http = require('http');

require('./models');
require('dotenv').config();

var scrape = require('./scrape');
var emailNotify = require('./email-notify');

/**
 * Schedule a scraping involves performing the actual scraping and also setting the
 * next execution.
 *
 * @return {[type]} [description]
 */
function scheduleScraping() {
  scrape()
    .then(function() {
      // La siguiente ejecución se agenda para en cuatro horas
      $hours = 12;
      $minutes = 0;
      $seconds = 0;

      var nextExecutionDelay =
        ($hours * 60 * 60 * 1000)
          + ($minutes * 60 * 1000)
          + ($seconds * 1000);

      if (process.env.EMAIL_HOST) {
        emailNotify(nextExecutionDelay);
      }

      setTimeout(function() {
          scheduleScraping();
      }, nextExecutionDelay)
    });
}

scheduleScraping();

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

  console.log('Listening on ' + bind);
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
