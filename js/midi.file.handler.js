var MIDIFileHandler = (function() {
	'use strict';

	var module = {},
	 		midi   = MIDI.Player;

	$('#file').on('change', function(){

		try {
			var file = fs.readFileSync(this.files[0].name, 'base46')
			midi.loadFile(file, midi.start, function(){console.log('loading progress')},
																			function(){console.log('loading error')});
		} catch (e) {
			console.log(e);
		} finally {

		}
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
