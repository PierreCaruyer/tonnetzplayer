if (typeof MIDI === 'undefined') MIDI = {};
if (typeof MIDI.Player === 'undefined') MIDI.Player = {};
(function() {
var midi = MIDI.Player;
midi.currentTime = 0;
midi.endTime = 0;
midi.restart = 0;
midi.playing = false;
midi.timeWarp = 1;
midi.startDelay = 0;
midi.BPM = 120;
midi.jumpStep = 1;
midi.onsuccess = null;
midi.onprogress = null;
midi.onfailure = null;
var CHANNELS = 17;

midi.start =
midi.resume = function(onsuccess) {
    if (midi.currentTime < -1) {
    	midi.currentTime = -1;
    }
    tonnetz.wipe();
    midi.data = midi.replayer.getData();
    resetTimeline();
    setupTimeline();
    startAudio(midi.currentTime, null, onsuccess);
};

midi.pause = function() {
	var tmp = midi.restart;
	stopAudio();
	midi.restart = tmp;
};

midi.stop = function() {
	stopAudio();
	midi.restart = 0;
	midi.currentTime = 0;
};

midi.addListener = function(onsuccess) {
	onMidiEvent = onsuccess;
};

midi.removeListener = function() {
	onMidiEvent = undefined;
};

midi.clearAnimation = function() {
	if (midi.animationFrameId)  {
		cancelAnimationFrame(midi.animationFrameId);
	}
};

midi.onbpmchange = function(step) {
  if(typeof(step) === 'string') {
    midi.BPM = parseInt(step);
	} else if(typeof(step) === 'number') {
    midi.BPM = step;
	} else {
	}
  midi.stop();
  resetTimeline();
  midi.loadFile(midi.file, midi.onsuccess, midi.onprogress, midi.onfailure);
};

var resetTimeline = function() {
  emptyList(timeline);
  currentPos = 0;
};

midi.setBackTrackStep = function(step) {
  var typeofstep = typeof(step);
  if(typeofstep === 'string') {
    midi.jumpStep = parseInt(step);
	} else if(typeofstep === 'number') {
    midi.jumpStep = step;
	} else {
    midi.jumpStep = 1;
	}
};

midi.setAnimation = function(callback) {
	var currentTime = 0;
	var tOurTime = 0;
	var tTheirTime = 0;
	//
	midi.clearAnimation();
	///
	var frame = function() {
		midi.animationFrameId = requestAnimationFrame(frame);
		///
		if (midi.endTime === 0) {
			return;
		}
		if (midi.playing) {
			currentTime = (tTheirTime === midi.currentTime) ? tOurTime - Date.now() : 0;
			if (midi.currentTime === 0) {
				currentTime = 0;
			} else {
				currentTime = midi.currentTime - currentTime;
			}
			if (tTheirTime !== midi.currentTime) {
				tOurTime = Date.now();
				tTheirTime = midi.currentTime;
			}
		} else { // paused
			currentTime = midi.currentTime;
		}
		///
		var endTime = midi.endTime;
		var percent = currentTime / endTime;
		var total = currentTime / 1000;
		var minutes = total / 60;
		var seconds = total - (minutes * 60);
		var t1 = minutes * 60 + seconds;
		var t2 = (endTime / 1000);
		///
		if (t2 - t1 < -1.0) {
			return;
		} else {
			callback({
				now: t1,
				end: t2,
				events: noteRegistrar
			});
		}
	};
	///
	requestAnimationFrame(frame);
};

midi.loadMidiFile = function(file, onsuccess, onprogress, onerror) {
	try {
    midi.currentData = file;
    midi.onsuccess = onsuccess;
    midi.onprogress = onprogress;
    midi.onerror = onerror;
		midi.replayer = new Replayer(MidiFile(midi.currentData), midi.timeWarp, null, midi.BPM);
		midi.data = midi.replayer.getData();
		midi.endTime = getLength();
    var pausePlayButton = document.getElementById('pausePlayStop');
    pausePlayButton.src = "./images/pause.png";

		MIDI.loadPlugin({
// 			instruments: midi.getFileInstruments(),
			onsuccess: onsuccess,
			onprogress: onprogress,
			onerror: onerror
		});
	} catch(event) {
    console.log(event);
		onerror && onerror(event);
	}
};

midi.loadFile = function(file, onsuccess, onprogress, onerror) {
  midi.file = file;
  midi.onsuccess = onsuccess;
  midi.onprogress = onprogress;
  midi.onfailure = onerror;
	if (file.indexOf('base64,') !== -1) {
		var data = window.atob(file.split(',')[1]);
		midi.currentData = data;
		midi.loadMidiFile(onsuccess, onprogress, onerror);
	} else {
    var fetch = new XMLHttpRequest();
		fetch.open('GET', file);
		fetch.overrideMimeType('text/plain; charset=x-user-defined');
		fetch.onreadystatechange = function() {
			if (this.readyState === 4) {
				if (this.status === 200) {
					var t = this.responseText || '';
					var ff = [];
					var mx = t.length;
					var scc = String.fromCharCode;
					for (var z = 0; z < mx; z++) {
						ff[z] = scc(t.charCodeAt(z) & 255);
					}
					var data = ff.join('');
					midi.currentData = data;
					midi.loadMidiFile(onsuccess, onprogress, onerror);
				} else {
					onerror && onerror('Unable to load MIDI file');
				}
			}
		};
		fetch.send();
	}
};

var updateDisplay = function(skip) {
  var event = timeline[currentPos];
	tonnetz.wipe();
  if(skip) {
    tonnetz.wipe();
    for(var n = 0; n < event.notes.length; n++) {
      MIDI.noteOn(event.notes[n].channel, event.notes[n].pitch, 500, 0);
      tonnetz.noteOn(event.notes[n].channel, event.notes[n].pitch);
    }
  }
  else {
    for(var n = 0; n < event.notes.length; n++)
      tonnetz.noteOn(event.notes[n].channel, event.notes[n].pitch);
    for(var index = 0; index < event.off_notes.length; index++)
      tonnetz.noteOff(event.off_notes[index].channel, event.off_notes[index].pitch);
  }
};

midi.stepBack = function() {
  midi.pause(true);
  currentPos -= midi.jumpStep;
  if(currentPos >= 0 && currentPos < timeline.length)
    updateDisplay(true);
};

midi.stepForward = function() {
 midi.pause(true);
 currentPos += midi.jumpStep;
 if(currentPos >= 0 && currentPos < timeline.length)
  updateDisplay(true);
};

var updateDisplayWhilePlaying = function() {
  if(currentPos >= 0 && currentPos < timeline.length)
    updateDisplay();
  currentPos++;
};

//Playing the audio
var eventQueue = []; // hold events to be triggered
var timeline = []; //timeline registering a tone each time noteOff or a noteOn event happens
var array = [];
var currentPos = 0;
var queuedTime; //
var startTime = 0; // to measure time elapse
var noteRegistrar = {}; // get event for requested note
var onMidiEvent = undefined; // listener
var scheduleTracking = function(channel, note, currentTime, offset, message, velocity, time) {
	return setTimeout(() => {
		var data = {
			channel: channel,
			note: note,
			now: currentTime,
			end: midi.endTime,
			message: message,
			velocity: velocity
		};
		if (message === 128) {
			delete noteRegistrar[note];
		} else {
			noteRegistrar[note] = data;
		}

    updateDisplayWhilePlaying();
		midi.currentTime = currentTime;
		///
		eventQueue.shift();
		///
		if (eventQueue.length < 1000) {
			startAudio(queuedTime, true);
		} else if (midi.currentTime === queuedTime && queuedTime < midi.endTime) { // grab next sequence
      startAudio(queuedTime, true);
		}
	}, currentTime - offset);
};

var getContext = function() {
	if (MIDI.api === 'webaudio') {
		return MIDI.WebAudio.getContext();
	} else {
		midi.ctx = {currentTime: 0};
	}
	return midi.ctx;
};

var getLength = function() {
	var data =  midi.data;
	var length = data.length;
	var totalTime = 0.5;
	for (var n = 0; n < length; n++)
		totalTime += data[n][1];
	return totalTime;
};

var __now;
var getNow = function() {
    if (window.performance && window.performance.now) {
        return window.performance.now();
    } else {
		return Date.now();
	}
};

var find_note_index = function(noteArray, channel, pitch) {
	var deleted_indeces = [];
	for(var n = 0; n < noteArray.length; n++)
		if(noteArray[n].pitch === pitch && channel === channel)
			deleted_indeces.push(n);
	return deleted_indeces;
};

var setupTimeline = function() {
	if(!midi.replayer) return;
	var note,
			index = 0;
	var data = midi.data;
	var length = data.length;

	for (var n = 0; n < length; n++) //Initializing timeline
		if(data[n][0].event.subtype === 'noteOn' || data[n][0].event.subtype === 'noteOff')
			timeline.push({ notes: [], off_notes: [] });
	
	for (var n = 0; n < length; n++) {
		var obj = data[n];
		var event = obj[0].event;
		var subtype = event.subtype;
		if(subtype !== 'noteOn' && subtype !== 'noteOff')
			continue;
		var channelId = event.channel;
		note = event.noteNumber - (midi.MIDIOffset || 0);
		if(subtype === 'noteOn') {
			scheduleDisplay(channelId, note, 144, index);
		} else {
			scheduleDisplay(channelId, note, 128, index)
		}
		index++;
	}
};

var scheduleDisplay = function(channel, note, message, index) {
	if (message === 128) { //noteOff
		var indeces = find_note_index(array, channel ,note);
		var notes = [];
		for(var n = 0; n < indeces.length; n++) {
			var note = array.splice(indeces[n], 1);
			if(note[0]) notes.push(note[0]);
		}
		for(var c = 0; c < array.length; c++)
			timeline[index].notes.push(array[c]);
		for(var a = 0; a < notes.length; a++)
			timeline[index].off_notes.push(notes[a]);
	} else { //noteOn
		array.push({ channel: channel, pitch: note });
		for(var c = 0; c < array.length; c++)
			timeline[index].notes.push(array[c]);
	}
};

var emptyList = function(list) {
  while(list.length)
    list.shift();
};

var startAudio = function(currentTime, fromCache, onsuccess) {
	if (!midi.replayer) {
		return;
	}
	if (!fromCache) {
		if (typeof currentTime === 'undefined') {
			currentTime = midi.restart;
		}
		///
		midi.playing && stopAudio();
		midi.playing = true;
		midi.data = midi.replayer.getData();
		midi.endTime = getLength();
	}
	///
	var note;
	var offset = 0;
	var messages = 0;
	var data = midi.data;
	var ctx = getContext();
	var length = data.length;
	//
	queuedTime = 0.5;
	///
	var interval = eventQueue[0] && eventQueue[0].interval || 0;
	var foffset = currentTime - midi.currentTime;
	///
	if (MIDI.api !== 'webaudio') { // set currentTime on ctx
		var now = getNow();
		__now = __now || now;
		ctx.currentTime = (now - __now) / 1000;
	}
	///
	startTime = ctx.currentTime;

	///
	for (var n = 0; n < length && messages < 100; n++) {
		var obj = data[n];
		if ((queuedTime += obj[1]) <= currentTime) {
			offset = queuedTime;
			continue;
		}
		///
		currentTime = queuedTime - offset;
		///
		var event = obj[0].event;
		if (event.type !== 'channel') {
			continue;
		}
		///
		//var channelId = event.channel;
    var channelId = 0;
		var channel = MIDI.channels[channelId];
		var delay = ctx.currentTime + ((currentTime + foffset + midi.startDelay) / 1000);
		var queueTime = queuedTime - offset + midi.startDelay;
		switch (event.subtype) {
			case 'controller':
				MIDI.setController(channelId, event.controllerType, event.value, delay);
				break;
			case 'programChange':
				MIDI.programChange(channelId, event.programNumber, delay);
				break;
			case 'pitchBend':
				MIDI.pitchBend(channelId, event.value, delay);
				break;
			case 'noteOn':
				if (channel.mute) break;
				note = event.noteNumber - (midi.MIDIOffset || 0);
				eventQueue.push({
				    event: event,
				    time: queueTime,
				    source: MIDI.noteOn(channelId, event.noteNumber, event.velocity, delay),
				    interval: scheduleTracking(channelId, note, queuedTime + midi.startDelay, offset - foffset, 144, event.velocity)
				});
				messages++;
				break;
			case 'noteOff':
				if (channel.mute) break;
				note = event.noteNumber - (midi.MIDIOffset || 0);
				eventQueue.push({
				    event: event,
				    time: queueTime,
				    source: MIDI.noteOff(channelId, event.noteNumber, delay),
				    interval: scheduleTracking(channelId, note, queuedTime, offset - foffset, 128, 0)
				});
				break;
			default:
				break;
		}
	}
	///
	onsuccess && onsuccess(eventQueue);
};

var stopAudio = function() {
	var ctx = getContext();
	midi.playing = false;
	midi.restart += (ctx.currentTime - startTime) * 1000;
	// stop the audio, and intervals
	while (eventQueue.length) {
		var o = eventQueue.pop();
		window.clearInterval(o.interval);
		if (!o.source) continue; // is not webaudio
		if (typeof(o.source) === 'number') {
			window.clearTimeout(o.source);
		} else { // webaudio
			o.source.disconnect(0);
		}
	}
	// run callback to cancel any notes still playing
	for (var key in noteRegistrar) {
		var o = noteRegistrar[key]
		if (noteRegistrar[key].message === 144 && onMidiEvent) {
			onMidiEvent({
				channel: o.channel,
				note: o.note,
				now: o.now,
				end: o.end,
				message: 128,
				velocity: o.velocity
			});
		}
	}
	noteRegistrar = {};
};

})();
