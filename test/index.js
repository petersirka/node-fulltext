var Fulltext = require('../index');
var fulltext = new Fulltext('markdown', '/users/petersirka/desktop/test/', '/users/petersirka/desktop/test/documents/');
var path = require('path');
var fs = require('fs');
var UNDEFINED = 'undefined';

function add() {
	var dir = '/users/petersirka/desktop/docs/';
	fs.readdir(dir, function (err, arr) {

		arr.forEach(function(filename) {
			filename = path.join(dir, filename);
			var content = fs.readFileSync(filename).toString('utf8');
			fulltext.add(content, { filename: filename });
		});

	});
}

fulltext.find('nosql database embedded', { max: 5 }, function(docs) {
	console.log(docs);
});

//add();