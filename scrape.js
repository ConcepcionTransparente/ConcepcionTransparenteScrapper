var error = [];

var Xray = require('x-ray');
var mongoose = require('mongoose');

// Throttle the requests to n requests per ms milliseconds.
var x = Xray().throttle(10, 1000);

var options = {
  upsert: true,
  new: true,
  setDefaultsOnInsert: true
};

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

function parseImporteStringAsFloat(m) {
  var y = m.replace(/\./g, '').replace(/\,/g, '.');
  y = parseFloat(y);

  return y;
}

// Convert month and year in date
function stringToDate(month, year) {
  // new Date(year, month, day, hours, minutes, seconds, milliseconds)
  var d = new Date(year, month, 01,00,00,00,00);
  d.toISOString().slice(0, 10);

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

    lineasProveedor.slice(0, 1).map(procesarProveedorDeAnio, {
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

    lineasRubros.slice(0, 1).map(procesarRubroDeProveedor, {
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

    lineasMeses.slice(0, 1).map(persistir, {
      category: lineaRubro,
      provider: parentObject.provider,
      year: parentObject.year,
      total_amount: parentObject.total_amount
    });
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
  mongoose
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
      options
    )
    .exec()
    .catch(function(error) {
      console.log('Got error while updating PurchaseOrder');
      console.log(error);
    });
}

function updateProvider(proveedor, childObject) {
  // Insertar categoría
  mongoose
    .model('Category')
    .findOneAndUpdate(
      { category: childObject.category },
      {
        cod: childObject.cod,
        category: childObject.category
      },
      options
    )
    .exec()
    .then(function(categoria) {
      updateCategoria(proveedor, categoria, childObject);
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
  mongoose
    .model('Provider')
    .findOneAndUpdate(
      { cuil: childObject.cuil },
      {
        cuil: childObject.cuil,
        grant_title: childObject.grant_title
      },
      options
    )
    .exec()
    .then(function(proveedor) {
      updateProvider(proveedor, childObject);
    })
    .catch(function(error) {
      console.log('Got error while calling updateProvider');
      console.log(error);
    });

  mongoose
    .model('Year')
    .findOneAndUpdate(
      { year: childObject.year },
      {
        year: childObject.year,
        total_contrats: childObject.total_contrats,
        totalAmount: totalImport
      },
      options
    )
    .exec()
    .catch(function(error) {
      console.log('Got error while updating Year');
      console.log(error);
    });
};

module.exports = function() {
  console.log('Waving!');
  return;

  var url = 'http://www.cdeluruguay.gob.ar/datagov/proveedoresContratados.php';

  // Reporte: Proveedores Contratados
  x(url, 'body tr.textoTabla', [{
    year: 'td', // Año
    total_amount: 'td:nth-of-type(4)', // Importe de ese proveedor en ese año
    href: 'td:nth-of-type(8) a@href' // a@href a Ver por proveedores
  }])(function(err, lineasAnios) {
    lineasAnios.slice(0, 1).map(procesarAnio);
  });

  if (error.length > 0) {
    throw new Error('Got errors');
  }

  return;
};
