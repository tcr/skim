var scrapi = require('..');

// Define a specification for scraping Github commits

var manifest = {
  base: 'https://github.com',
  spec: {
    changes: {
      $query: '#toc p.explain',
      $value: '(text ^\\d+) span + strong',
    },
    added: {
      $query: '#toc p.explain',
      $value: '(text ^\\d+) span + strong + strong',
    },
    deleted: {
      $query: '#toc p.explain',
      $value: '(text ^\\d+) span + strong + strong + strong',
    }
  }
};

scrapi(manifest, 'tcr/scrapi/commit/ba192e77a0797e64b6dc82542b2a4806c4d7db8e', function (json) {
  console.log(json);
});