if (typeof MIDI === 'undefined') MIDI = {};
if (typeof MIDI.Player === 'undefined') MIDI.Player = {};

var MIDIFileHandler = (function() {
	'use strict';

	var module = {},
	 		midi   = MIDI.Player,
			noteEvents = [];
	module.song = {};
	module.tracks = {};
	module.notes = {};
	module.channel = 0;

	module.playMIDIFile = function(file) {
		midi.stop();
		getMidiData(file);
		//midi.loadMidiFile(midi.start);
	};

/**
* re-formatting notes to match the format required by player.js
*/
	var formatNotes = function(notes) {
		var delay = 0,
				nextNoteOffTime = 0,
				note = {},
				nextNote = {},
				adapter = [],
				offNotes = [];

		for(var n = 0; n < notes.length - 1; n++) {
			note = notes[n];
			nextNote = notes[n+1];
			note.subtype = 'noteOn';
			adapter.push(note);
			offNotes.push(getNextNoteOff(note));
			while((offNotes[0] && offNotes[0].time) && offNotes[0].time < nextNote.time) {
				adapter.push(offNotes[0]);
				offNotes.shift();
			}
			//midi.schedule(module.channel, note.midi, 0, 0, 144, note.velocity, note.time);
		}
		return adapter;
	};

	var getNextNoteOff = function(note) {
		return {
			midi: note.midi,
			subtype: 'noteOff',
			velocity: 0,
			time: note.time + note.duration,
		};
	};

	var getMidiData = function(file) {
		if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
				console.log("Reading files not supported by this browser");
		} else {
			//read the file
			var reader = new FileReader();
			reader.onload = function(e){
				var notes = [];
				module.song = MidiConvert.parse(e.target.result);
				module.tracks = module.song.tracks;
				notes = module.tracks[1].notes;
				midi.data = module.notes;
				midi.startDelay = module.tracks[1].startTime;
				midi.data = module.notes = formatNotes(notes);
				var stringParts = JSON.stringify(module.song, undefined, 2);
				console.log(stringParts);
			};
			reader.readAsBinaryString(file);
		}
	};

	return module;
})();
