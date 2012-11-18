var scrapi = require('..');

// Define a specification for scraping Hacker News

var manifest = {
  base: 'http://news.ycombinator.com',
  spec: {
    '/ submitted': {
      stories: {
        $query: 'table table tr:nth-child(3n+1)',
        $each: {
          title: '(text) td.title a',
          link: '(attr href) td.title a',
          user: '(text) + tr a[href^=user]',
          comments_count: '(text ^\\d+) + tr a[href^=item]',
          id: '(attr href \\d+$) + tr a[href^=item]',
          points: '(text ^\\d+) + tr td.subtext',
          age: '(text \\d+ \\S+ ago) + tr td.subtext'
        },
        $filter: 'id'
      },
      next: {
        $query: 'table table td:nth-child(1) + td.title',
        $value: '(attr href) a'
      }
    },
    'item': {
      story: '(html) table table:nth-child(1) tr:nth-child(4) td',
      comments: {
        $query: 'tr tr tr',
        $each: {
          user: '(text) .comhead a',
          age: '(text \\b\\d+ \\S+ \\S+) .comhead',
          id: '(attr href \\d+$) .comhead a:nth-child(2)',
          indent_width: '(attr width) > td:nth-child(1) img',
          text: '(html) .comment font',
          color: '(attr color) .comment font'
        }
      }
    },
    'user': {
      $query: 'table table',
      name: '(text) tr:nth-child(1) td:nth-child(2)',
      created: '(text) tr:nth-child(2) td:nth-child(2)',
      karma: '(text) tr:nth-child(3) td:nth-child(2)',
      average_karma: '(text) tr:nth-child(4) td:nth-child(2)',
      about: '(text) tr:nth-child(5) td:nth-child(2)'
    }
  }
};

// List stories from a given page.
var hnews = scrapi(manifest);

hnews('/').get(function (err, json) {
  json.stories.forEach(function (story, i) {
    console.log('[' + (i + 1) + ']', story.title);
    console.log(JSON.stringify(story));
  });
});