var trumpet = require('trumpet');
var rem = require('rem');

// Define a specification for scraping Hacker News

var spec = {
  base: 'http://news.ycombinator.com/',
  spec: {
    $query: 'td + td.title a',
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
    var tr = trumpet();

    if ('$each' in spec) {
      var ret = [];
      var obj = null;
    }

    // Parse spec.
    tr.select(spec.$query, function (node) {
      ret.push(obj = {});
    });
    Object.keys(spec.$each).forEach(function (key) {
      tr.select((spec.$query + ' ' + spec.$each[key].replace(/^\(.*?\)/, '')).trim(), function (node) {
        var match;
        if (match = spec.$each[key].match(/^\(attr (\S+?)\)/)) {
          obj[key] = node.attributes[match[1]];
        } else if (match = spec.$each[key].match(/^\(text\)/)) {
          node.html(function (html) {
            obj[key] = stripHTML(html);
          })
        }
      });
    });

    // Pipe our content.
    res.pipe(tr).on('end', function () {
      next(ret);
    });
  });
}

// Run our spec

scrapi(spec, '', function (ret) {
  console.log(ret);
});
