
 $(document).ready(function() {
    try {
        navigator.requestMIDIAccess().then( 
            function( midi ) {
                setup_canvas(midi)
            }, 
            function onMIDIFailure(msg) {
                console.log(msg)
                $('#no_midi_support').show()
                $('#setup_controls').hide()
                $('#controls_button').prop('disabled', true)
                $('#next_button').prop('disabled', true)
            });
    } catch(e) {
        console.log(e)
        $('#no_midi_support').show()
        $('#setup_controls').hide()
        $('#controls_button').prop('disabled', true)
        $('#next_button').prop('disabled', true)
    }
});


function begin() {
    $("#no_valid_notes").hide()
    if(setup_new_challenge()) {
        $('#setup_controls').slideUp('slow')
        $('#begin_button').hide()
        $('#canvas').fadeIn('slow')
    }
}

var note_is_accidental = [false, true, false, true, false, false, true, false, true, false, true, false]
var note_names_flat = ['c', 'd', 'd', 'e', 'e', 'f', 'g', 'g', 'a', 'a', 'b', 'b']
var note_names_sharp = ['c', 'c', 'd', 'd', 'e', 'f', 'f', 'g', 'g', 'a', 'a', 'b']

function noteNumberToObj(n, name_sharp=true) {
    var n_mod12 = n % 12
    var n_div12 = (n / 12) - 1
    
    return {
        value: n,
        is_treble: n >= 60,
        name: ((name_sharp) ? note_names_sharp[n_mod12] : note_names_flat[n_mod12]) + "/" + n_div12,
        accidental: (note_is_accidental[n_mod12]) ? ((name_sharp) ? '#' : 'b') : null
    }
}

var music_space_total_width = 400
var music_space_total_height = 420

var scale_width = 1, scale_height = 1
var challenge_timer_id = null
var challenge_note = null
var pressed_note_numbers = []
var context = null

function setup_new_challenge() {
    if(challenge_timer_id != null) {
        clearTimeout(challenge_timer_id)
    }
    challenge_note = null
    var challenge_note_value = null
            
    var strategy = $('#note_strategy').val()
    var min_value = parseInt($('#min_note').val())
    var max_value = parseInt($("#max_note").val())
    
    console.log(min_value + " " + max_value)
    
    if(min_value <= max_value) {    
        // Determine the checked notes
        var valid_notes_mod12 = [
            $('#note_c').prop('checked'),
            $('#note_cs').prop('checked'),
            $('#note_d').prop('checked'),
            $('#note_ds').prop('checked'),
            $('#note_e').prop('checked'),
            $('#note_f').prop('checked'),
            $('#note_fs').prop('checked'),
            $('#note_g').prop('checked'),
            $('#note_gs').prop('checked'),
            $('#note_a').prop('checked'),
            $('#note_as').prop('checked'),
            $('#note_b').prop('checked')
        ]
        
        console.log(valid_notes_mod12)
        
        // Create an array with all the notes in our ranage & filter it down to the valid notes.
        var notes_in_range = (
            Array.apply(0, Array(max_value - min_value + 1))
                .map(function(e,i) { return i + min_value })
                .filter(function(e) { return valid_notes_mod12[e % 12] })
            )
            
        if(notes_in_range.length > 0) {
            challenge_note_value = notes_in_range[Math.floor(Math.random() * notes_in_range.length)]
        }
    }
    
    // If no valid note was chosen, it is likely none exists.
    if(challenge_note_value == null) {
        $("#no_valid_notes").show()
        $("#setup_controls").slideDown()
        $('#begin_button').show()
        $('#canvas').fadeOut()
        return false
    }
    
    var new_challenge_note = noteNumberToObj(challenge_note_value)
    new_challenge_note['is_hit'] = false
    
    challenge_note = new_challenge_note
    
    challenge_timer_id = null
    
    redraw()
    return true
}

