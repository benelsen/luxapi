
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

var allRoutes = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,18,19,21,22,23];

var srcURL = 'http://service.vdl.lu/rss/circulation_guidageparking.php';

var getRawData = function( callback ) {

  request( srcURL, function(httpError, response, body) {
    if ( httpError ) console.error(httpError);

    toJSON(body, function(jsonError, data) {
      if ( jsonError ) console.error(jsonError);

      callback(httpError || jsonError, data);

    });

  });

};

var cleanRawData = function( data ) {

  var items = _.map( data.rss.channel.item, function(item) {

    var parking = {
      name:   item.title,
      open: ~~item['vdlxml:ouvert'] > 0 ? true : false,
      link:   item.guid,

      available: ~~item['vdlxml:actuel'],
      occupied:  ~~item['vdlxml:total'] - ~~item['vdlxml:actuel'],
      trend:     ~~item['vdlxml:tendance'],

      capacity: {
        total:       ~~item['vdlxml:nominal']['vdlxml:nominalTotal'],
        foruse:      ~~item['vdlxml:total'],
        overground:  ~~item['vdlxml:nominal']['vdlxml:nominalSurface'],
        underground: ~~item['vdlxml:nominal']['vdlxml:nominalCouvertes'],
        woman:       ~~item['vdlxml:nominal']['vdlxml:nominalFemmes'],
        disabled:    ~~item['vdlxml:nominal']['vdlxml:nominalHandicapes'],
        bicylce:     ~~item['vdlxml:nominal']['vdlxml:nominalVelos'],
        motorcycle:  ~~item['vdlxml:nominal']['vdlxml:nominalMotos'],
        buses:       ~~item['vdlxml:nominal']['vdlxml:nominalAutocars']
      },

      location: {
        address:    item['vdlxml:localisation']['vdlxml:localisationEntree'],
        latitude:  +item['vdlxml:localisation']['vdlxml:localisationLatitude'],
        longitude: +item['vdlxml:localisation']['vdlxml:localisationLongitude']
      },

      restrictions: {
        lpg:       ~~item['vdlxml:restrictions']['vdlxml:restrictionsNoGpl']      === 0,
        cng:       ~~item['vdlxml:restrictions']['vdlxml:restrictionsNoGNC']      === 0,
        spikes:    ~~item['vdlxml:restrictions']['vdlxml:restrictionsNoClous']    === 0,
        trailer:   ~~item['vdlxml:restrictions']['vdlxml:restrictionsNoRemorque'] === 0,
        over3t5:   ~~item['vdlxml:restrictions']['vdlxml:restrictionsNo3t5']      === 0,
        maxHeight: +(item['vdlxml:restrictions']['vdlxml:restrictionsMaxHauteur'] || '').replace(',','.').slice(0,-2)
      },

      payment: {
        cash:       ~~item['vdlxml:paiement']['vdlxml:paiementEspeces']    > 0,
        minicash:   ~~item['vdlxml:paiement']['vdlxml:paiementMinicash']   > 0,
        maestro:    ~~item['vdlxml:paiement']['vdlxml:paiementMaestro']    > 0,
        visa:       ~~item['vdlxml:paiement']['vdlxml:paiementVisa']       > 0,
        mastercard: ~~item['vdlxml:paiement']['vdlxml:paiementMastercard'] > 0,
        eurocard:   ~~item['vdlxml:paiement']['vdlxml:paiementEurocard']   > 0,
        amex:       ~~item['vdlxml:paiement']['vdlxml:paiementAmex']       > 0,
        call2park:  ~~item['vdlxml:paiement']['vdlxml:paiementCall2park']  > 0
      }

    };

    var re = /(Haltestelle[n]? (?:([\w\S ]*)[,]?)[ ]?:.+\.)+/mg;
    var re2 = /Haltestellen? ([^:]+) ?: [\w ]+ ([\d, ]+)/;

    parking.publicTransport = [];

    var str = item['vdlxml:divers']['vdlxml:diversLignebus'][1]._;
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


module.exports = {

  json: function(req, res) {

    getCurrentData( function(err, data) {
      if ( err ) console.error(err);
      res.send(data);
    });

  },

  geojson: function(req, res) {

    getCurrentData( function(err, data) {
      if ( err ) console.error(err);

      var geojson = makeGeoJSON(data);

      res.send(geojson);
    });

  }

};
