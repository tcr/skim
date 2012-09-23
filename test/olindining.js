var scrapi = require('../scrapi');

// Define a specification for scraping Olin Dining Menu

var spec = {
  base: 'http://olindining.com/WeeklyMenu4_002.htm',
  spec: {
    $query: 'a[name=monday] + table.dayinner tr.lun',
    $each: {
    	section: '(text \\S.*) td.station',
    	item: '(text \\S.*) td.menuitem'
    },
    $filter: 'section'
  }
}

scrapi(spec, '', function (ret) {
	var food = {};
	var section = null;
  ret.forEach(function (item) {
  	section = item.section || section;
  	(food[section] || (food[section] = [])).push(item.item);
  })
  console.log(food);
});