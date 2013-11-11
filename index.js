var path = require('path');
var fs = require('fs');

var VERSION = '1.0.0';
var EXTENSION = '.ft';
var EXTENSION_TMP = '.ftt';
var MAX_WRITESTREAM = 2;
var MAX_READSTREAM = 4;
var NEWLINE = '\n';
var STRING = 'string';
var FUNCTION = 'function';
var UNDEFINED = 'undefined';
var BOOLEAN = 'boolean';

function Fulltext(name, directory) {
	this.name = name;
	this.directory = directory;
	this.isReady = false;
}

Fulltext.prototype.add = function(content, document, callback) {

};

Fulltext.prototype.read = function(id, callback) {

};

Fulltext.prototype.update = function(id, content, document, callback) {

};

Fulltext.prototype.remove = function(id, callback) {

};

Fulltext.prototype.find = function(id, search, options, callback) {

};


function FulltextFile(name, directory, documents) {
	this.directory = directory;
	this.documents = documents;
	this.filename = path.join(directory, name + EXTENSION);
	this.status = 0;
}

FulltextFile.prototype.add = function(id, keywords, document, callback) {
	fs.appendFile(this.filename, id + ',' + keywords.join(',') + '\n');
};

FulltextFile.prototype.update = function(id, keywords, document, callback) {

	var self = this;
	var temporary = path.join(self.directory, self.name + EXTENSION_TMP);
	var reader = fs.createReadStream(self.filename);
	var writer = fs.createWriteStream(temporary);

	reader._buffer = '';

	reader.on('data', function(buffer) {

		var buf = buffer.toString('utf8');
		reader._buffer += buf;

		var index = buf.indexOf(NEWLINE);

		while (index !== -1) {
			var line = reader._buffer.substring(0, index);
			var current = line.substring(0, line.indexOf(','));

			if (current === id) {
				var filename = path.join(self.documents, id);
				if (keywords !== null) {
					writer.write(id + ',' + keywords.join(',') + NEWLINE);
					fs.writeFile(filename, JSON.stringify(document));
				}
				else
					fs.unlink(filename, noop);
			} else
				writer.write(line + NEWLINE);

			reader._buffer = reader._buffer.substring(index + 1);
			index = reader._buffer.indexOf('\n');
		}

	});

	writer.on('close', function() {
		fs.rename(temporary, self.filename, function(err) {
			console.log('OK');
		});
	});

	reader.on('end', function() {
		writer.end();
	});

	reader.resume();	

};

FulltextFile.prototype.remove = function(id, callback) {

};

FulltextFile.prototype.read = function(id, callback) {

};

FulltextFile.prototype.each = function(map, callback) {

	var self = this;
	var stream = fs.createReadStream(self.filename);

	stream._buffer = '';

	stream.on('data', function(buffer) {

		var buf = buffer.toString('utf8');
		stream._buffer += buf;

		var index = buf.indexOf(NEWLINE);
		while (index !== -1) {
			map(stream._buffer.substring(0, index));
			stream._buffer = stream._buffer.substring(index + 1);
			index = stream._buffer.indexOf('\n');
		}

	});

	if (callback)
		stream.on('end', callback);

	stream.resume();
};

function noop() {}

var file = new FulltextFile('clanky', '/users/petersirka/desktop/test/', '/users/petersirka/desktop/test/documents/');
//file.add('1', ['mama', 'peter', 'janko', 'mrkvička'], {});
/*
file.each(function(line) {
	console.log('#', line);
}, function() {
	console.log('OK');
});
*/
file.update('1', ['neviem', '1', 'tip'], { name: 'Super' });