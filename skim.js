var async = require('async');
var cssax = require('cssax');

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
    if (match = str.match(/^\(attr( [^)]+?)?( [^)]+?)?\)/)) {
      var value = attributes[match[1].substr(1)] || '';
      callback((match[2] ? (value.match(new RegExp(match[2].substr(1))) || [])[0] : value) || '');
    } else if (match = str.match(/^\(text( [^)]+?)?\)/)) {
      this.readText(function (match, text) {
        callback((match[1] ? (text.match(new RegExp(match[1].substr(1))) || [])[0] : text) || '');
      }.bind(null, match))
    } else if (match = str.match(/^\(html( [^)]+?)?\)/)) {
      this.readHTML(function (match, text) {
        text = text.replace(/^<[^>]+>|<[^>]+>$/g, '')
        callback((match[1] ? (text.match(new RegExp(match[1].substr(1))) || [])[0] : text) || '');
      }.bind(null, match))
    }
  });
}

function parseValueSpec (str) {
  return {
    $value: (str.match(/^[^)]+\)/) || [])[0],
    $query: (str.match(/\)\s*(.*)$/) || [])[1]
  };
}

// Setup listeners based on a JSON specification or subspec.
function onSpecification (stream, spec, prefix) {
  prefix = prefix || '';
  spec = (typeof spec == 'string') ? parseValueSpec(spec) : spec;

  // Augment $query parameter.
  var query = prefix + (spec.$query ? ' ' + spec.$query : '');

  if ('$each' in spec) {

    // Array to populate.
    var ret = [], first = true;
    var parser = onSpecification(stream, spec.$each, query);
    stream.query(query).on('match', function (tag, attributes) {
      if (first) {
        first = false;
      } else {
        ret.push(parser.result());
      }
      parser.reset();
    });
  
    return {
      result: function () {
        var vals = ret.concat([parser.result()]);
        return vals.filter(function (obj) {
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

  // Object of named fields to populate.
  var parsers = {};
  Object.keys(spec).filter(function (key) {
    return key.charAt(0) != '$';
  }).forEach(function (key) {
    parsers[key] = onSpecification(stream, spec[key], query);
  });

  return {
    result: function () {
      var values = ('$query' in spec) ? null : {};
      Object.keys(parsers).forEach(function (key) {
        var res = parsers[key].result();
        if (res !== null) {
          values = values || {};
          values[key] = res;
        }
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

module.exports = function (spec, next) {
  // Build specification parser, return result after stream ends.
  var stream = cssax.createStream();
  var parser = onSpecification(stream, spec);
  stream
    .on('error', function () { }) // Toss errors
    .on('end', function () {
      next(parser.result());
    })
  return stream;
};