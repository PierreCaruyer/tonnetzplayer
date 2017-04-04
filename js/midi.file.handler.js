if (typeof MIDI === 'undefined') MIDI = {};
if (typeof MIDI.Player === 'undefined') MIDI.Player = {};

var fileHandler = (function() {
	'use strict';

	var module = {},
	 		midi   = MIDI.Player;
	module.song = {};
	module.tracks = [];
	module.notes = [];
	module.channel = 0;

	module.playMIDIFile = function(file) {
		midi.loadFile(file.name, midi.start);
		if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
				console.log("Reading files not supported by this browser");
		} else {
			var reader = new FileReader();
			reader.onload = function(e){
				module.song = MidiConvert.parse(e.target.result);
				module.tracks = module.song.tracks;
				//playTracks();
			};
			reader.readAsBinaryString(file);
		}
	};

	var playTracks = function() {
		for(var n = 0; n < module.tracks.length; n++){
			module.notes = module.tracks[n].notes;
			for(var p = 0; p < module.notes.length; p++) {
				playNote(module.notes[p]);
			}
		}
	};

	var playNote = function(note) {
		var start = Date.now(), delay = 0, delayOn;
		var now = Date.now() - start;
		setTimeout(function(){
			delayOn = delay = note.time - (now - note.time);
			MIDI.noteOn(module.channel, note.midi, note.velocity, note.time);
			tonnetz.noteOn(module.channel, note.midi);
		}, delay * 1000);
		setTimeout(function(){
			var now = Date.now() - start;
			delay = ((note.time + note.duration));
			if(delayOn < delay)
			//MIDI.noteOff(module.channel, note.midi, note.velocity, note.time + note.duration);
			tonnetz.noteOff(module.channel, note.midi);
		}, delay * 1000);
	};

	var rePlayNote = function(note, midi) {
		var delayOn = 2.500, delayOff = 2.700;
		if(midi) {
				MIDI.noteOn(note.channel, note.note, note.velocity, delayOn);
				tonnetz.noteOn(note.channel, note.note);
		}
		else {
				MIDI.noteOn(module.channel, note.midi, note.velocity, delayOn);
				tonnetz.noteOn(module.channel, note.midi);
		}
	};

	module.notesReplayer = function(notes, midi) {
		for(var n = 0; n < notes.length; n++)
			rePlayNote(notes[n], midi);
	};

	module.whichNotesOn = function(time) {
		var notesAt = [];
		time = time / 1000;
		console.log(time);
		for(var n = 0; n < module.tracks.length; n++){
			module.notes = module.tracks[n].notes;
			for(var note = 0; note < module.notes.length; note++) {
				var noteData = module.notes[note];
				if((time > noteData.time) && (time < (noteData.duration + noteData.time))) {
					notesAt.push(noteData);
				}
			}
		}
		return notesAt;
	};

	module.requestDisplay = function(time) {
		var notes = module.whichNotesOn(time);
		for(var n = 0; n < notes.length; n++)
			tonnetz.noteOn(module.channel, notes[n].midi);
	};

	return module;
})();