// Redraw function to redraw the canvas with the given state.
function redraw() {
    context.clear()
    
    var treble_stave = new Vex.Flow.Stave(0, 25 * scale_height, music_space_total_width * scale_width);
    treble_stave.addClef("treble")
    treble_stave.setContext(context).draw()
    treble_stave.setNoteStartX(100)
    
    var bass_stave = new Vex.Flow.Stave(0, 65 * scale_height, music_space_total_width * scale_width);
    bass_stave.addClef("bass")
    bass_stave.setContext(context).draw()
    bass_stave.setNoteStartX(100)

    var treble_note_names = []
    var treble_note_accidentals = []
    var bass_note_names = []
    var bass_note_accidentals = []
    var challenge_is_hit = false
    for(var note of pressed_note_numbers.map(noteNumberToObj)) {      
      if(challenge_note != null && note.value == challenge_note.value) {
          // This note is a hit!
          challenge_note.is_hit = true
          challenge_timer_id = setTimeout(setup_new_challenge, parseInt($('#note_delay').val()))
          continue
      }

      if(note.is_treble) {
          treble_note_names.push(note.name)
          treble_note_accidentals.push(note.accidental)
      } else {
          bass_note_names.push(note.name)
          bass_note_accidentals.push(note.accidental)
      }
    }

    if(treble_note_names.length > 0) {
        // Treble Notes
        var treble_note = new Vex.Flow.StaveNote({clef: "treble", keys: treble_note_names, duration: '4', stem_direction: Vex.Flow.Stem.UP});
        treble_note.setStyle({shadowColor: 'red', fillStyle: 'red', strokeStyle: 'red'});

        treble_note_accidentals.forEach(function(e, i) {
            if(e != null) {
                treble_note.addAccidental(i, new Vex.Flow.Accidental(e))
            }
        })
        
        var treble_voice = new Vex.Flow.Voice({num_beats: 1, beat_value: 4});
        treble_voice.addTickables([treble_note]);
        
        var treble_formatter = new Vex.Flow.Formatter();
        treble_formatter.joinVoices([treble_voice]).formatToStave([treble_voice], treble_stave);
        treble_voice.draw(context, treble_stave);
    }

    if(bass_note_names.length > 0) {
        // Bass Notes
        var bass_note = new Vex.Flow.StaveNote({clef: "bass", keys: bass_note_names, duration: '4', stem_direction: Vex.Flow.Stem.DOWN});
        bass_note.setStyle({shadowColor: 'red', fillStyle: 'red', strokeStyle: 'red'});
        
        bass_note_accidentals.forEach(function(e, i) {
            if(e != null) {
                bass_note.addAccidental(i, new Vex.Flow.Accidental(e))
            }
        })
        
        var bass_voice = new Vex.Flow.Voice({num_beats: 1, beat_value: 4});
        bass_voice.addTickables([bass_note]);

        var bass_formatter = new Vex.Flow.Formatter();
        bass_formatter.joinVoices([bass_voice]).formatToStave([bass_voice], bass_stave);
        bass_voice.draw(context, bass_stave);
    }

    if(challenge_note != null) {
        var challenge_note_obj = null
        if(challenge_note.is_treble) {
            challenge_note_obj = new Vex.Flow.StaveNote({clef: "treble", keys: [challenge_note.name], duration: '4', stem_direction: Vex.Flow.Stem.UP});
        } else {
            challenge_note_obj = new Vex.Flow.StaveNote({clef: "bass", keys: [challenge_note.name], duration: '4', stem_direction: Vex.Flow.Stem.DOWN});
        }
        
        if(challenge_note.accidental != null) {
            challenge_note_obj.addAccidental(0, new Vex.Flow.Accidental(challenge_note.accidental))
        }
        
        if(challenge_note.is_hit) {
            challenge_note_obj.setStyle({shadowColor: 'limegreen', fillStyle: 'limegreen', strokeStyle: 'limegreen'});
        }
        
        var challenge_voice = new Vex.Flow.Voice({num_beats: 1, beat_value: 4});
        challenge_voice.addTickables([challenge_note_obj]);

        var challenge_formatter = new Vex.Flow.Formatter();
        challenge_formatter.joinVoices([challenge_voice]).formatToStave([challenge_voice], (challenge_note.is_treble) ? treble_stave : bass_stave);
        challenge_voice.draw(context, (challenge_note.is_treble) ? treble_stave : bass_stave);
    }
}

function setup_canvas(midi) {
  if(context == null) {    
      var canvas = document.getElementById('canvas')
    
      scale_height = ($(window).height() - 10) / music_space_total_height
      scale_width = ($(window).width() - 10) / music_space_total_width
      
      scale_height = scale_width = Math.min(scale_height, scale_width)
      
      console.log(scale_width + " " + scale_height)
  
      var renderer = new Vex.Flow.Renderer(canvas, Vex.Flow.Renderer.Backends.SVG);
      renderer.resize(music_space_total_width * scale_width, music_space_total_height * scale_height)
      context = renderer.getContext()
      context.scale(scale_height, scale_width)
      
      // Create an empty state of the keyboard at the current time.
      redraw()
      
      // Setup the inputs to manage the state of the pressed_note_numbers array & redraw on each change.
      midi.inputs.forEach( function(entry) {entry.onmidimessage = function(event) {
        var lowest_nibble = event.data[0] & 0xf0
        var note_number = event.data[1]
        if(lowest_nibble == 0x90)
        {
            pressed_note_numbers.push(note_number)
        } else if(lowest_nibble == 0x80) {
            var idx = pressed_note_numbers.indexOf(note_number)
            if(idx != -1) {
                pressed_note_numbers.splice(idx, 1)
            }
        }
        redraw()
      }});
  }
}