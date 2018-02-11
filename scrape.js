var Xray = require('x-ray');

function monthStringToNumber(m) {
  if (m == 'Enero') {
    return 00;
  } else if (m == 'Febrero') {
    return 01;
  } else if (m == 'Marzo') {
    return 02;
  } else if (m == 'Abril') {
    return 03;
  } else if (m == 'Mayo') {
    return 04;
  } else if (m == 'Junio') {
    return 05;
  } else if (m == 'Julio') {
    return 06;
  } else if (m == 'Agosto') {
    return 07;
  } else if (m == 'Septiembre') {
    return 08;
  } else if (m == 'Octubre') {
    return 09;
  } else if (m == 'Noviembre') {
    return 10;
  } else if (m == 'Diciembre') {
    return 11;
  } else {
    return 13;
  }
}

// Convert month and year in date
function stringToDate(month, year) {
  // new Date(year, month, day, hours, minutes, seconds, milliseconds)
  var d = new Date(year, month, 01,00,00,00,00);
  d.toISOString().slice(0, 10);

  console.log('fecha: ' + d);

  return d;
}

function procesarAnio(lineaAnio) {
  x(lineaAnio.href, 'body tr.textoTabla', [{
    cuil: 'td', // CUIL proveedor: Código único de identificación laboral
    grant_title: 'td:nth-of-type(2)', // Nombre de fantasia del proveedor
    total_contrats: 'td:nth-of-type(4)', // Cantidad de contrataciones en ese año
    href: 'td:nth-of-type(8) a@href' // a@href a Ver por rubros
  }])(function(err, lineasProveedor) {
    if (lineasProveedor == null) {
      error.push(lineasProveedor);

      return;
    }

    lineasProveedor.map(procesarProveedorDeAnio, {
      year: lineaAnio.year,
      total_amount: lineaAnio.total_amount
    });
  });
}

function procesarProveedorDeAnio(lineaProveedor) {
  var parentObject = this;

  x(lineaProveedor.href, 'body tr.textoTabla', [{
    cod: 'td', // Código del rubro
    category: 'td:nth-of-type(2)', // Nombre del rubro
    href: 'td:nth-of-type(7) a@href' // a@href a Meses
  }])(function(err, lineasRubros) {
    if (lineasRubros == null) {
      error.push(lineasRubros);

      return;
    }

    lineasRubros.map(procesarRubroDeProveedor, {
      provider: lineaProveedor,
      year: parentObject.year,
      total_amount: parentObject.total_amount
    });
  });
};

function procesarRubroDeProveedor(lineaRubro) {
  var parentObject = this;

  x(lineaRubro.href, 'body tr.textoTabla', [{
    month: 'td', // Mes
    numberOfContracts: 'td:nth-of-type(2)', // Cantidad de contratos
    import: 'td:nth-of-type(4)' // Importe para ese mes
  }])(function(err, lineasMeses) {
    if (lineasMeses == null) {
      error.push(lineasMeses);

      return;
    }

    lineasMeses.map(normalizar, {
      category: lineaRubro,
      provider: parentObject.provider,
      year: parentObject.year,
      total_amount: parentObject.total_amount
    });
  });
};

