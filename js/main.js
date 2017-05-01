var canvas, ctx, noteLabels, triadLabels;

if (typeof MIDI === 'undefined') MIDI = {};
if (typeof MIDI.Player === 'undefined') MIDI.Player = {};

$(function(){
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");
  noteLabels = document.getElementById("note-labels");
  triadLabels = document.getElementById("triad-labels");
  $(triadLabels).hide();

  storage.init();
  colorscheme.init('default');
  audio.init();
  tonnetz.init();
  midi.init();
  keyboard.init('piano');

  $('#tonnetz').mousewheel(function(event) {
    tonnetz.setDensity(tonnetz.density - event.deltaY);
    return false;
  });

  var pausePlayStop = function() {
    var pausePlayButton = document.getElementById('pausePlayStop');
		if (MIDI.Player.playing) {
      pausePlayButton.src = "../images/play.png";
			MIDI.Player.pause(true);
    }
		else {
      pausePlayButton.src = "../images/pause.png";
      tonnetz.wipe();
			MIDI.Player.resume();
    }
	};

  $(window).keypress(function(event) {
    if (somethingHasFocus()) return;

    var c = String.fromCharCode(event.which);
    if (c == '+') {
      tonnetz.setDensity(tonnetz.density - 2);
    } else if (c == '-') {
      tonnetz.setDensity(tonnetz.density + 2);
    }

    if(event.which === 8) // backspace pressed
      MIDI.Player.stepBack();
    else if(event.which === 32) // space pressed
      pausePlayStop();
    else if(event.which === 16) // enter pressed
      MIDI.Player.stepForward();
  });

  document.querySelector('#file').addEventListener('change', function(e){
		try {
			var files = e.target.files;
			if(files.length > 0)
			   MIDI.Player.loadFile(files[0].name, MIDI.Player.start);
		} catch (e) {
			console.log(e);
		} finally {

		}
	});

  $('#navbar a[data-toggle="tab"]').on('shown.bs.tab', function() {
    if ($(this).attr('href') != "#")
      $('#tabs').collapse('show');
      collapseNav();
  });

  $('#navbar a[data-toggle="tab"]').click(function() {
    if ($(this).parent().hasClass('active')) {
      $('#tabs').collapse('hide');
    }
  });

  $('.tab-link').click(function(event) {
    event.preventDefault();
    var href = $(this).attr('href');
    $('#navbar a[data-toggle="tab"][href="' + href + '"]').tab('show');
  });

  $('#tabs').on('hidden.bs.collapse', noTab);
  $('#tonnetz').click(collapseNavAndTabs);
  $('.navbar-brand').click(function(event) {
    event.preventDefault();
    collapseNavAndTabs();
  });

  $('#panic').click(function() { tonnetz.panic(); });
  $('#enable-sustain').click(function() { tonnetz.toggleSustainEnabled(); });
  $('#show-note-names').click(function() { $(noteLabels).toggle(); });
  $('#show-triad-names').click(function() { $(triadLabels).toggle(); });
  $('#backtrack-step').on('input change propertychange paste', function() {
    MIDI.Player.setBackTrackStep($(this).val());
  });
  $('#ghost-duration').on('input change propertychange paste', function() {
    if(!tonnetz.setGhostDuration($(this).val())) {
      $(this).closest('.form-group').addClass('has-error');
    } else {
      $(this).closest('.form-group').removeClass('has-error');
    }
  });
  $('input[type=radio][name=layout]').change(function() {
    tonnetz.setLayout($(this).val());
  });
  $('input[type=radio][name=kbd-layout]').change(function() {
    keyboard.layout = $(this).val();
    tonnetz.panic();
  });

  $('[data-toggle="tooltip"]').tooltip();

  // Open links with data-popup="true" in a new window.
  $('body').on('click', 'a[data-popup]', function(event) {
    window.open($(this)[0].href);
    event.preventDefault();
  });

  // Generate mailto: link
  $('a[href="mailto:"]').attr('href', (function() {
    var addr = '';
    var i = 0;
    do {
      addr += 'oafcn@kodcamri.'[i%15];
    } while ((i += 4) < 60);
    return 'mailto:' + addr;
  })());
});

function collapseNav() {
  if($('.navbar-toggle').is(':visible') && $('.navbar-collapse').hasClass('in')) {
    $('.navbar-toggle').click();
  }
}

function collapseNavAndTabs() {
  $('#tabs').collapse('hide');
  collapseNav();
}

function noTab() {
  $('#dummy-tab').tab('show');
}

function somethingHasFocus() {
  return $(':focus').is('input, select, button, textarea');
}

function showAlert(text, type) {
  var a = $('<div class="alert alert-'+type+' alert-dismissible fade" role="alert">' +
           '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
           '<span aria-hidden="true">×</span></button></div>');
  a.append(document.createTextNode(text));
  $('#messages').append(a);
  a.addClass('in');

  var numMessages = $('#messages').children().length;
  if (numMessages > 3) {
    $('#messages').children().slice(0, numMessages-3).alert('close');
  }
}

function showWarning(text) { showAlert(text, 'warning'); }
function showError(text) { showAlert(text, 'danger'); }
function showSuccess(text) { showAlert(text, 'success'); }
