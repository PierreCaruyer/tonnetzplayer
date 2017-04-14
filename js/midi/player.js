/*
	----------------------------------------------------------
	MIDI.Player : 0.3.1 : 2015-03-26
	----------------------------------------------------------
	https://github.com/mudcube/MIDI.js
	----------------------------------------------------------
*/

if (typeof MIDI === 'undefined') MIDI = {};
if (typeof MIDI.Player === 'undefined') MIDI.Player = {};

(function() { 'use strict';

var midi = MIDI.Player;
midi.currentTime = 0;
midi.endTime = 0;
midi.restart = 0;
midi.playing = false;
midi.timeWarp = 1;
midi.startDelay = 0;
midi.BPM = 120;
midi.backTrackTime = 500;
midi.timeJumpStep = 125;
var CHANNELS = 17;

midi.start =
midi.resume = function(onsuccess) {
    if (midi.currentTime < -1) {
    	midi.currentTime = -1;
    }
    tonnetz.wipe();
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

midi.setBackTrackTimeStep = function(step) {
  var typeofstep = typeof(step);
  if(typeofstep === 'string')
    midi.timeJumpStep = parseInt(step);
  else if(typeofstep === 'number')
    midi.timeJumpStep = step;
  else
    midi.timeJumpStep = 125;
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

// helpers

midi.loadMidiFile = function(onsuccess, onprogress, onerror) {
	try {
		midi.replayer = new Replayer(MidiFile(midi.currentData), midi.timeWarp, null, midi.BPM);
		midi.data = midi.replayer.getData();
		midi.endTime = getLength();
    var pausePlayButton = document.getElementById('pausePlayStop');
    pausePlayButton.src = "./images/pause.png";
		///
		MIDI.loadPlugin({
// 			instruments: midi.getFileInstruments(),
			onsuccess: onsuccess,
			onprogress: onprogress,
			onerror: onerror
		});
	} catch(event) {
    console.log('error');
		onerror && onerror(event);
	}
};

midi.loadFile = function(file, onsuccess, onprogress, onerror) {
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
					///
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

midi.getFileInstruments = function() {
	var instruments = {};
	var programs = {};
	for (var n = 0; n < midi.data.length; n ++) {
		var event = midi.data[n][0].event;
		if (event.type !== 'channel') {
			continue;
		}
		var channel = event.channel;
		switch(event.subtype) {
			case 'controller':
//				console.log(event.channel, MIDI.defineControl[event.controllerType], event.value);
				break;
			case 'programChange':
				programs[channel] = event.programNumber;
				break;
			case 'noteOn':
				var program = programs[channel];
				var gm = MIDI.GM.byId[isFinite(program) ? program : channel];
				instruments[gm.id] = true;
				break;
		}
	}
	var ret = [];
	for (var key in instruments) {
		ret.push(key);
	}
	return ret;
};

var updateDisplay = function(timeJump) {
  var event = timeLine[currentPos];
  if(jump) {
    tonnetz.wipe();
    
  }
  for(var index = 0; index < event.offTone.length; index++)
    tonnetz.noteOff(event.offTone[index].channel, event.offTone[index].noteNumber);
  for(var n = 0; n < event.tone.length; n++)
    tonnetz.noteOn(event.tone[n].channel, event.tone[n].noteNumber);
};

midi.backTrack = function() {
  midi.backTrackTime = midi.backTrackTime - midi.timeJumpStep;
  midi.pause(true);
  currentPos--;
  updateDisplay(true);
};

midi.lookAhead = function() {
 midi.lookAheadTime = midi.lookAheadTime + midi.timeJumpStep;
 midi.pause(true);
 currentPos++;
 updateDisplay(true);
};

//Playing the audio
var eventQueue = []; // hold events to be triggered
var timeLine = []; //timeline registering a tone each time noteOff or a noteOn event happens
var deletedOnes = [];
var currentPos = 0;
var queuedTime; //
var startTime = 0; // to measure time elapse
var noteRegistrar = {}; // get event for requested note
var onMidiEvent = undefined; // listener
var scheduleTracking = function(channel, note, currentTime, offset, message, velocity, time) {
	return setTimeout(function() {
		var data = {
			channel: channel,
			note: note,
			now: currentTime,
			end: midi.endTime,
			message: message,
			velocity: velocity
		};
		///
		if (message === 128) {
			delete noteRegistrar[note];
      //tonnetz.noteOff(channel, note);
		} else {
			noteRegistrar[note] = data;
      //tonnetz.noteOn(channel, note);
		}
    currentPos++;
    updateDisplay();
		midi.backTrackTime = midi.currentTime = currentTime;
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

var deleteNotesFromTone = function(tone, notes) {
  var newTone = [];
  var n = 0, c = 0;
  var detected = false;
  while(n < tone.length) {
    while(c < notes.length && detected === false) {
      if(tone[n].noteNumber !== notes[c].noteNumber)
        detected = true;
      c++;
    }
    if(detected === false)
      newTone.push(tone[n]);
    detected = false;
    c = 0;
    n++;
  }
  return newTone;
};

var setUpTimeline = function() {
  var currentTone = [];
  var time = 0;
  var timeNote = {};
  var timeOffset = 0;
  var deletedNotes = [];

  for(var c = 0; c < length; c++) {
    timeNote = midi.data[c];
    time += timeNote[1];
    if(timeNote[0].subtype === 'noteOn') {
      timeOffset = 1;
      currentTone.push(timeNote[0]);
      timeNote = midi.data[c + timeOffset];
      while(timeNote[1] === 0 && timeNote[0].subtype === 'noteOn') { // while a "noteOn row" is on
        currentTone.push(timeNote[0]);
        timeOffset++;
        timeNote = data[c + timeOffset];
      }
    }
    else if(timeNote[0].subtype === 'noteOff') {
      while(deletedNotes.length > 0)
        deletedNotes.shift();
      deletedNotes.push(timeNote[0]);
      timeOffset = 1;
      timeNote = midi.data[n + timeOffset];
      while(((n + timeOffset) < length) && (timeNote[1] === 0) && (timeNote[0].subtype === 'noteOff')) { //while we're on a "noteOff row"
        deletedNotes.push(timeNote[0]);
        timeOffset++;
        timeNote = midi.data[c + timeOffset];
      }
      currentTone = deleteNotesFromTone(currentTone, deletedNotes);
    }
    timeLine.push({
      tone: currentTone,
      offTone: deletedNotes,
      time: time
    });
  }
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

  setUpTimeline();

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
		var channelId = event.channel;
		//var channel = MIDI.channels[channelId];
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
	// reset noteRegistrar
	noteRegistrar = {};
};

})();
