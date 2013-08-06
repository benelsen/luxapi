var express = require('express');

var app = express();

// Allow CORS
app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

// vdl

var vdl = require('./vdl');

app.get('/vdl/parking.json',    vdl.parking.json);
app.get('/vdl/parking.geojson', vdl.parking.geojson);

app.listen(4003);
