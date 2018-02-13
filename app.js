// Concepcion Transparente Scraper
var time = require('node-tictoc');
var mongoose = require('mongoose');

var scrape = require('./scrape');
require('./models');

// Connect to database
require('dotenv').config();

function scheduleScraping() {
    var now = new Date();

    scrape();

    // La siguiente ejecución se agenda para en dos horas
    var nextExecutionDelay = 0.5 * 60 * 1000;

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
