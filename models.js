var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Float = require('mongoose-float').loadType(mongoose, 2);

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
