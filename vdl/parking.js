
var toJSON = require('xmljson').to_json;
var request = require('request');
var _ = require('lodash');
var Memcached = require('memcached');

var DB_HOST = process.env.DB_PORT_11211_TCP_ADDR || 'localhost';
var DB_PORT = process.env.DB_PORT_11211_TCP_PORT || 11211;
var DB_NAME = process.env.DB_NAME || 'luxapi';

var memcached = new Memcached( DB_HOST + ':' + DB_PORT, {
  timeout: 1000
});

var allRoutes = [1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,18,19,21,22,23,24,25,26,27,28,29,30,31,0];

var srcURL = 'https://feed.vdl.lu/circulation/parking/feed.rss';

var getRawData = function( callback ) {

  request( srcURL, function(httpError, response, body) {
    if ( httpError ) console.error(httpError);

    toJSON(body, function(jsonError, data) {
      if ( jsonError ) console.error(jsonError);

      callback(httpError || jsonError, data);

    });

  });

};

function def(string, def) {
  return string ? ~~string : def
}

var cleanRawData = function( data ) {

  var items = _.map( data.rss.channel.item, function(item) {

    var parking = {
      name:   item.title,
      link:   item.guid,

      open: item['vdlxml:ouvert']  && ~~item['vdlxml:ouvert']  > 0 ? true : false,
      full: item['vdlxml:complet'] && ~~item['vdlxml:complet'] > 0 ? true : false,

      available: def(item['vdlxml:actuel'], null),
      occupied:  def(item['vdlxml:total'], null) - def(item['vdlxml:actuel'], null),
      trend:     def(item['vdlxml:tendance'], null),

      capacity: {
        total:             def(item['vdlxml:nominal']['vdlxml:nominalTotal'], null),
        foruse:            def(item['vdlxml:total'], null),
        overground:        def(item['vdlxml:nominal']['vdlxml:nominalSurface'], null),
        underground:       def(item['vdlxml:nominal']['vdlxml:nominalCouvertes'], null),
        women:             def(item['vdlxml:nominal']['vdlxml:nominalFemmes'], null),
        mobility_impaired: def(item['vdlxml:nominal']['vdlxml:nominalHandicapes'], null),
        bicylce:           def(item['vdlxml:nominal']['vdlxml:nominalVelos'], null),
        motorcycle:        def(item['vdlxml:nominal']['vdlxml:nominalMotos'], null),
        buses:             def(item['vdlxml:nominal']['vdlxml:nominalAutocars'], null)
      },

      location: {
        address:       item['vdlxml:localisation']['vdlxml:localisationEntree'],
        latitude:     +item['vdlxml:localisation']['vdlxml:localisationLatitude'],
        longitude:    +item['vdlxml:localisation']['vdlxml:localisationLongitude'],
        address_entry: item['vdlxml:localisation']['vdlxml:localisationEntree'],
        address_exit:  item['vdlxml:localisation']['vdlxml:localisationSortie'],
      },

      restrictions: {
        lpg:        item['vdlxml:restrictions']['vdlxml:restrictionsNoGpl']      ? item['vdlxml:restrictions']['vdlxml:restrictionsNoGpl']      === 0 : null,
        cng:        item['vdlxml:restrictions']['vdlxml:restrictionsNoGNC']      ? item['vdlxml:restrictions']['vdlxml:restrictionsNoGNC']      === 0 : null,
        spikes:     item['vdlxml:restrictions']['vdlxml:restrictionsNoClous']    ? item['vdlxml:restrictions']['vdlxml:restrictionsNoClous']    === 0 : null,
        motorcycle: item['vdlxml:restrictions']['vdlxml:restrictionsNoMoto']     ? item['vdlxml:restrictions']['vdlxml:restrictionsNoMoto']     === 0 : null,
        trailer:    item['vdlxml:restrictions']['vdlxml:restrictionsNoRemorque'] ? item['vdlxml:restrictions']['vdlxml:restrictionsNoRemorque'] === 0 : null,
        max_weight: item['vdlxml:restrictions']['vdlxml:restrictionsMaxPoids']   ? +(item['vdlxml:restrictions']['vdlxml:restrictionsMaxPoids']).replace(',','.').slice(0,-1) : null,
        max_height: item['vdlxml:restrictions']['vdlxml:restrictionsMaxHauteur'] ? +(item['vdlxml:restrictions']['vdlxml:restrictionsMaxHauteur']).replace(',','.').slice(0,-2) : null,
      },

      payment: {
        cash:       item['vdlxml:paiement']['vdlxml:paiementEspeces']    ? item['vdlxml:paiement']['vdlxml:paiementEspeces']    > 0 : null,
        maestro:    item['vdlxml:paiement']['vdlxml:paiementMaestro']    ? item['vdlxml:paiement']['vdlxml:paiementMaestro']    > 0 : null,
        visa:       item['vdlxml:paiement']['vdlxml:paiementVisa']       ? item['vdlxml:paiement']['vdlxml:paiementVisa']       > 0 : null,
        mastercard: item['vdlxml:paiement']['vdlxml:paiementMastercard'] ? item['vdlxml:paiement']['vdlxml:paiementMastercard'] > 0 : null,
        digicash:   item['vdlxml:paiement']['vdlxml:paiementDigicash']   ? item['vdlxml:paiement']['vdlxml:paiementDigicash']   > 0 : null,
        amex:       item['vdlxml:paiement']['vdlxml:paiementAmex']       ? item['vdlxml:paiement']['vdlxml:paiementAmex']       > 0 : null,
        call2park:  item['vdlxml:paiement']['vdlxml:paiementCall2park']  ? item['vdlxml:paiement']['vdlxml:paiementCall2park']  > 0 : null,
        eurocard:   item['vdlxml:paiement']['vdlxml:paiementEurocard']   ? item['vdlxml:paiement']['vdlxml:paiementEurocard']   > 0 : null,
        minicash:   item['vdlxml:paiement']['vdlxml:paiementMinicash']   ? item['vdlxml:paiement']['vdlxml:paiementMinicash']   > 0 : null,
      }

    };

    var re = /(Haltestelle[n]? (?:([\w\S ]*)[,]?)[ ]?:.+\.)+/mg;
    var re2 = /Haltestellen? ([^:]+) ?: [\w ]+ ([\d, ]+)/;

    parking.publicTransport = [];

    var str = item['vdlxml:localisation']['vdlxml:localisationMobilite'][1]._;
    if ( !str ) return parking;

    str.match(re).forEach( function(m) {

      var matches = m.match(re2);

      if ( !matches || !matches.length ) return;

      var stops = matches[1].split(','),
          routes = matches[2].split(',').map( function(r) {
            return ~~r ? ~~r : r.trim();
          });

      if ( m.indexOf('ausser') > -1 ) routes = _.difference(allRoutes, routes);

      stops.forEach( function(s) {
        parking.publicTransport.push({
          stop: s.trim(),
          routes: routes
        });
      });

    });

    return parking;
  });

  return {
    parkings: items,
    sourceDate: new Date(data.rss.channel.lastBuildDate),
    date: new Date(),
    licenseInformation: 'Data by Ville de Luxembourg under CC BY 3.0 LU'
  };

};

var getCurrentData = function( callback ) {

  var key = 'parking';

  memcached.get(key, function (err, cached) {
    if ( err ) console.error(err);

    if ( !err && cached ) {

      return callback(null, cached);

    } else {

      getRawData(function(err, data) {
        if ( err ) console.error(err);

        var cleanData = cleanRawData(data);

        memcached.set(key, cleanData, 60, function(err) {
          if ( err ) console.error(err);
        });

        return callback(err, cleanData);

      });

    }

  });

};

var makeGeoJSON = function(data) {

  return {
    type: 'FeatureCollection',
    features: data.parkings.map( function(feature) {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            feature.location.longitude,
            feature.location.latitude
          ]
        },
        properties: feature
      };

    }),
    properties: {
      date: data.date,
      sourceDate: data.sourceDate,
      licenseInformation: data.licenseInformation
    }
  };

};


module.exports.get = function (req, res) {

  if ( req.params.fmt === 'geojson' ) {

    getCurrentData( function (err, data) {
      if ( err ) console.error(err);
      var geojson = makeGeoJSON(data);
      res.send(geojson);
    });

  } else {

    getCurrentData( function (err, data) {
      if ( err ) console.error(err);
      res.send(data);
    });

  }

};
