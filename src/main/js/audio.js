var audio = (function() {
  "use strict";

  var Note = function(ctx, type, frequency, attack, release, output) {
    this.oscillator = ctx.createOscillator();
    this.oscillator.type = type;
    this.oscillator.frequency.value = frequency;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;

    this.oscillator.connect(this.gain);
    this.gain.connect(output);

    this.ctx = ctx;
    this.attack = attack;
    this.release = release;
  };

  Note.prototype.start = function() {
    this.oscillator.start();
    this.gain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + this.attack);
  };

  Note.prototype.stop = function() {
    this.gain.gain.setValueAtTime(this.gain.gain.value, this.ctx.currentTime);
    this.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + this.release);
    var self = this;
    setTimeout(function() {
      self.gain.disconnect();
      self.oscillator.stop();
      self.oscillator.disconnect();
    }, Math.floor(this.release * 1000));
  };


  var module = {};

  var audioCtx, notes, gain;
  var enabled = false;
  var synthType;

  var CHANNELS = 17;
  var ATTACK = 0.05;
  var RELEASE = 0.1;


  module.init = function() {
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
      gain = audioCtx.createGain();
      gain.connect(audioCtx.destination);
    } else {
      // display an alert
    }

    notes = $.map(Array(CHANNELS), function() { return {}; });

    $('#sound-on').click(function() {
      enabled = !enabled;
      $(this).next('i').add('nav a[href="#sound"] i.fa')
        .toggleClass('fa-volume-off fa-volume-up');
    });

    $('#synth-type').change(function() {
      synthType = $(this).val();
    }).change();

    $('#gain').on('input change propertychange paste', function() {
      gain.gain.value = Math.min(1, Math.max(Number($(this).val()), 0));
    }).change();
  };

	/*module.noteOn = function(channel, note, velocity, delay) {
		output.send([0x90 + channel, note, velocity], delay * 1000);
	};

	module.noteOff = function(channel, note, delay) {
		output.send([0x80 + channel, note, 0], delay * 1000);
	};*/

  /*module.noteOn = function(channel, pitch) {
    if (!audioCtx || !enabled) return;

    if (!(pitch in notes[channel])) {
      notes[channel][pitch] =
        new Note(audioCtx, synthType, pitchToFrequency(pitch),
                 ATTACK, RELEASE, gain);
      notes[channel][pitch].start();
    }
  };

  module.noteOff = function(channel, pitch) {
    if (!audioCtx) return;

    if (pitch in notes[channel]) {
      notes[channel][pitch].stop();
      delete notes[channel][pitch];
    }
  };*/

	module.noteOn = function(channelId, noteId, velocity, delay) {
			delay = delay || 0;

			/// check whether the note exists
			var channel = root.channels[channelId];
			var instrument = channel.instrument;
			var bufferId = instrument + '' + noteId;
			var buffer = audioBuffers[bufferId];
			if (!buffer) {
// 				console.log(MIDI.GM.byId[instrument].id, instrument, channelId);
				return;
			}

			/// convert relative delay to absolute delay
			if (delay < ctx.currentTime) {
				delay += ctx.currentTime;
			}
		
			/// create audio buffer
			if (useStreamingBuffer) {
				var source = ctx.createMediaElementSource(buffer);
			} else { // XMLHTTP buffer
				var source = ctx.createBufferSource();
				source.buffer = buffer;
			}

			/// add effects to buffer
			if (effects) {
				var chain = source;
				for (var key in effects) {
					chain.connect(effects[key].input);
					chain = effects[key];
				}
			}

			/// add gain + pitchShift
			var gain = (velocity / 127) * (masterVolume / 127) * 2 - 1;
			source.connect(ctx.destination);
			source.playbackRate.value = 1; // pitch shift 
			source.gainNode = ctx.createGain(); // gain
			source.gainNode.connect(ctx.destination);
			source.gainNode.gain.value = Math.min(1.0, Math.max(-1.0, gain));
			source.connect(source.gainNode);
			///
			if (useStreamingBuffer) {
				if (delay) {
					return setTimeout(function() {
						buffer.currentTime = 0;
						buffer.play()
					}, delay * 1000);
				} else {
					buffer.currentTime = 0;
					buffer.play()
				}
			} else {
				source.start(delay || 0);
			}
			///
			sources[channelId + '' + noteId] = source;
			///
			return source;
		};

		module.noteOff = function(channelId, noteId, delay) {
			embededAudio.noteOff(channelId, noteId, delay);

			/// check whether the note exists
			var channel = root.channels[channelId];
			var instrument = channel.instrument;
			var bufferId = instrument + '' + noteId;
			var buffer = audioBuffers[bufferId];
			if (buffer) {
				if (delay < ctx.currentTime) {
					delay += ctx.currentTime;
				}
				///
				var source = sources[channelId + '' + noteId];
				if (source) {
					if (source.gainNode) {
						// @Miranet: 'the values of 0.2 and 0.3 could of course be used as 
						// a 'release' parameter for ADSR like time settings.'
						// add { 'metadata': { release: 0.3 } } to soundfont files
						var gain = source.gainNode.gain;
						gain.linearRampToValueAtTime(gain.value, delay);
						gain.linearRampToValueAtTime(-1.0, delay + 0.3);
					}
					///
					if (useStreamingBuffer) {
						if (delay) {
							setTimeout(function() {
								buffer.pause();
							}, delay * 1000);
						} else {
							buffer.pause();
						}
					} else {
						if (source.noteOff) {
							source.noteOff(delay + 0.5);
						} else {
							source.stop(delay + 0.5);
						}
					}
					///
					delete sources[channelId + '' + noteId];
					///
					return source;
				}
			}
		};

  module.allNotesOff = function(channel) {
    for (var i=0; i<CHANNELS; i++) {
      for (var pitch in notes[channel]) {
        module.noteOff(channel, pitch);
      }
    }
  };

  var pitchToFrequency = function(pitch) {
    return Math.pow(2, (pitch - 69)/12) * 440;
  };

  return module;
})();
