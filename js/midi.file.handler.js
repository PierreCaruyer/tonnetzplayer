if (typeof MIDI === 'undefined') MIDI = {};
if (typeof MIDI.Player === 'undefined') MIDI.Player = {};

var MIDIFileHandler = (function() {
	'use strict';

	var module = {},
	 		midi   = MIDI.Player;
	module.song = {};
	module.tracks = [];
	module.notes = [];
	module.channel = 0;

	module.playMIDIFile = function(file) {
		midi.stop();
		getMidiData(file);
	};

	var reachNotesAt = function(time, notes) {
		var notesAt = [], count = 0;
		var noteData = {};
		for(var note = 0; note < notes.length; note++) {
			noteData = notes[note];
			var fulltime = noteData.duration + noteData.time;
			if((time > noteData.time) && (time < (noteData.duration + noteData.time)))
				notesAt.push(noteData);
			count++;
		}
		return {
			firstNote: count,
			notes: notesAt
		};
	};

	//Time : seconds
	module.whichNotesOn = function(time) {
		var notes = reachNotesAt(time, module.notes);
		console.log(JSON.stringify(notes, undefined, 2));
		var i = 0, current = {};
		tonnetz.init();
		for(var note = 0; note < notes.notes.length; i++) {
			current = notes.notes[note];
			MIDI.noteOn(0, current.midi, current.velocity, current.time + current.duration);

			tonnetz.noteOn(0, current.midi);
		}
	};

	var getMidiData = function(file) {
		if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
				console.log("Reading files not supported by this browser");
		} else {
			var reader = new FileReader();
			reader.onload = function(e){
				module.song = MidiConvert.parse(e.target.result);
				module.tracks = module.song.tracks;
				module.notes = module.tracks[1].notes;
				//var stringParts = JSON.stringify(module.song, undefined, 2);
				//console.log(stringParts);
				module.whichNotesOn(7.8);
			};
			reader.readAsBinaryString(file);
		}
	};

	return module;
})();
