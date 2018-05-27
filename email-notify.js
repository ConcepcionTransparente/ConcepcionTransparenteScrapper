var mongoose = require('mongoose');
const nodemailer = require('nodemailer');

function sendEmailNotification(data) {
  var currentDate = new Date();
  var nextExecutionDate = new Date(currentDate.getTime() + data.nextExecutionDelay);
  var emailHtmlContent = `<strong>Concepción Transparente - Scrapper</strong><br />`
    + `<br />`
    + `Scrapping completado a las: <b>${currentDate}</b><br />`
    + `Actualmente se cuenta en la base de datos con:<br />`
    + `<i>Cantidad de proveedores: ${data.cantidadProveedores}</i><br />`
    + `<i>Cantidad de órdenes de compra: ${data.cantidadOrdenesCompra}</i><br />`
    + `<br />`
    + `<br />`
    + `Siguiente scrapping programado para: <b>${nextExecutionDate}</b><br />`;

  var transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
      }
  });

  var mailOptions = {
      from: process.env.EMAIL_SEND_FROM,
      to: process.env.EMAIL_SEND_TO,
      subject: 'Concepción Transparente - Scrapper',
      html: emailHtmlContent
  };

  transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
          return console.log(error);
      }

      console.log('Email notification sent: %s', info.messageId);
  });
}

module.exports = function(nextExecutionDelay) {
  mongoose
    .connect(process.env.MONGODB_URI + '?socketTimeoutMS=90000')
    .then(function () {
      return mongoose
        .model('PurchaseOrder')
        .count()
        .exec()
        .then(function(cantidadOrdenesCompra) {
          return mongoose
            .model('Provider')
            .count()
            .exec()
            .then(function(cantidadProveedores) {
              mongoose.connection.close();

              sendEmailNotification({
                cantidadProveedores,
                cantidadOrdenesCompra,
                nextExecutionDelay
              });
            })
        });
    })
    .then(function() {
      console.log('Email notification completed');
    });
}
