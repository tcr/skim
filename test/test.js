var scrapi = require('../scrapi');

// Define a specification for scraping Hacker News

var spec = {
  base: 'http://news.ycombinator.com/',
  spec: {
    $query: 'table table tr:nth-child(3n+1)',
    $each: {
      title: '(text) a',
      link: '(attr href) a',
      user: '(text) + tr a[href^=user]',
      comments: '(text ^\\d+) + tr a[href^=item]',
      id: '(attr href \\d+$) + tr a[href^=item]'
    },
    $filter: 'id'
  }
}

scrapi(spec, '', function (ret) {
  console.log(ret);
});