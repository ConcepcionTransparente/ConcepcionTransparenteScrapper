var error = [];

var Xray = require('x-ray');
var mongoose = require('mongoose');

function printMemoryUsage() {
  console.log('---------------------');
  console.log('Memory usage:')
  const used = process.memoryUsage();
  for (var key in used) {
    console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  }
  console.log('---------------------');
}

// Throttle the requests to n requests per ms milliseconds.
var requestPerSecond = parseInt(process.env.REQUEST_PER_SECOND) || 5;
console.log('Initializing x-ray with ' + requestPerSecond + ' request per second');

var x = Xray().throttle(requestPerSecond, 1000);

var findOneAndUpdateOptions = {
  upsert: true,
  new: true,
  setDefaultsOnInsert: true
};

function monthStringToNumber(m) {
  if (m == 'Enero') {
    return 0;
  } else if (m == 'Febrero') {
    return 1;
  } else if (m == 'Marzo') {
    return 2;
  } else if (m == 'Abril') {
    return 3;
  } else if (m == 'Mayo') {
    return 4;
  } else if (m == 'Junio') {
    return 5;
  } else if (m == 'Julio') {
    return 6;
  } else if (m == 'Agosto') {
    return 7;
  } else if (m == 'Septiembre') {
    return 8;
  } else if (m == 'Octubre') {
    return 9;
  } else if (m == 'Noviembre') {
    return 10;
  } else if (m == 'Diciembre') {
    return 11;
  } else {
    return 13;
  }
}

function parseImporteStringAsFloat(m) {
  var y = m.replace(/\./g, '').replace(/\,/g, '.');
  y = parseFloat(y);

  return y;
}

// Convert month and year in date
function stringToDate(month, year) {
  // new Date(year, month, day, hours, minutes, seconds, milliseconds)
  var d = new Date(year, month, 1, 0, 0, 0, 0);
  d.toISOString().slice(0, 10);

  return d;
}

function procesarAnio(lineaAnio) {
  return x(lineaAnio.href, 'body tr.textoTabla', [{
    cuil: 'td', // CUIL proveedor: Código único de identificación laboral
    grant_title: 'td:nth-of-type(2)', // Nombre de fantasia del proveedor
    total_contrats: 'td:nth-of-type(4)', // Cantidad de contrataciones en ese año
    href: 'td:nth-of-type(8) a@href' // a@href a Ver por rubros
  }])
    .then(function(lineasProveedor) {
      if (lineasProveedor == null) {
        error.push(lineasProveedor);

        return;
      }

      if (process.env.MAX_PROVEEDORES_POR_ANIO) {
        lineasProveedor = lineasProveedor.slice(0, parseInt(process.env.MAX_PROVEEDORES_POR_ANIO));
      }

      return Promise.all(
        // The second argument to the map function refers the whatever it is going
        // to be referenced by 'this' on the invoked function.
        // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
        lineasProveedor.map(procesarProveedorDeAnio, {
          year: lineaAnio.year,
          total_amount: lineaAnio.total_amount
        })
      );
    })
    .catch(function(error) {
      console.log('Got error while executing procesarAnio');
      console.log(error);
    });
}

function procesarProveedorDeAnio(lineaProveedor) {
  var parentObject = this;

  return x(lineaProveedor.href, 'body tr.textoTabla', [{
    cod: 'td', // Código del rubro
    category: 'td:nth-of-type(2)', // Nombre del rubro
    href: 'td:nth-of-type(7) a@href' // a@href a Meses
  }])
    .then(function(lineasRubros) {
      if (lineasRubros == null) {
        error.push(lineasRubros);

        return;
      }

      if (process.env.MAX_RUBROS_POR_PROVEEDOR) {
        lineasRubros = lineasRubros.slice(0, parseInt(process.env.MAX_RUBROS_POR_PROVEEDOR));
      }

      return Promise.all(
        lineasRubros.map(procesarRubroDeProveedor, {
          provider: lineaProveedor,
          year: parentObject.year,
          total_amount: parentObject.total_amount
        })
      );
    })
    .catch(function(error) {
      console.log('Got error while executing procesarProveedorDeAnio');
      console.log(error);
    });
};

function procesarRubroDeProveedor(lineaRubro) {
  var parentObject = this;

  return x(lineaRubro.href, 'body tr.textoTabla', [{
    month: 'td', // Mes
    numberOfContracts: 'td:nth-of-type(2)', // Cantidad de contratos
    import: 'td:nth-of-type(4)' // Importe para ese mes
  }])
    .then(function(lineasMeses) {
      if (lineasMeses == null) {
        error.push(lineasMeses);

        return;
      }

      if (process.env.MAX_MESES_POR_RUBRO) {
        lineasMeses = lineasMeses.slice(0, parseInt(process.env.MAX_MESES_POR_RUBRO));
      }

      return Promise.all(
        lineasMeses.map(persistir, {
          category: lineaRubro,
          provider: parentObject.provider,
          year: parentObject.year,
          total_amount: parentObject.total_amount
        })
      );
    })
    .catch(function(error) {
      console.log('Got error while procesarRubroDeProveedor');
      console.log(error);
    });
};

