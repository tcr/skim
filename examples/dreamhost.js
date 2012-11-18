var scrapi = require('..');
var read = require('read');

var manifest = {
  base: 'https://panel.dreamhost.com',
  spec: {
    '?tree=domain.manage': {
      domains: {
        $query: 'table.fancytable > tr',
        $each: {
          domain: '(text) td.left strong',
          subdomains: {
            $query: '+ tbody[id] td.left strong',
            $each: '(text) '
          }
        },
        $filter: 'domain'
      }
    },
    '?tree=domain.registration': {
      domains: {
        $query: '#registrations_table td.left a',
        $each: '(text \\S+)'
      }
    }
  }
};

// Each API captures all cookies for a session.
var dreamhost = scrapi(manifest);

// Begin the mobile twitter login process.
dreamhost('/').get(function (err, json) {
  read({prompt: 'Username: '}, function (err, username) {
    read({prompt: 'Password: ', silent: true}, function (err, password) {
      dreamhost('/').post({
        username: username,
        password: password,
        Nscmd: 'Nlogin'
      }, function (err, json) {
        dreamhost({tree: 'domain.registration'}).get(function (err, json) {
          console.log(json.domains);
        });
      })
    });
  });
});