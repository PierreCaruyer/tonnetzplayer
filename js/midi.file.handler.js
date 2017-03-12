if (typeof MIDI === 'undefined') MIDI = {};
if (typeof MIDI.Player === 'undefined') MIDI.Player = {};

var MIDIFileHandler = (function() {
	'use strict';

	var module = {},
	 		midi   = MIDI.Player;
			module.song = {};
			module.tracks = {};
			module.notes = {};
			module.channel = 0;

	module.playMIDIFile = function(file) {
		midi.stop();
		getMidiData(file);
	};

	var playNote = function(event) {
		MIDI.noteOn(0, 60, event.velocity, event.duration);

		tonnetz.noteOn(module.channel, event.midi);
	};

	var getMidiData = function(file) {
		if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
				console.log("Reading files not supported by this browser");
		} else {
			//read the file
			var reader = new FileReader();
			reader.onload = function(e){
				module.song = MidiConvert.parse(e.target.result);
				module.tracks = module.song.tracks;
				//module.channel = module.tracks[1].channelNumber;
				module.notes = module.tracks[1].notes;
				console.log(module.notes);
				playNote(module.notes[2]);
				var stringParts = JSON.stringify(module.song, undefined, 2);
				console.log(stringParts);
				//console.log(data.tracks);
			};
			reader.readAsBinaryString(file);
		}
	};

	return module;
})();
