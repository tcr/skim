var rem = require('rem');
var cssax = require('cssax');

// Code

function stripHTML (html) {
  return html.replace(/<.+?>/g, '');
}

function combineQueries (a, b) {
  return (a.replace(/(?=,)|$/g, ' ' + b.replace(/^\(.*?\)/, ''))).trim();
}

function scrapi (manifest, path, next) {
  rem.url(manifest.base, path).get(function (err, res) {
    var stream = cssax.createStream();

    function extract (query, str, next) {
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

    function parseObject (spec, next) {
      if ('$query' in spec) {
        if ('$each' in spec) {
          var ret = [];
          var obj = null;

          stream.query(spec.$query).on('match', function (tag, attributes) {
            ret.push(obj = {});
          });
          stream.on('end', function () {
            next(ret.filter(function (obj) {
              return '$filter' in spec ? Object.prototype.hasOwnProperty.call(obj, spec.$filter) : obj;
            }));
          })
          Object.keys(spec.$each).forEach(function (key) {
            extract(combineQueries(spec.$query, spec.$each[key]), spec.$each[key], function (value) {
              obj[key] = value;
            });
          });

        } else if ('$value' in spec) {
          extract(combineQueries(spec.$query, spec.$value), spec.$value, function (value) {
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
          parseObject(spec[key], function (value) {
            obj[key] = value;
          });
        });
        stream.on('end', function () {
          next(obj);
        });
      }
    }

    var page = {};

    parseObject(manifest.spec, function (json) {
      page = json;
    });

    // Pipe our content.
    res.pipe(stream).on('end', function () {
      next(page);
    });
  });
}

module.exports = scrapi;