var async = require('async');
var rem = require('rem');
var cssax = require('cssax');
var toughCookie = require('tough-cookie'), Cookie = toughCookie.Cookie, CookieJar = toughCookie.CookieJar;

rem.USER_AGENT = 'Mozilla/5.0 (compatible; Scrapi/1.0)'

// Utilities

function stripHTML (html) {
  return html.replace(/<.+?>/g, '');
}

function combineQueries (a, b) {
  return (a.replace(/(?=,)|$/g, ' ' + b.replace(/^\(.*?\)/, ''))).trim();
}

// Scrapi

function onValue (stream, query, str, callback) {
  stream.query(query).on('match', function (tag, attributes) {
    var match;
    if (match = str.match(/^\(attr( [^)]+?)?( [^)]+?)?\)/)) {
      var value = attributes[match[1].substr(1)] || '';
      callback((match[2] ? (value.match(new RegExp(match[2].substr(1))) || [])[0] : value) || '');
    } else if (match = str.match(/^\(text( [^)]+?)?\)/)) {
      this.readText(function (text) {
        callback((match[1] ? (text.match(new RegExp(match[1].substr(1))) || [])[0] : text) || '');
      })
    }
  });
}

function parseValueSpec (str) {
  return {
    $value: (str.match(/^[^)]+\)/) || [])[0],
    $query: (str.match(/\)\s*(.*)$/) || [])[1]
  };
}

function onSpecification (stream, spec, prefix) {
  prefix = prefix || '';
  spec = (typeof spec == 'string') ? parseValueSpec(spec) : spec;

  if (!('$query' in spec)) {

    // Object of named fields to populate.
    var parsers = {};
    Object.keys(spec).forEach(function (key) {
      parsers[key] = onSpecification(stream, spec[key], prefix);
    });

    return {
      result: function () {
        var values = {};
        Object.keys(parsers).forEach(function (key) {
          values[key] = parsers[key].result();
        })
        return values;
      },
      reset: function () {
        Object.keys(parsers).forEach(function (key) {
          parsers[key].reset();
        })
      }
    };
  }

  // Augment $query parameter.
  var query = prefix + ' ' + spec.$query;

  if ('$each' in spec) {

    // Array to populate.
    var ret = [];
    var parser = onSpecification(stream, spec.$each, query);
    stream.query(query).on('match', function (tag, attributes) {
      this.skip(function () {
        ret.push(parser.result());
        parser.reset();
      });
    });
  
    return {
      result: function () {
        return ret.filter(function (obj) {
          return '$filter' in spec ? Object.prototype.hasOwnProperty.call(obj, spec.$filter) && obj[spec.$filter] : obj;
        });
      },
      reset: function () {
        ret = [];
      }
    };

  } else if ('$value' in spec) {

    // String to populate.
    var ret = null;
    onValue(stream, combineQueries(query, spec.$value), spec.$value, function (value) {
      ret = value;
    });

    return {
      result: function () {
        return ret;
      },
      reset: function () {
        ret = null;
      }
    };
  }

  throw new Error('Invalid specification for query ' + JSON.stringify(query));
}

function scrapi (manifest) {
  var api = rem.create({
    base: manifest.base,
    uploadFormat: 'form'
  }, {
    key: 'SCRAPI'
  });

  var jar = new CookieJar();

  api.pre('request', function (req, next) {
    jar.getCookieString(rem.util.url.format(req.url), function (err, cookies) {
      req.headers['cookie'] = cookies;
      req.redirect = false;
      next();
    })
  });

  api.pre('response', function (req, res, next) {
    // Read cookies from headers.
    if (res.headers['set-cookie'] instanceof Array) {
      var cookies = res.headers['set-cookie'].map(Cookie.parse);
    } else if (res.headers['set-cookie'] != null) {
      var cookies = [Cookie.parse(res.headers['set-cookie'])];
    } else {
      var cookies = [];
    }

    // Retrieve authentication cookies from request using tough-cookie.
    async.forEach(cookies, function (cookie, asyncnext) {
      jar.setCookie(cookie, rem.util.url.format(req.url), asyncnext);
    }, next);
  });

  api.parseStream = function (req, res, next) {
    var stream = cssax.createStream();

    var parser = onSpecification(stream, manifest.spec[req.url.pathname] ||
      manifest.spec[req.url.pathname.replace(/^\//, '')] ||
      manifest.spec['*'] ||
      {});

    res.pipe(stream)
      .on('error', function () { }) // Toss errors
      .on('end', function () {
        next(parser.result());
      })
  };

  return api;
}

module.exports = scrapi;