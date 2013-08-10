// *** Dependencies ***
// Node:
// External:
var jsdom = require('jsdom'),
    _ = require('lodash'),
    Memcached = require('memcached');

_.str = require('underscore.string');
_.mixin(_.str.exports());

var config = JSON.parse( require('fs').readFileSync(__dirname + '/../config.json') );

var memcached = new Memcached(config.memcached.servers, {
  timeout: 1000
});

function getRoutesFromSource(callback) {

  var url = 'http://service.vdl.lu/hotcity/mobility/index.php?city=vdl&service=bus';

  jsdom.env(
    url,
    function (err, window) {
      if ( err ) console.error(err);

      var stops = window.document.querySelectorAll('ul > li > a');

      var data = [];

      for (var i = 0; i < stops.length; i++) {

        var routeNumber = stops[i].querySelector('img').alt;
        routeNumber = ~~routeNumber.slice( routeNumber.indexOf(':')+2 );

        var route = stops[i].querySelector('h1').innerHTML.replace('<br />', '').trim();

        if ( route.indexOf('-') < 0 ) continue;

        data.push({
          number: routeNumber,
          start:  route.slice(0, route.indexOf('-')-1 ),
          end:    route.slice(route.indexOf('-')+2 ),
          link:   encodeURI(_.template('/vdl/bus/${ number }/stops.json', {
            number: routeNumber
          }))
        });
      }

      callback( null, data );
    }
  );

}


function getRoutes(callback) {

  var key = config.memcached.prefix + '-bus-routes';

  memcached.get(key, function (err, cached) {
    if ( err ) console.error(err);

    if ( !err && cached ) {

      return callback(err, cached);

    } else {

      getRoutesFromSource(function(err, data) {
        if ( err ) console.error(err);

        memcached.set(key, data, 24*60*60, function(err) {
          if ( err ) console.error(err);
        });

        return callback(err, data);

      });

    }

  });
}

function getStopsOnRouteFromSource(route, callback) {

  var urlTemplate = 'http://service.vdl.lu/hotcity/mobility/index.php?city=vdl&service=bus&routeId=${ route }';

  var url = _.template(urlTemplate, {
    route: route
  });

  jsdom.env(
    url,
    function (err, window) {
      if ( err ) console.error(err);

      var stops = window.document.querySelectorAll('ul > li > a > h1');

      var data = [];

      for (var i = 0; i < stops.length; i++) {
        var stop = stops[i].innerHTML.trim();

        data.push({
          name: stop,
          link: encodeURI(_.template('/vdl/bus/${ route }/${ name }/next.json', {
            route: route,
            name: stop
          }))
        });
      }

      callback( null, data );
    }
  );

}

function getStopsOnRoute(route, callback) {

  var key = config.memcached.prefix + '-bus-' + route + '-stops';

  memcached.get(key, function (err, cached) {
    if ( err ) console.error(err);

    if ( !err && cached ) {

      return callback(err, cached);

    } else {

      getStopsOnRouteFromSource(route, function(err, data) {
        if ( err ) console.error(err);

        memcached.set(key, data, 24*60*60, function(err) {
          if ( err ) console.error(err);
        });

        return callback(err, data);

      });

    }

  });

}

function getNextBusesForStopOnRouteFromSource(route, stop, callback) {

  var urlTemplate = 'http://service.vdl.lu/hotcity/mobility/index.php?city=vdl&service=bus&routeId=${ route }&stopId=${ stop }&nRows=12';

  var url = _.template(urlTemplate, {
    route: route,
    stop: stop
  }).replace('+', '%2B');

  jsdom.env(
    url,
    function (err, window) {
      if ( err ) console.error(err);

      var rows = window.document.querySelectorAll('table > tr');

      if ( rows[1].querySelector('td > font').innerHTML === 'Pas de données pour le moment' ) {
        return callback(null, []);
      }

      var data = [];

      for (var i = 1; i < rows.length; i++) {
        var cells = rows[i].getElementsByTagName('td');

        data.push({
          direction:  cells[0]
                        .querySelector('font')
                        .innerHTML
                        .replace(/&nbsp;/gi, ' ')
                        .trim(),
          time:       cells[1]
                        .querySelector('font')
                        .innerHTML
                        .replace(/&nbsp;/gi, ' ')
                        .trim()
        });
      }

      callback( err, data );
    }
  );

}

function getNextBusesForStopOnRoute(route, stop, callback) {

  var key = config.memcached.prefix + '-bus-' + route + _.dasherize(stop) + '-next';

  memcached.get(key, function (err, cached) {
    if ( err ) console.error(err);

    if ( !err && cached ) {

      return callback(err, cached);

    } else {

      getNextBusesForStopOnRouteFromSource(route, stop, function(err, data) {
        if ( err ) console.error(err);

        memcached.set(key, data, 30, function(err) {
          if ( err ) console.error(err);
        });

        return callback(err, data);

      });

    }

  });

}

module.exports = {

  routes: function(req, res) {

    getRoutes(function(err, data) {
      if ( err ) console.error(err);
      res.send(data);
    });

  },

  stops: function(req, res) {

    getStopsOnRoute(~~req.params.route, function(err, data) {
      if ( err ) console.error(err);
      res.send(data);
    });

  },

  nextBuses: function(req, res) {

    getNextBusesForStopOnRoute(~~req.params.route, req.params.stop, function(err, data) {
      if ( err ) console.error(err);

      if ( data.length === 0 ) return res.send(204);
      res.send(data);
    });

  }

};
