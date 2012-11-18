var scrapi = require('..');

// Define a specification for scraping Hacker News

var manifest = {
  base: 'http://news.ycombinator.com/',
  spec: {
    '*': {
      stories: {
        $query: 'table table tr:nth-child(3n+1)',
        $each: {
          title: '(text) a',
          link: '(attr href) a',
          user: '(text) + tr a[href^=user]',
          comments: '(text ^\\d+) + tr a[href^=item]',
          id: '(attr href \\d+$) + tr a[href^=item]'
        },
        $filter: 'id'
      },
      next: {
        $query: 'table table td:nth-child(1) + td.title',
        $value: '(attr href) a'
      }
    }
  }
};

// List stories from a given page.

exports.list = function (offset, next) {
  if (typeof offset == 'function') {
    next = offset;
    offset = 0;
  }

  function handler (ret) {
    if (offset-- == 0) {
      next(ret);
    } else {
      scrapi(manifest, ret.next, handler);
    }
  }
  scrapi(manifest, '', handler);
};

// Main script prompts for a story.

if (require.main === module) {
  function printPage (offset, json) {
    json.stories.forEach(function (story, i) {
      console.log('[' + (offset + i + 1) + ']', story.title);
    })
  }
  exports.list(function (json) {
    printPage(0, json);
  })
};