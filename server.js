#!/usr/bin/env node
'use strict';

var express = require('express');
var boom = require('@hapi/boom');
var app = express();

// Allow CORS
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  next();
});

// * vdl
var vdl = require('./vdl');

// ** parking
app.get('/vdl/parking.:fmt?', vdl.parking.get);

// ** bus
app.get('/vdl/bus', (req, res) => res.sendStatus(501)); // vdl.bus.routes);
app.get('/vdl/bus/routes', (req, res) => res.sendStatus(501)); // vdl.bus.routes);
app.get('/vdl/bus/routes/:route/stops', (req, res) => res.sendStatus(501)); // vdl.bus.stops);
app.get('/vdl/bus/routes/:route/stops/:stop', (req, res) => res.sendStatus(501)); // vdl.bus.nextBuses);

// * status
app.get('/status', function(req, res) {
  res.sendStatus(200);
});

app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function () {
  console.info('Server listening on port ' + server.address().port);
});

process.on('SIGTERM', function () {
  console.info('Server stopping');
  server.close(function () {
    console.info('Server stopped');
    process.exit(0);
  });
});
