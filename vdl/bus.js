// *** Dependencies ***
// Node:
// External:
var jsdom = require('jsdom'),
    _ = require('lodash');

module.exports = {

  routes: function(req, res) {

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

          var from = route.slice(0, route.indexOf('-')-1 ),
              to = route.slice(route.indexOf('-')+2 );

          data.push( [routeNumber, from, to] );
        }

        res.send( data );
      }
    );

  },

  stops: function(req, res) {

    var urlTemplate = 'http://service.vdl.lu/hotcity/mobility/index.php?city=vdl&service=bus&routeId=${ route }';

    var url = _.template(urlTemplate, {
      route: ~~req.params.route
    });

    jsdom.env(
      url,
      function (errors, window) {

        var stops = window.document.querySelectorAll('ul > li > a > h1');

        var data = [];

        for (var i = 0; i < stops.length; i++) {
          data.push( stops[i].innerHTML.trim() );
        }

        res.send( data );
      }
    );

  },

  nextBuses: function(req, res) {

    var urlTemplate = 'http://service.vdl.lu/hotcity/mobility/index.php?city=vdl&service=bus&routeId=${ route }&stopId=${ stop }&nRows=12';

    var url = _.template(urlTemplate, {
      route: ~~req.params.route,
      stop: req.params.stop
    });

    console.log(url.replace('+', '%2B'));

    jsdom.env(
      url,
      function (errors, window) {

        var rows = window.document.querySelectorAll('table > tr');

        if ( rows[1].querySelector('td > font').innerHTML === 'Pas de données pour le moment' ) {
          return res.send(404);
        }

        var data = [];

        for (var i = 1; i < rows.length; i++) {
          var cells = rows[i].getElementsByTagName('td');

          data.push([
            cells[0]
              .querySelector('font')
              .innerHTML
              .replace(/&nbsp;/gi, ' ')
              .trim(),
            cells[1]
              .querySelector('font')
              .innerHTML
              .replace(/&nbsp;/gi, ' ')
              .trim()
          ]);
        }

        res.send( data );
      }
    );

  }

};
