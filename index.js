'use strict';

var path = require('path');
var fs = require('fs');
var crypto = require('crypto');

var EXTENSION = '.ft';
var EXTENSION_CACHE = '.ftc';
var EXTENSION_TMP = '.ftt';
var EXTENSION_DOCUMENT = '.json';
var NEWLINE = '\n';
var STRING = 'string';
var FUNCTION = 'function';
var UNDEFINED = 'undefined';
var BOOLEAN = 'boolean';
var ENCODING = 'utf8';

var REG_TAG = /(<([^>]+)>)/ig;

if (typeof(setImmediate) === UNDEFINED) {
	global.setImmediate = function(cb) {
		process.nextTick(cb);
	};
}

function Fulltext(name, directory, documents) {
	this.name = name;
	this.directory = directory;
	this.isReady = false;
	this.fs = new FulltextFile(name, directory, documents);
}

Fulltext.prototype.onAdd = function(id, keywords, document, callback) {
	var self = this;
	self.fs.add(id, keywords, document, callback);
};

Fulltext.prototype.onUpdate = function(id, keywords, document, callback) {
	var self = this;
	self.fs.update(id, keywords, document, callback);
};

Fulltext.prototype.onRemove = function(id, callback) {
	var self = this;
	self.fs.remove(id, callback);
};

Fulltext.prototype.onRead = function(id, callback) {
	var self = this;
	self.fs.read(id, callback);
};

Fulltext.prototype.onFind = function(search, options, callback) {
	var self = this;
	self.fs.find(search, options, callback);
};

Fulltext.prototype.add = function(content, document, callback, max) {
	var self = this;
	var id = new Date().getTime();
	self.onAdd(id, find_keywords(content.replace(REG_TAG, ' '), max), document, callback);
	return id;
};

Fulltext.prototype.read = function(id, callback) {
	var self = this;
	self.onRead(id, callback);
	return self;
};

Fulltext.prototype.update = function(id, content, document, callback) {
	var self = this;
	self.onUpdate(id, keywords, document, callback);
	return self;
};

Fulltext.prototype.remove = function(id, callback) {
	var self = this;
	self.onRemove(id, callback);
	return self;
};

Fulltext.prototype.find = function(search, options, callback) {
	var self = this;
	self.onFind(search, options, callback);
	return self;
};

function FulltextFile(name, directory, documents) {
	this.directory = directory;
	this.documents = documents;
	this.filename = path.join(directory, name + EXTENSION);
	this.filenameCache = path.join(directory, name + EXTENSION_CACHE);
	this.status = 0;
	this.pendingWrite = [];
	this.pendingRead = [];
}

FulltextFile.prototype.add = function(id, keywords, document, callback) {
	var self = this;
	fs.appendFile(self.filename, id + ',' + keywords.join(',') + '\n');
	fs.appendFile(path.join(self.documents, id + EXTENSION_DOCUMENT), JSON.stringify(document));
};

FulltextFile.prototype.update = function(id, keywords, document, callback) {

	var self = this;

	if (!self.canWrite()) {
		self.pendingWrite.push(function() { this.update(id, keywords, document, callback); });
		return self;
	}

	var temporary = path.join(self.directory, self.name + EXTENSION_TMP);
	var reader = fs.createReadStream(self.filename);
	var writer = fs.createWriteStream(temporary);

	reader._buffer = '';

	reader.on('data', function(buffer) {

		var buf = buffer.toString(ENCODING);
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
			self.done();
			if (callback)
				callback();
		});
	});

	reader.on('end', function() {
		self.done();
		writer.end();
	});

	reader.resume();
	return self;
};

FulltextFile.prototype.remove = function(id, callback) {
	var self = this;
	self.update(id, null, null, callback);
	return self;
};

FulltextFile.prototype.read = function(id, callback) {

	var self = this;
	var filename = path.join(self.documents, id + EXTENSION_DOCUMENT);

	fs.readFile(filename, function(err, data) {

		if (err) {
			callback(err, null);
			return;
		}

		callback(null, JSON.parse(data.toString(ENCODING)));
	});

	return self;
};

