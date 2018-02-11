// Concepcion Transparente Scraper

var time = require('node-tictoc');
var mongoose = require('mongoose');
var Float = require('mongoose-float').loadType(mongoose, 2);
var Schema = mongoose.Schema;

var scrape = require('./scrape');

// Define models
mongoose.model('Year', new Schema({
  year: Number,
  numberOfContracts: Number,
  totalAmount: { type: Float },
  budget: {type: Float }
}));

mongoose.model('Provider', new Schema({
  cuil: Number,
  grant_title: String
}));

mongoose.model('Category', new Schema({
  cod : String,
  category: String // Repartición
}));

mongoose.model('PurchaseOrder', new Schema({
  year: String,
  month: String,
  date: Date,
  numberOfContracts: Number, // Cantidad de contrataciones
  import: { type: Float }, // Importe
  fk_Provider: {type: Schema.ObjectId, ref: "Provider"},
  fk_Category: {type: Schema.ObjectId, ref: "Category"}
}));

// Connect to database
require('dotenv').config();

mongoose.set('bufferCommands', false);
mongoose.connect(
  // TODO: Evaluar si esto podría estar en la variable de entorno
  process.env.MONGODB_URI + '?socketTimeoutMS=90000',
  function(err, db) {
    if (err) {
      console.log('Unable to connect to the server. Please start the server.', err);

      return;
    }

    console.log('Successfully connected to server');

    time.tic();

    scrape();

    mongoose.connection.close();
    time.toc();
  }
);
