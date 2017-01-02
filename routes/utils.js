var _ = require('lodash');
var Haikunator = require('haikunator');
var haikunator = new Haikunator();
var isoCountries = require("i18n-iso-countries");

// Here it goes only utility methods
module.exports = {

  provisioningApiCredentials: {
    'user': process.env.VOXBONE_API_USERNAME,
    'pass': process.env.VOXBONE_API_PASSWORD
  },

  provisioningApiHeaders: {
    'Accept': 'application/json',
    'Content-type': 'application/json',
    'User-Agent': 'request'
  },

  sip2webrtcApiHeaders: {
    'Authorization': 'Basic ' + process.env.SIP_TO_WEBRTC_API_BASIC_AUTH,
    'Content-Type': 'application/json'
  },

  isLoggedIn: function(req, res, next) {
    if (req.isAuthenticated())
      return next();
    res.redirect('/');
  },

  redirectIfLoggedIn: function(req, res, next) {
    if (req.isAuthenticated())
      return res.redirect('/pick-did');
    return next();
  },

  accountLoggedIn: function(req) {
    return req.isAuthenticated();
  },

  userGravatarUrl: function(res) {
    var crypto = require('crypto');
    var md5_email = crypto.createHash('md5').update(res.locals.currentUser.email).digest("hex");
    return "https://www.gravatar.com/avatar/" + md5_email + "/?s=20&d=mm";
  },

  objectNotFound: function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  },

  haiku: function () {
    return haikunator.haikunate({tokenLength: 0});
  },

  uuid4: function() {
    // I leave this approach commented out just for general culture :)
    // 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    //     var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    //     return v.toString(16);
    // });

    function b(a) {
      return a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, b);
    }
    return b();
  },

  createUser: function(account, apiBrowserUsername, callback) {
    var request = require('request');
    var utils = this;
    var userData = { "browserUsername": apiBrowserUsername };
    account.apiBrowsername = apiBrowserUsername;
    var url = process.env.SIP_TO_WEBRTC_API_URL + '/' + process.env.VOXBONE_WEBRTC_USERNAME + '/users';
    request.post(url, {
        headers: utils.sip2webrtcApiHeaders,
        body: JSON.stringify(userData)
      },
      function(err, response, body) {

        if (!JSON.stringify(body).errors && response.statusCode !== 400) {
          var new_user = JSON.parse(body);
          account.save(function(){
            callback(new_user.id);
          });
        } else {
          account.save(function(){
            callback(false);
          });
        }

      }
    );
  },

  getListedCountries: function(callback) {
    var Country = require('../models/country');
    var result = [];
    Country.find({}, function (err, listedCountries) {
      for(var i = 0; i < listedCountries.length; i++) {
        result.push({
          "name": listedCountries[i].countryName + ' (' + listedCountries[i].phoneCode + ') - Request',
          "iso2": (isoCountries.alpha3ToAlpha2(listedCountries[i].countryCodeA3) || 'WLD').toLowerCase(),
          "DID": null
        });
      }
      callback(result);
    });
  },

  getVoxRoutes: function() {
    var app = require('../app');
    var routes = [];

    _.each(app._voxPaths, function(used) {
      // On each route of the router
      _.each(used.router.stack, function(stackElement) {
        if (stackElement.route) {
          var base = used.urlBase;
          var path = stackElement.route.path;

          routes.push({
            method: stackElement.route.stack[0].method,
            path: (used.urlBase === '/') ? path : (base + path)
          });
        }
      });
    });

    return routes;
  }
};
