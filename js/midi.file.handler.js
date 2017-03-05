var MIDIFileHandler = (function() {
	"use strict";

	var module = {};

	module.song = {};
	module.data = {};

	var PLAY	 = 0,
			RECORD = 1;

	$('#file').on('change', function(){
		var mode = document.getElementById('mode-select').selectedIndex;
		var filename = this.files[0].name;
		switch(mode) {
			case PLAY:
				MIDI.Player.loadFile(this.files[0], player.start);
				break;
			case RECORD:

				break;
			default:
				break;
		}
	});

	var fileLoadingProgress = function() {
		console.log('loading in progress');
	}

	var fileLoadingError = function() {
		console.log('loading failed');
	}

	//Add path selection where to a the newly created file
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
