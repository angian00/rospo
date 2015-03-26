#!/usr/bin/env node

"use strict";

var path = require("path");
var fs = require("fs");
var child_process = require('child_process');


//map subsystem names to cmd lines to be pgrepped
var subsystems = { audioQuote: "audioQuote.js -c playback"};
var allStatus = {};


main();


function main() {
	for (var subsystem in subsystems) {
		var cmdLine = subsystems[subsystem];

		var arg = "pgrep --count -fla \"" + cmdLine + "\"";
		//console.log(arg);
		child_process.exec(arg, function(err, data, stderr) {
			if (err)
			  	throw err;

			var nProc =  parseInt(data);

		    var status = null;
		    if (nProc == 1 || nProc == 0) {
		        status = "ko";
		    } else {
		        status = "ok";
		    }

		    allStatus[subsystem] = {
		    	"subsystem": subsystem, 
		    	"status": status, 
		    	"timestamp": Date.now(),
		    };

		    if (Object.keys(allStatus).length == Object.keys(subsystems).length) {
		    	//we are finished
		    	writeJson();
		    }
		}, { encoding: 'utf8' });

	}
}


function writeJson() {
	var jsonPath = path.dirname(process.argv[1]) + "/../web/status.json";
	var outfile = fs.createWriteStream(jsonPath);

	outfile.write(JSON.stringify(allStatus));
	outfile.write("\n");
	outfile.end();
	console.info("Written file: " + jsonPath);
}