function updateCategoria(proveedor, categoria, childObject) {
  var monthNumber = monthStringToNumber(childObject.month);
  var newDate = stringToDate(monthNumber, childObject.year);

  // Importe de un proveedor en un cierto mes
  var partialImport = parseFloat(
    parseImporteStringAsFloat(childObject.import)
  );

  // Insertar orden de compra
  return mongoose
    .model('PurchaseOrder')
    .findOneAndUpdate(
      {
        year: childObject.year,
        month: monthNumber,
        date: newDate,
        numberOfContracts: childObject.numberOfContracts,
        import: partialImport,
        fk_Provider: proveedor._id,
        fk_Category: categoria._id
      },
      {
        year: childObject.year,
        month: monthNumber,
        date: newDate,
        numberOfContracts: childObject.numberOfContracts,
        import: partialImport,
        fk_Provider: proveedor._id,
        fk_Category: categoria._id
      },
      {
        upsert: true,
        new: false,
        setDefaultsOnInsert: true
      }
    )
    .exec()
    .then(function(purchaseOrder) {
      if (purchaseOrder) {
        console.log('Orden de compra actualizada');
      } else {
        console.log('Orden de compra creada');
      }
    })
    .catch(function(error) {
      console.log('Got error while updating PurchaseOrder');
      console.log(error);
    });
}

function updateProvider(proveedor, childObject) {
  // Insertar categoría
  return mongoose
    .model('Category')
    .findOneAndUpdate(
      { category: childObject.category },
      {
        cod: childObject.cod,
        category: childObject.category
      },
      findOneAndUpdateOptions
    )
    .exec()
    .then(function(categoria) {
      console.log('Categoría persistida: ' + childObject.category);

      printMemoryUsage();

      return updateCategoria(proveedor, categoria, childObject);
    })
    .catch(function(error) {
      console.log('Got error while calling updateCategoria');
      console.log(error);
    });
}

function persistir(lineaMes) {
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
    month: lineaMes.month, // Mes
    numberOfContracts: lineaMes.numberOfContracts, // Cantidad de contratos para ese mes
    import: lineaMes.import // Importe en ese mes
  };

  // Importe total para el años correspondiente a esta fila
  var totalImport = parseFloat(
    parseImporteStringAsFloat(childObject.total_amount)
  );

  // See: http://mongoosejs.com/docs/4.x/docs/api.html
  var updateProviderPromise = mongoose
    .model('Provider')
    .findOneAndUpdate(
      { cuil: childObject.cuil },
      {
        cuil: childObject.cuil,
        grant_title: childObject.grant_title
      },
      findOneAndUpdateOptions
    )
    .exec()
    .then(function(proveedor) {
      console.log('Proveedor persistido: ' + childObject.grant_title);

      printMemoryUsage();

      return updateProvider(proveedor, childObject);
    })
    .catch(function(error) {
      console.log('Got error while calling updateProvider');
      console.log(error);
    });

  var updateYearPromise = mongoose
    .model('Year')
    .findOneAndUpdate(
      { year: childObject.year },
      {
        year: childObject.year,
        total_contrats: childObject.total_contrats,
        totalAmount: totalImport
      },
      findOneAndUpdateOptions
    )
    .exec()
    .then(function() {
      console.log('Anio persistdo: ' + childObject.year);

      printMemoryUsage();
    })
    .catch(function(error) {
      console.log('Got error while updating Year');
      console.log(error);
    });

  return Promise.all([updateProviderPromise, updateYearPromise]);
};

module.exports = function() {
  console.log('Inicializando scrapping.');

  return mongoose
    .connect(process.env.MONGODB_URI + '?socketTimeoutMS=90000')
    .then(function () {
      console.log('Successfully connected to server');

      var url = 'http://www.cdeluruguay.gob.ar/datagov/proveedoresContratados.php';

      // Reporte: Proveedores Contratados
      return x(url, 'body tr.textoTabla', [{
        year: 'td', // Año
        total_amount: 'td:nth-of-type(4)', // Total de importe de ese año
        href: 'td:nth-of-type(8) a@href' // a@href a Ver por proveedores
      }])
        .then(function(lineasAnios) {
          if (process.env.MAX_ANIOS) {
            lineasAnios = lineasAnios.slice(0, parseInt(process.env.MAX_ANIOS));
          }

          return Promise.all(lineasAnios.map(procesarAnio));
        })
        .then(function () {
          console.log('Done. Closing connection.');

          printMemoryUsage();

          // En este punto es seguro cerrar la conexión de Mongoose porque se supone
          // que ya todo lo que se tenía que hacer se hizo
          mongoose.connection.close();
        })
        .catch(function(error) {
          console.log('Got error while parsing report');
          console.log(error);
        });
    })
    .catch(function (error) {
      console.log('Unable to connect to the server. Please start the server.')
      console.log(error);

      return;
    });
};
