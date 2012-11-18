var scrapi = require('..');
var read = require('read');

var manifest = {
  base: 'https://mobile.twitter.com/',
  spec: {
    authenticity_token: {
      $query: 'input[name="authenticity_token"]',
      $value: '(attr value)'
    },
    name: {
      $query: 'div.fullname',
      $value: '(text ^[^\\n]+)'
    }
  }
};

var tw = scrapi(manifest);

tw('session/new').get(function (err, json) {
	var authenticity_token = json.authenticity_token;
	read({prompt: 'Username: '}, function (err, username) {
		read({prompt: 'Password: ', silent: true}, function (err, password) {
			tw('session').post({
				authenticity_token: authenticity_token,
				username: username,
				password: password
			}, function (err, json) {
				tw('account').get(function (err, json) {
					console.log(json);
				})
			})
		});
	})
});