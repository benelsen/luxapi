var express = require('express'),
    app = express();

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

// status
app.get('/status', function(req, res) {
  res.send(200);
})

app.listen(4003);
