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

	module.playSong = function() {

	};

	var playFrom = function(time) {
		var notes = reachNotesAt(time, module.song);
		for(var current = notes; current < module.song.length; current++) {
			var note = module.notes[n];
			playNote(note);
		}
	};

	var reachNotesAt = function(time, notes) {
		var notesAt = [], count = 0, firstNoteAt = -1;
		var noteData = {};
		for(var note = 0; note < notes.length; note++) {
			noteData = notes[note];
			var fulltime = noteData.duration + noteData.time;
			if((time > noteData.time) && (time < (noteData.duration + noteData.time))) {
				notesAt.push(noteData);
				if(firstNoteAt === -1)
					firstNoteAt = count;
			}
			count++;
		}
		return {
			firstNote: firstNoteAt,
			notes: notesAt
		};
	};

	var playNote = function(note) {
		var start = Date.now(), delay = 0;
		setTimeout(function(){
			var now = Date.now() - start;
			delay = note.time - (now - note.time);
			MIDI.noteOn(module.channel, note.midi, note.velocity, note.time);
			tonnetz.noteOn(module.channel, note.midi);
		}, delay * 1000);
		setTimeout(function(){
			var now = Date.now() - start;
			delay = ((note.time + note.duration)) - (now - ((note.time + note.duration)));
			console.log(delay * 1000);
			MIDI.noteOn(module.channel, note.midi, note.velocity, note.duration);
			tonnetz.noteOn(module.channel, note.midi);
		}, delay * 1000);
	};

	//Time : seconds
	module.whichNotesOn = function(time) {
		var notes = reachNotesAt(time, module.notes);
		var current = {}, current = 0, start = Date.now(), delay = 0;
		console.log(JSON.stringify(notes, undefined, 2));
		for(var note = 0; note < notes.notes.length; note++){
			current = notes.notes[note];
			playNote(current);
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
				console.log(JSON.stringify(module.notes, undefined, 2));
				var start = Date.now(), delay = 0, note = {}, now;
				for(var n = 0; n < module.notes.length; n++) {
					(function(note){
						note = module.notes[n];
						setTimeout(function(){
							now = Date.now() - start;
							console.log('now ' + now);
							delay = note.time - (now - note.time);
							console.log('note time ' + note.time);
							console.log('delay' + delay);
							console.log('now ' + now);
							MIDI.noteOn(module.channel, note.midi, note.velocity, note.time + note.duration);
							tonnetz.noteOn(module.channel, note.midi);
						}, 1000 * (note.time);
						setTimeout(function(){
							now = Date.now() - start;
							delay = ((note.time + note.duration)) - (now - ((note.time + note.duration)));

							MIDI.noteOn(module.channel, note.midi, note.velocity, note.duration + note.time);
							tonnetz.noteOn(module.channel, note.midi);
						}, 500 * (note.time + note.duration));
					})(n, start);
				}
			};
			reader.readAsBinaryString(file);
		}
	};

	return module;
})();