FulltextFile.prototype.readall = function(id, count, callback) {

	var self = this;
	var output = [];

	var fn = function() {

		var first = id.shift();

		if (typeof(first) === UNDEFINED) {
			callback(count, output);
			return;
		}

		self.read(first, function(err, json) {
			output.push({ id : first, document: json });
			setImmediate(fn);
		});
	};

	fn();
};

FulltextFile.prototype.cacheAdd = function(search, options, arr) {
	var self = this;
	var hash = crypto.createHash('md5');
	hash.update(search + JSON.stringify(options), ENCODING);
	var id = hash.digest('hex');
	fs.appendFile(self.filenameCache, id + '=' + arr.length + ',' + arr.join(',') + '\n');
	return self;
};

FulltextFile.prototype.cacheRead = function(search, options, callback) {
	var self = this;
	var hash = crypto.createHash('md5');

	hash.update(search + JSON.stringify(options), ENCODING);

	var id = hash.digest('hex');
	var stream = fs.createReadStream(self.filenameCache);
	var stop = false;

	stream._buffer = '';

	stream.on('data', function(buffer) {

		if (stop)
			return;

		var buf = buffer.toString(ENCODING);
		stream._buffer += buf;

		var index = buf.indexOf(NEWLINE);

		while (index !== -1) {

			var line = stream._buffer.substring(0, index);
			var beg = line.indexOf('=');

			if (line.substring(0, beg) === id) {
				var sum = parseInt(line.substring(beg + 1, line.indexOf(',')));

				self.readall(skip(line, options.take || 0, options.skip || 50).split(','), sum, callback);
				stream._buffer = null;
				stream.resume();
				stream = null;
				stop = true;
				break;
			}

			stream._buffer = stream._buffer.substring(index + 1);
			index = stream._buffer.indexOf('\n');
		}

	});

	stream.on('error', function() {
		callback(null, 0);
	});

	stream.resume();
};

// options.alternate = true | false;
// options.strict = true | false;
// options.skip = 0;
// options.take = 50;
FulltextFile.prototype.find = function(search, options, callback) {

	var self = this;

	if (!self.canRead()) {
		self.pendingRead.push(function() { this.find(search, options, callback); });
		return self;
	}

	options = options || {};
	options.take = options.take || 10;
	options.skip = options.skip || 0;

	if (typeof(options.strict) === UNDEFINED)
		options.strict = true;

	self.cacheRead(search, options, function(arr, count) {

		if (arr !== null && arr.length > 0) {
			self.readall(arr, count, callback);
			return;
		}

		arr = [];
		var keywords = find_keywords(search, options.alternate);
		var length = keywords.length;
		var count = 0;
		var rating = {};
		var sumarize = 0;

		self.each(function(line) {

			var index = line.indexOf(',');
			var id = line.substring(0, index);
			var all = line.substring(index + 1);
			var isFinded = true;
			var sum = 0;
			var counter = 1;
			var ln = line.length;

			for (var i = 0; i < length; i++) {
				var keyword = keywords[i];
				var indexer = all.indexOf(keyword);

				if (indexer === -1) {
					counter++;
					sum += ln;
					if (options.strict) {
						isFinded = false;
						break;
					}
				} else
					sum += indexer;
			}

			if (isFinded) {
				sumarize++;
				rating[id] = sum * counter;
				arr.push(id);
				count++;
			}

			return true;

		}, function() {

			self.done();

			if (arr.length === 0) {
				self.cacheAdd(search, options, []);
				callback([]);
				return;
			}

			arr.sort(function(a, b) {
				var ra = rating[a];
				var rb = rating[b];
				if (ra > rb)
					return 1;
				if (ra < rb)
					return -1;
				return 0;
			});

			self.cacheAdd(search, options, arr);
			var from = options.skip * options.take;
			self.readall(arr.slice(from, from + options.take), arr.length, callback);

		});

	});

	return self;
};

