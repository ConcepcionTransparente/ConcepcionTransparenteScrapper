// Concepcion Transparente Scraper
var time = require('node-tictoc');
var mongoose = require('mongoose');

var scrape = require('./scrape');
require('./models');

// Connect to database
require('dotenv').config();

// mongoose.set('bufferCommands', false);
mongoose.connect(
  // TODO: Evaluar si esto podría estar en la variable de entorno
  process.env.MONGODB_URI + '?socketTimeoutMS=90000',
  // 'mongodb://127.0.0.1:27017/ct?socketTimeoutMS=90000',

  function(err, db) {
    if (err) {
      console.log('Unable to connect to the server. Please start the server.', err);

      return;
    }

    console.log('Successfully connected to server');

    time.tic();
    scrape();

    // var provider = mongoose
    //   .model('Provider')
    //   .findOneAndUpdate(
    //     { cuil: 12 },
    //     {
    //       cuil: 12,
    //       grant_title: 'sup_title12'
    //     },
    //     {
    //       upsert: true,
    //       new: true,
    //       setDefaultsOnInsert: true
    //     },
    //     function(err, result) {
    //       if (err) {
    //         console.log('Got error');

    //         console.log(err);
    //       }

    //       console.log('Done with the inserting');
    //       console.log(result);

    //       return true;
    //     }
    //   );

    // mongoose.model('Provider').find();

    // Dado que las operaciones de Mongoose son asíncronas, cerrar esta conexión
    // resulta en problemas
    // mongoose.connection.close();
    time.toc();
  }
);