function normalizar(o) {
  console.log('counter');
  console.log(counter);

  counter = counter + 1;
  var parentObject = this;
  var year = parseInt(parentObject.year); // Año

  var childObject = {
    year: year, // Year
    cuil: parentObject.provider.cuil, // Proveedor
    grant_title: parentObject.provider.grant_title, // Proveedor
    total_amount: parentObject.total_amount, // Importe de ese proveedor en UN AÑO
    total_contrats: parentObject.provider.total_contrats, // Cantidas de contrataciones en UN AÑO
    cod: parentObject.category.cod, // Codigo del rubro
    category: parentObject.category.category, // Nombre del rubro (reparticion)
    month: o.month, // Mes
    numberOfContracts: o.numberOfContracts, // Cantidad de contratos para ese mes
    import: o.import // Importe en ese mes
  };

  /**
   * Cada objeto a normalizar cuenta con:
   *
   *   * year
   *   * cuil
   *   * grant_title
   *   * cod
   *   * category
   *   * month
   *   * numberofcontracts
   *   * import
   */

  var monthNumber = monthStringToNumber(childObject.month);
  var newDate = stringToDate(monthNumber, childObject.year);

  year = parseInt(year);

  // Convert import to correct float number
  function nuevoImporte(m) {
    var y = m.replace(/\./g, '').replace(/\,/g, '.');
    y = parseFloat(y);

    return y;
  }

  var w = nuevoImporte(childObject.import);
  var z = nuevoImporte(childObject.total_amount);
  var partialImport = parseFloat(w); //importe de un proveedor en un cierto mes
  var totalImport = parseFloat(z); //importe total para el años correspondiente a esta fila

  var updateProvider = {
    cuil: childObject.cuil,
    grant_title: childObject.grant_title
  };

  var options = {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  };

  // mongoose
  //     .model('Provider')
  //     .findOneAndUpdate(
  //         {
  //             cuil: childObject.cuil
  //         },
  //         updateProvider,
  //         options,
  //         function(err, result1) {
  //             if (err) {
  //                 console.log(err);
  //                 return;
  //             }

  //             console.log("updateando provider");
  //             console.log("result1:" + result1);

  //             // Insercion de category
  //             var updateCategory = {
  //                 cod: childObject.cod,
  //                 category: childObject.category
  //             };
  //             mongoose.model('Category').findOneAndUpdate({
  //                 // cod: childObject.cod,
  //                 category: childObject.category
  //             }, updateCategory, options, function(err, result2) {
  //                 if (err) {
  //                     console.log(err);
  //                     return;
  //                 }
  //                 // console.log("result2" + result2);
  //                 // console.log("------------------------------------- RESULT1-ID: " + result1._id);
  //                 // console.log("------------------------------------- RESULT2-ID: " + result2._id);

  //                 //insercion de orden de compra
  //                 var Purchase = {
  //                     year: childObject.year,
  //                     month: monthNumber,
  //                     date: newDate,
  //                     numberOfContracts: childObject.numberOfContracts,
  //                     import: partialImport,
  //                     fk_Provider: result1._id,
  //                     fk_Category: result2._id
  //                 };
  //                 mongoose.model('PurchaseOrder').findOneAndUpdate({
  //                     year: childObject.year,
  //                     month: monthNumber,
  //                     date: newDate,
  //                     numberOfContracts: childObject.numberOfContracts,
  //                     import: partialImport,
  //                     fk_Provider: result1._id,
  //                     fk_Category: result2._id
  //                 }, Purchase, options, function(err, purchase) {
  //                     if (err) {
  //                         console.log("ERROR AL INSERTAR PURCHASE EN LA DATABASE: ");
  //                         console.log(err);
  //                         return;
  //                     }
  //                     console.log("NEW PURCHASE: " );
  //                     console.log(Purchase);
  //                 }); //END INSERT PURCHASE
  //                 // return;
  //                 // console.log("NEW CATEGORY: " + result2);

  //             }); //END UPDATE CATEGORY
  //             // return;
  //             // console.log("NEW PROVIDER: " + result1);

  //             // result.status(200).send(result);
  //         }
  //     );

  var updateYear = {
    year: childObject.year,
    total_contrats: childObject.total_contrats,
    totalAmount: totalImport
  };

  // mongoose
  //     .model('Year')
  //     .findOneAndUpdate(
  //         {
  //             year: childObject.year
  //         },
  //         updateYear,
  //         options,
  //         function(err, years) {
  //             if (err) {
  //                 console.log(err);
  //                 return;
  //             } else {
  //                 // console.log("NEW YEAR: " + years);
  //             }
  //         }
  //     );
};

module.exports = function() {
  console.log('Start scrapping');

  // Throttle the requests to n requests per ms milliseconds.
  var x = Xray().throttle(10, 1000);
  var counter = 0;

  var error = [];
  var url = 'http://www.cdeluruguay.gob.ar/datagov/proveedoresContratados.php';

  // Reporte: Proveedores Contratados
  x(url, 'body tr.textoTabla', [{
    year: 'td', // Año
    total_amount: 'td:nth-of-type(4)', // Importe de ese proveedor en ese año
    href: 'td:nth-of-type(8) a@href' // a@href a Ver por proveedores
  }])(function(err, lineasAnios) {
    lineasAnios.map(procesarAnio)
  });

  return;
};
