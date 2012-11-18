var scrapi = require('..');
var read = require('read');

var manifest = {
  base: 'https://mobile.twitter.com/',
  spec: {
  	'/session/new': {
    	authenticity_token: '(attr value) input[name="authenticity_token"]',
    },
    '/account': {
    	name: '(text ^[^\\n]+) div.fullname'
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