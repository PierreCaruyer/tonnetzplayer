var MIDIFileHandler = (function() {
	"use strict";

	var module = {};
	module.song = [];

	var MIDIFileParser,
			fileSync;

	var filename,
			usr_mode;

	module.init = function() {
		define(['midi-file-parser', 'fs'], function(midiFileParser, fs) {
			MIDIFileParser = midiFileParser;
			fileSync = fs;
		});
	};

	module.data = function(path) {
		return MIDIData(path);
	}

	var MIDIData = function(MIDIFile) {
		var file = fileSync.readFileSync(MIDIFile, 'binary');
		var data = MIDIFileParser(file);
		return data;
	};

	$('#file').on('change', function(){
		filename = this.files[0].name;
		module.song = MIDIData(filename);
	});

	module.createMIDIFile = function(filename) {
		var fileHolder = fopen(filename, 3);

		if(fileHolder === -1)
			return false;

		while(event.key != 16)
			recordNote(event, fileHolder);

		return true;
	};

	var recordNote = function(event, fileStream) {

	}

	return module;
})();
