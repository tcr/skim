var rem = require('rem');
var cssax = require('cssax');

// Define a specification for scraping Hacker News

var spec = {
  base: 'http://news.ycombinator.com/',
  spec: {
    $query: 'td.title ~ td ~ td.title > a',
    $each: {
      title: '(text)',
      link: '(attr href)'
    }
  }
}

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
      var query = (spec.$query + ' ' + spec.$each[key].replace(/^\(.*?\)/, '')).trim();
      stream.query(query).on('match', function (tag, attributes) {
        var match;
        if (match = spec.$each[key].match(/^\(attr (\S+?)\)/)) {
          obj[key] = attributes[match[1]];
        } else if (match = spec.$each[key].match(/^\(text\)/)) {
          this.readText(function (text) {
            obj[key] = text;
          })
        }
      });
    });

    // Pipe our content.
    res.pipe(stream).on('end', function () {
      next(ret);
    });
  });
}

// Run our spec

scrapi(spec, '', function (ret) {
  console.log(ret);
});
