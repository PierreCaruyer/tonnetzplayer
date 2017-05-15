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
midi.jumpStep = 1;
midi.onsuccess = null;
midi.onprogress = null;
midi.onfailure = null;
midi.file = '';
var CHANNELS = 17;
midi.socket = null;

midi.start =
midi.resume = function(onsuccess) {
    if (midi.currentTime < -1) {
    	midi.currentTime = -1;
    }
    tonnetz.wipe();
    midi.data = midi.replayer.getData();
    resetTimeline();
    setUpTimeline(midi.data, 0, getContext(), midi.data.length);
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

var parsePositiveInt = function(str) {
  var value = -1;
  if(typeof str === 'string')
    value = parseInt(str);
  else if(typeof str === 'number')
    value = str;
  return value;
};

midi.onbpmchange = function(arg) {
  var beatsPerMin = parsePositiveInt(arg);
  midi.BPM = (beatsPerMin === -1)? 120 : beatsPerMin;
  midi.stop();
  resetTimeline();
  midi.loadFile(midi.file, midi.onsuccess, midi.onprogress, midi.onfailure);
};

var resetTimeline = function() {
  emptyList(timeline);
  currentPos = 0;
};

midi.setBackTrackStep = function(step) {
  var integerStep = parsePositiveInt(step);
  midi.jumpStep = (integerStep === -1)? 1 : integerStep;
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

midi.loadFile = function(file, onsuccess, onprogress, onerror, socket) {
  midi.socket = socket;
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

var updateDisplay = function(skip) {
  currentTone = timeline[currentPos];
  if(skip) {
    tonnetz.wipe();
    for(var n = 0; n < currentTone.tone.length; n++)
      tonnetz.noteOn(currentTone.tone[n].channel, currentTone.tone[n].note, true);
  }
  else {
    for(var n = 0; n < currentTone.tone.length; n++)
      tonnetz.noteOn(currentTone.tone[n].channel, currentTone.tone[n].note);
    for(var index = 0; index < currentTone.offTone.length; index++)
      tonnetz.noteOff(currentTone.offTone[index].channel, currentTone.offTone[index].note);
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
  currentPos++;
  if(currentPos >= 0 && currentPos < timeline.length)
    updateDisplay();
};

//Playing the audio
var eventQueue = []; // hold events to be triggered
var timeline = []; //timeline registering a tone each time noteOff or a noteOn event happens
var currentTone = [];
var currentTone = [];
var array = [];
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
		if (message === 128)
			delete noteRegistrar[note];
		else
			noteRegistrar[note] = data;

    console.log(currentPos);
    if(currentPos === 86)
      console.log(JSON.stringify(timeline[currentPos], undefined, 2));
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
    else
      eventQueue.shift();
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

var setUpTimeline = function(data, offset, ctx, length) {
  if (!midi.replayer) return;
	var currentTime = midi.restart;
  var foffset = currentTime - midi.currentTime;
	var note;
	queuedTime = 0.5;
  for(var n = 0; n < length; n++) {
    timeline.push({
      tone: [],
      offTone: [],
      time: 0
    });
  }
	for (var n = 0; n < length; n++) {
		var obj = data[n];
		if ((queuedTime += obj[1]) <= currentTime) {
			offset = queuedTime;
			continue;
		}

		var event = obj[0].event;
		if (event.type !== 'channel')
			continue;

		var channelId = event.channel;
		if (event.subtype === 'noteOn') {
      note = event.noteNumber - (midi.MIDIOffset || 0);
      array.push({
        subtype: 'noteOn',
    		channel: channelId,
    		note: note,
    	});
      for(var a = 0; a < array.length; a++)
        timeline[n].tone.push(array[a]);
      timeline[n].time = queuedTime + midi.startDelay;
    } else if(event.subtype === 'noteOff') {
      var offNotes = array.shift();
      for(var a = 0; a < array.length; a++) {
        array[a].subtype = 'noteOn';
        timeline[n].tone.push(array[a]);
      }
      timeline[n].offTone.push(offNotes);
      timeline[n].time = queuedTime + midi.startDelay;
		}
	}

  while(timeline[0].tone.length === 0 && timeline[0].offTone.length === 0) {
    timeline.shift();
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

	var note;
	var offset = 0;
	var messages = 0;
	var data = midi.data;
	var ctx = getContext();
	var length = data.length;

	queuedTime = 0.5;

	var interval = eventQueue[0] && eventQueue[0].interval || 0;
	var foffset = currentTime - midi.currentTime;

	if (MIDI.api !== 'webaudio') { // set currentTime on ctx
		var now = getNow();
		__now = __now || now;
		ctx.currentTime = (now - __now) / 1000;
	}
	startTime = ctx.currentTime;
	for (var n = 0; n < length; n++) {
		var obj = data[n];
		if ((queuedTime += obj[1]) <= currentTime) {
			offset = queuedTime;
			continue;
		}
		currentTime = queuedTime - offset;
		var event = obj[0].event;
		if (event.type !== 'channel') {
			continue;
		}
		var channelId = event.channel;
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
	// reset noteRegistrar
	noteRegistrar = {};
};

})();
