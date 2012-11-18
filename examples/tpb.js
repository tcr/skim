var scrapi = require('..');

// Define a specification for scraping Hacker News

var manifest = {
  base: 'http://thepiratebay.se',
  spec: {
    torrents: {
      $query: '#searchResult tr',
      $each: {
        title: '(text [^\\t\\n]+) .detName',
        magnet: '(attr href) a[href^=magnet]'
      },
      $filter: 'magnet'
    }
  }
};

var tpb = scrapi(manifest);

tpb('recent/0').get(function (err, json) {
  json.torrents.forEach(function (torrent) {
    var trackers = require('url').parse(torrent.magnet, true).query.tr;
    console.log(torrent.title, trackers);
  });
});