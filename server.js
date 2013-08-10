var express = require('express'),
    app = express();

var config = JSON.parse( require('fs').readFileSync(__dirname + '/config.json') );

// Allow CORS
app.all('/*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});

// * vdl
var vdl = require('./vdl');

// ** parking
app.get('/vdl/parking.json',    vdl.parking.json);
app.get('/vdl/parking.geojson', vdl.parking.geojson);

// ** bus
app.get('/vdl/bus/routes.json', vdl.bus.routes);
app.get('/vdl/bus/:route/stops.json', vdl.bus.stops);
app.get('/vdl/bus/:route/:stop/next.json', vdl.bus.nextBuses);

// * status
app.get('/status', function(req, res) {
  res.send(200);
});

app.listen(config.port, '127.0.0.1');
app.listen(config.port, '::1');
