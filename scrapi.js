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

function extract (stream, query, str, next) {
  stream.query(query).on('match', function (tag, attributes) {
    var match;
    if (match = str.match(/^\(attr( [^)]+?)?( [^)]+?)?\)/)) {
      var value = attributes[match[1].substr(1)] || '';
      next((match[2] ? (value.match(new RegExp(match[2].substr(1))) || [])[0] : value) || '');
    } else if (match = str.match(/^\(text( [^)]+?)?\)/)) {
      this.readText(function (text) {
        next((match[1] ? (text.match(new RegExp(match[1].substr(1))) || [])[0] : text) || '');
      })
    }
  });
}

function parseObject (stream, spec, next) {
  if (typeof spec == 'string') {
    spec = {
      $value: (spec.match(/^[^)]+\)/) || [])[0],
      $query: (spec.match(/\)\s*(.*)$/) || [])[1]
    };
  }

  if ('$query' in spec) {
    if ('$each' in spec) {
      var ret = [];
      stream.on('end', function () {
        next(ret.filter(function (obj) {
          return '$filter' in spec ? Object.prototype.hasOwnProperty.call(obj, spec.$filter) : obj;
        }));
      })

      if (typeof spec.$each == 'string') {
        extract(stream, spec.$query, spec.$each, function (value) {
          ret.push(value);
        });
      } else {
        var obj = null;
        
        stream.query(spec.$query).on('match', function (tag, attributes) {
          ret.push(obj = {});
        });

        Object.keys(spec.$each).forEach(function (key) {
          extract(stream, combineQueries(spec.$query, spec.$each[key]), spec.$each[key], function (value) {
            obj[key] = value;
          });
        });
      }

    } else if ('$value' in spec) {
      extract(stream, combineQueries(spec.$query, spec.$value), spec.$value, function (value) {
        obj = value;
      });
      stream.on('end', function () {
        next(obj);
      });

    } else {
      stream.on('end', function () {
        next(null);
      });
    }

  } else {
    var obj = {};
    Object.keys(spec).forEach(function (key) {
      parseObject(stream, spec[key], function (value) {
        obj[key] = value;
      });
    });
    stream.on('end', function () {
      next(obj);
    });
  }
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

    // Toss errors.
    stream.on('error', function () { });

    var page = {};
    var spec = manifest.spec[req.url.pathname] || manifest.spec[req.url.pathname.replace(/^\//, '')] || manifest.spec['*'] || {};
    parseObject(stream, spec, function (json) {
      page = json;
    });

    // Pipe our content.
    res.pipe(stream).on('end', function () {
      next(page);
    });
  };

  return api;
}

module.exports = scrapi;