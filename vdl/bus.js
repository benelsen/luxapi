// *** Dependencies ***
// Node:
// External:
var jsdom = require('jsdom'),
    _ = require('lodash');

function getRoutes(callback) {

  var url = 'http://service.vdl.lu/hotcity/mobility/index.php?city=vdl&service=bus';

  jsdom.env(
    url,
    function (errors, window) {

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

function getStopsOnRoute(route, callback) {

  var urlTemplate = 'http://service.vdl.lu/hotcity/mobility/index.php?city=vdl&service=bus&routeId=${ route }';

  var url = _.template(urlTemplate, {
    route: route
  });

  jsdom.env(
    url,
    function (errors, window) {

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

function getNextBusesForStopOnRoute(route, stop, callback) {

  var urlTemplate = 'http://service.vdl.lu/hotcity/mobility/index.php?city=vdl&service=bus&routeId=${ route }&stopId=${ stop }&nRows=12';

  var url = _.template(urlTemplate, {
    route: route,
    stop: stop
  }).replace('+', '%2B');

  jsdom.env(
    url,
    function (errors, window) {

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

      callback( null, data );
    }
  );

}

module.exports = {

  routes: function(req, res) {

    getRoutes(function(err, data) {
      res.send(data);
    });

  },

  stops: function(req, res) {

    getStopsOnRoute(~~req.params.route, function(err, data) {
      res.send(data);
    });

  },

  nextBuses: function(req, res) {

    getNextBusesForStopOnRoute(~~req.params.route, req.params.stop, function(err, data) {
      if ( data.length === 0 ) return res.send(204);
      res.send(data);
    });

  }

};
