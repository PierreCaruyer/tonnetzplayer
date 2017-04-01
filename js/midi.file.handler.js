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
		module.loadData(file);
	};

	var reachNotesAt = function(time, notes) {
		var notesAt = [];
		time = time / 1000;
		for(var note = 0; note < notes.length; note++) {
			var noteData = notes[note];
			if((time > noteData.time) && (time < (noteData.duration + noteData.time))) {
				notesAt.push(noteData);
			}
		}
		return notesAt;
	};

	var playNote = function(note) {
		var start = Date.now(), delay = 0;
		setTimeout(function(){
			var now = Date.now() - start;
			delay = note.time - (now - note.time);
			MIDI.noteOn(module.channel, note.midi, note.velocity, note.time);
			tonnetz.noteOn(module.channel, note.midi);
		}, delay);
		setTimeout(function(){
			var now = Date.now() - start;
			delay = ((note.time + note.duration)) - (now - ((note.time + note.duration)));
			MIDI.noteOff(module.channel, note.midi, note.velocity, note.duration);
			tonnetz.noteOff(module.channel, note.midi);
		}, delay);
	};

	var rePlayNote = function(note, midi) {
		if(midi) {
			setTimeout(function(){
				MIDI.noteOn(module.channel, note.noteNumber, note.velocity, note.time);
				tonnetz.noteOn(module.channel, note.midi);
			}, 500);
			setTimeout(function(){
				MIDI.noteOn(module.channel, note.noteNumber, note.velocity, note.duration);
				tonnetz.noteOn(module.channel, note.midi);
			}, 600);
		}
		else {
			setTimeout(function(){
				MIDI.noteOn(module.channel, note.midi, note.velocity, note.time);
				tonnetz.noteOn(module.channel, note.midi);
			}, 500);
			setTimeout(function(){
				MIDI.noteOn(module.channel, note.midi, note.velocity, note.duration);
				tonnetz.noteOn(module.channel, note.midi);
			}, 600);
		}
	};

	module.notesReplayer = function(notes, midi) {
		for(var n = 0; n < notes.length; n++)
			rePlayNote(notes[n], midi);
	};

	//Time : seconds
	module.whichNotesOn = function(time) {
		return reachNotesAt(time, module.notes);
	};

	module.requestDisplay = function(time) {
		var notes = reachNotesAt(time);
	};

	module.loadData = function(file) {
		if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
				console.log("Reading files not supported by this browser");
		} else {
			var reader = new FileReader();
			reader.onload = function(e){
				module.song = MidiConvert.parse(e.target.result);
				module.tracks = module.song.tracks;
				module.notes = module.tracks[1].notes;
				console.log(module.tracks.length);
				for(var n = 0; n < module.tracks.length; n++) {
					for(var p = 0; p < module.tracks[n].notes.length; p++) {
						playNote(module.tracks[n].notes[p]);
					}
				}
				//midi.loadFile(file.name, midi.start);
			};
			reader.readAsBinaryString(file);
		}
	};

	return module;
})();
