var N = 1;

var box_A = { width : 128*5, height : 128*4, rows : 32, cols : 40, offset_x : 20, offset_y : 11 };
var box_stack = { width : 16, height : 16, rows : 1, cols : 1, offset_x : 530, offset_y : 11 };
var box_vector = { width : 72, height : 16, rows : 1, cols : 4, offset_x : 530, offset_y : 11 };
var box_O = { width : 128, height : 128, rows : 8, cols : 8, offset_x : 800, offset_y : 11 };

// We're going to assume we're computing
var empty_progress = { pass : 0, bx : 0, by : 0, x : 0, y : 0, step : 0, last_timestamp : 0 };
var progresses = [];
for (var i = 0; i < N; i++) {
    progresses.push($.extend({}, empty_progress));
}
var flip = 0;
var index = 0;
var fresh_kick = 0;
var timeout_id = -1;

var zigzag = [0, 14, 13, 12, 11, 10, 9, 8,
              7, 63, 62, 58, 57, 49, 48, 36,
              6, 61, 59, 56, 50, 47, 37, 35,
              5, 60, 55, 51, 46, 38, 34, 25,
              4, 54, 52, 45, 39, 33, 26, 24,
              3, 53, 44, 40, 32, 27, 23, 18,
              2, 43, 41, 31, 28, 22, 19, 17,
              1, 42, 30, 29, 21, 20, 16, 15];

function start() {
    for (var i = 0; i < N; i++) {
	var c_old = document.getElementById("canvas" + i + "0");
	//	c_old.style.height = "100";
	var c_new = document.getElementById("canvas" + i + "0");
	//c_new.style.height = "100";
    }
    animate(0);
    kick();
}

function animate(new_index) {
    index = new_index;
    progresses = [];
    for (var i = 0; i < N; i++) {
	progresses.push($.extend({}, empty_progress));
    }
    fresh_kick = 1;
}

function draw_box(ctx, box, offset_x, offset_y) {
    ctx.lineWidth="1";
    var width_per_col = box.width / box.cols;
    var height_per_row = box.height / box.rows;
    for (var i = 0; i <= box.rows; i++) {
        if (Math.floor(i / 8) * 8 == i) {
            ctx.lineWidth="4";
        } else {
            ctx.lineWidth="1";
        }
	ctx.beginPath();
	ctx.moveTo(box.offset_x, box.offset_y + height_per_row * i);
	ctx.lineTo(box.offset_x + box.width, box.offset_y + height_per_row * i);
	ctx.stroke();
    }
    for (var i = 0; i <= box.cols; i++) {
        if (Math.floor(i / 8) * 8 == i) {
            ctx.lineWidth="4";
        } else {
            ctx.lineWidth="1";
        }
	ctx.beginPath();
	ctx.moveTo(box.offset_x + width_per_col * i, box.offset_y);
	ctx.lineTo(box.offset_x + width_per_col * i, box.offset_y + box.height);
	ctx.stroke();
    }
    return;
}

function draw_cell(ctx, box, row, col, extent) {
    if (extent == undefined) {
	extent = 1;
    }
    ctx.beginPath();
    var width_per_col = box.width / box.cols;
    var height_per_row = box.height / box.rows;
    ctx.rect(box.offset_x + width_per_col * col,
	     box.offset_y + height_per_row * row,
	     width_per_col * extent, height_per_row * extent);
    ctx.fill();
}

var commands_map = [[["read", box_A ]]];

function render(canvas, progress, commands, xstep) {
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw_box(ctx, box_A);
    if (xstep == 0) { return; }
    var color_read = "red";
    var color_write = "blue";

    commands_pass = commands[progress.pass];
    for (var l = 0; l < commands_pass.length; l+=2) {
	for (var i = 0; i < commands_pass[l+1].rows; i++) {
            var bi = Math.floor(i / 8);
	    for (var j = 0; j < commands_pass[l+1].cols; j++) {
                var bj = Math.floor(j / 8);
                var ri = i - bi * 8;
                var rj = j - bj * 8;

                if (bi == progress.by && bj == progress.bx) {
                    var index = 63 - (progress.y * 8 + progress.x);
                    if (zigzag[ri * 8 + rj] == index) {
                        ctx.fillStyle = "#ff2222";
                        draw_cell(ctx, commands_pass[l+1], i, j);
                    } else if (zigzag[ri * 8 + rj] > index) {
                        ctx.fillStyle = "#aaffaa";
                        draw_cell(ctx, commands_pass[l+1], i, j);
                    }
                } else if (((bi == progress.by - 1 && bj >= progress.bx - 1 && bj <= progress.bx + 1) ||
                           (bi == progress.by && bj == progress.bx - 1)) && ri == 0 && rj == 0) {
		    ctx.fillStyle = "#aaffaa";
		    draw_cell(ctx, commands_pass[l+1], i, j, 8);
                } else if ((bi < progress.by || bi == progress.by && bj < progress.bx) && ri == 0 && rj == 0) {
		    ctx.fillStyle = "#ffffcc";
		    draw_cell(ctx, commands_pass[l+1], i, j, 8);
                }
	    }
            if (bi > progress.by) {
                break;
            }
	}
    }
    return 0;
}

function kick(timestamp) {
    var cost = 1000;
    var reset_everyone = 0;
    for (var i = 0; i < N; i++) {
	if (fresh_kick == 0 && i != index && index != -1) {
	    continue;
	}
	var c_old = document.getElementById("canvas" + i + flip);
	if (!c_old) {
	    continue;
	}
	var c_new = document.getElementById("canvas" + i + (1 - flip));
	var prog = progresses[i];
	if (i == index || index == -1) {
	    var xstep = 1;
	    if (i >= 2) { xstep = 4; }
	    cost = render(c_new, prog, commands_map[i], xstep);
	    var old_prog = $.extend({}, prog);
	    if (i >= 2) { cost *= 1.4; }
	    if (i == 4) cost *= 2;
	    if (prog.last_timestamp + cost < timestamp) {
		prog.step += 1;
		prog.last_timestamp = timestamp;
		if (prog.step * 2 + 1 >= commands_map[i][prog.pass].length) {
		    prog.step = 0;
		    prog.x += xstep;
		    if (prog.x == 8) {
			prog.x = 0;
			prog.y += 1;
			if (prog.y == 8) {
			    prog.y = 0;
                            prog.bx += 1;
                            if (prog.bx == box_A.cols / 8) {
                                prog.bx = 0;
                                prog.by += 1;
                                if (prog.by == box_A.rows / 8) {
                                    prog.by = 0;
                                    reset_everyone = 1;
                                    prog.pass = 0;
				}
			    }
			}
		    }
		}
	    }
	} else {
	    render(c_new, prog, commands_map[i], 0);
	}
	c_old.style.visibility = 'hidden';
	c_new.style.visibility = 'visible';
    }
    if (reset_everyone == 1) {
	animate(index);
    }
    flip = 1 - flip;
    if (timeout_id >= 0) { clearTimeout(timeout_id); }
    timeout_id = setTimeout(function() { requestAnimationFrame(kick); }, 16);
}

$(function() { 
	$( "#slider" ).slider({
		range: "min",
		    value: 50,
		    min: 0,
		    max: 100,
		    slide: function( event, ui ) {		    		    
		}
	    });
	//var value = $( "#slider" ).slider( "value" );
    });
    