var Fulltext = require('../index');
var fulltext = new Fulltext('markdown', '/users/petersirka/desktop/test/', '/users/petersirka/desktop/test/documents/');
var path = require('path');
var fs = require('fs');
var UNDEFINED = 'undefined';
//var url = 'http://docs.partialjs.com/,http://docs.partialjs.com/tutorial/,http://docs.partialjs.com/configuration/,http://docs.partialjs.com/directory/,http://docs.partialjs.com/did-you-know/,https://groups.google.com/forum/#!forum/partialjs,https://github.com/petersirka/partial.js/tree/master/examples,http://docs.partialjs.com/how-does-it-work/definitions/,http://docs.partialjs.com/how-does-it-work/controllers/,http://docs.partialjs.com/how-does-it-work/modules/,http://docs.partialjs.com/how-does-it-work/views/,http://docs.partialjs.com/how-does-it-work/templates/,http://docs.partialjs.com/how-does-it-work/resources/,http://docs.partialjs.com/how-does-it-work/html-css-js/,http://docs.partialjs.com/how-does-it-work/authorization/,http://docs.partialjs.com/how-does-it-work/validation/,http://docs.partialjs.com/Framework/,http://docs.partialjs.com/FrameworkCache/,http://docs.partialjs.com/FrameworkFileSystem/,http://docs.partialjs.com/FrameworkPath/,http://docs.partialjs.com/FrameworkRestrictions/,http://docs.partialjs.com/FrameworkController/,http://docs.partialjs.com/FrameworkWebSocketClient/,http://docs.partialjs.com/FrameworkViews/,http://docs.partialjs.com/FrameworkUtils/,http://docs.partialjs.com/FrameworkMail/,http://docs.partialjs.com/FrameworkImage/,http://docs.partialjs.com/FrameworkNoSQL/,http://docs.partialjs.com/FrameworkMarkdown/,http://docs.partialjs.com/Builders.ErrorBuilder/,http://docs.partialjs.com/Builders.PageBuilder/,http://docs.partialjs.com/Builders.UrlBuilder/,http://docs.partialjs.com/Builders.SchemaBuilder/,http://docs.partialjs.com/Request.prototype/,http://docs.partialjs.com/Response.prototype/,http://docs.partialjs.com/String.prototype/,http://docs.partialjs.com/Number.prototype/,http://docs.partialjs.com/Date.prototype/,http://docs.partialjs.com/Array.prototype/,http://docs.partialjs.com/FrameworkStats/,http://docs.partialjs.com/HttpRouteOptions/,http://docs.partialjs.com/HttpRouteOptionsFlags/,http://docs.partialjs.com/Async/'.split(',');
var url = ['http://www.partialjs.com/', 'http://www.partialjs.com/benefits/', 'http://www.partialjs.com/get-started/', 'http://www.partialjs.com/download/', 'http://www.partialjs.com/ide/', 'http://www.partialjs.com/webhosting/'];
var utils = require('utils.js');

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

function add_url() {
	for (var i = 0; i < url.length; i++) {
		(function(index) {
			setTimeout(function() {
				utils.request(url[index], 'GET', '', function(err, data) {

					data = data.substring(data.indexOf('"content"')).replace(/(<([^>]+)>)/ig, ' ');

					if (!err)
						fulltext.add(data, { url: url[index] });
					else
						console.log(url[i], err);
				});
			}, index * 100);
		})(i);
	}
}

/*
fulltext.find('nosql database embedded', { max: 5 }, function(docs) {
	console.log(docs);
});
*/

//console.log(url);
//add_url();

//add();

fulltext.find('mail', { take: 10, skip: 0 }, function(count, docs) {
	console.log(docs);
});
