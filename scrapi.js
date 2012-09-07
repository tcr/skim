var rem = require('rem');
var cssax = require('cssax');

// Code

function stripHTML (html) {
  return html.replace(/<.+?>/g, '');
}

function scrapi (manifest, path, next) {
  var spec = manifest.spec;
  rem.url(manifest.base, path).get(function (err, res) {
    var stream = cssax.createStream();

    if ('$each' in spec) {
      var ret = [];
      var obj = null;
    }

    // Parse spec.
    stream.query(spec.$query).on('match', function (tag, attributes) {
      ret.push(obj = {});
    });
    Object.keys(spec.$each).forEach(function (key) {
      var query = (spec.$query.replace(/(?=,)|$/g, ' ' + spec.$each[key].replace(/^\(.*?\)/, ''))).trim();
      stream.query(query).on('match', function (tag, attributes) {
        var match;
        if (match = spec.$each[key].match(/^\(attr( [^)]+?)?( [^)]+?)?\)/)) {
          var value = attributes[match[1].substr(1)] || '';
          obj[key] = (match[2] ? (value.match(new RegExp(match[2].substr(1))) || [])[0] : value) || '';
        } else if (match = spec.$each[key].match(/^\(text( [^)]+?)?\)/)) {
          this.readText(function (text) {
            obj[key] = (match[1] ? (text.match(new RegExp(match[1].substr(1))) || [])[0] : text) || '';
          })
        }
      });
    });

    // Pipe our content.
    res.pipe(stream).on('end', function () {
      next(ret.filter(function (obj) {
        return '$filter' in spec ? Object.prototype.hasOwnProperty.call(obj, spec.$filter) : obj;
      }));
    });
  });
}

module.exports = scrapi;