var skim = require('..')
  , rem = require('rem');

rem.stream('http://httpstatus.es').get().pipe(skim({
	$query: "#statuses a",
	$each: {
		"number": "(text \\d+)",
		"href": "(attr href)"
	}
}, function () {
	console.log(arguments);
}));