FulltextFile.prototype.each = function(map, callback) {

	var self = this;
	var stream = fs.createReadStream(self.filename);
	var arr = [];
	var stop = false;

	stream._buffer = '';

	stream.on('data', function(buffer) {

		if (stop)
			return;

		var buf = buffer.toString(ENCODING);
		stream._buffer += buf;

		var index = buf.indexOf(NEWLINE);

		while (index !== -1) {

			stop = !map(stream._buffer.substring(0, index));

			if (stop) {
				stream.resume();
				stream = null;
				break;
			}

			stream._buffer = stream._buffer.substring(index + 1);
			index = stream._buffer.indexOf('\n');
		}

	});

	stream.on('error', function() {
		callback();
	});

	stream.on('end', callback);
	stream.resume();

	return self;
};

FulltextFile.prototype.canRead = function(fn) {
	return this.pendingWrite.length === 0;
};

FulltextFile.prototype.canWrite = function() {
	return this.pendingWrite.length === 0;
};

FulltextFile.prototype.done = function () {

	var self = this;

	if (self.pendingWrite.length > 0) {
		self.pendingWrite.shift();
		return;
	}

	if (self.pendingRead.length > 0) {
		self.pendingRead.shift();
		return;
	}

	return self;
};

function noop() {}

function skip(str, skip, take) {

	var index = -1;
	var counter = -1;
	var beg = 0;
	var end = 0;

	take += skip;

	do {

		index = str.indexOf(',', index + 1);
		counter++;

		if (counter === skip) {
			beg = index + 1;
			continue;
		}

		if (counter === take) {
			end = index;
			break;
		}

	}
	while (index !== -1);

	if (end < 1)
		end = str.length;

	return str.substring(beg, end);
}

if (!String.prototype.removeDiacritics) {
	String.prototype.removeDiacritics = function() {
		var str = this.toString();
	    var dictionaryA = ['á', 'ä', 'č', 'ď', 'é', 'ě', 'ť', 'ž', 'ú', 'ů', 'ü', 'í', 'ï', 'ô', 'ó', 'ö', 'š', 'ľ', 'ĺ', 'ý', 'ÿ', 'č', 'ř'];
	    var dictionaryB = ['a', 'a', 'c', 'd', 'e', 'e', 't', 'z', 'u', 'u', 'u', 'i', 'i', 'o', 'o', 'o', 's', 'l', 'l', 'y', 'y', 'c', 'r'];
	    var buf = '';
	    var length = str.length;
	    for (var i = 0; i < length; i++) {
	        var c = str[i];
	        var isUpper = false;

	        var index = dictionaryA.indexOf(c);
	        if (index === -1) {
	            index = dictionaryA.indexOf(c.toLowerCase());
	            isUpper = true;
	        }

	        if (index === -1) {
	            buf += c;
	            continue;
	        }

	        c = dictionaryB[index];
	        if (isUpper)
	            c = c.toUpperCase();

	        buf += c;
	    }
	    return buf;
	};
}

if (!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^[\s]+|[\s]+$/g, '');
	};
}

function find_keywords(content, alternative, count, max, min) {

	min = min || 2;
	count = count || 200;
	max = max || 20;

	var words = content.removeDiacritics().toLowerCase().replace(/y/g, 'i').match(/\w+/g);

	if (words === null)
		words = [];

	var length = words.length;
	var dic = {};
	var counter = 0;

	for (var i = 0; i < length; i++) {
		var word = words[i].trim();

		if (word.length < min)
			continue;

		if (counter >= count)
			break;

		word = word.toLowerCase().removeDiacritics().replace(/\W|_/g, '').replace(/y/g, 'i');

		if (alternative)
			word = word.substring(0, (word.length / 100) * 80);

		if (word.length < min || word.length > max)
			continue;

		if (typeof(dic[word]) === UNDEFINED)
			dic[word] = 1;
		else
			dic[word]++;

		counter++;
	}

	var keys = Object.keys(dic);

	keys.sort(function(a, b) {

		var countA = dic[a];
		var countB = dic[b];

		if (countA > countB)
			return -1;

		if (countA < countB)
			return 1;

		return 0;
	});

	return keys;
}

module.exports = Fulltext;