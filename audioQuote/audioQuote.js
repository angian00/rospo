#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
var child_process = require('child_process');

var sleep = require('sleep').sleep;
var sprintf = require("sprintf-js").sprintf;
var ffmpeg = require('fluent-ffmpeg');

var METADATA_FILE = "metadata.json";

main();



function main() {
	parseCmdLine();
}


function parseCmdLine() {
	var cmdArgs = require('minimist')(process.argv.slice(2), 
			{ 	'default': { 'cmd': 'missingCommand'}, 
				'alias': { 'c': 'cmd'},
				//'unknown': function(argName) { console.warn("Unknown option: " + argName); return false; } 
			});

	fullAudioDir = process.cwd() + "/full_works";

	//console.dir(cmdArgs);
	var lastArg = null;
	if (cmdArgs._.length > 0)
		lastArg = cmdArgs._[0];

	if (cmdArgs.cmd === "download") {
		downloadAll(lastArg);

	} else if (cmdArgs.cmd === "analyze") {
		if (lastArg == null) {
			lastArg = getFirstSubDir(fullAudioDir);
			console.warn("Directory not specified, using " + lastArg);
		}

		analyzeDir(lastArg);

	} else if (cmdArgs.cmd === "extract") {
		if (lastArg == null) {
			lastArg = getFirstSubDir(fullAudioDir);
			console.warn("Directory not specified, using " + lastArg);
		}

		extractRandomFragments(lastArg);

	//---  undocumented commands
	} else if (cmdArgs.cmd === "test-playback") {
		randomPlayback(15);

	//---  failed commands
	} else if (cmdArgs.cmd === "missingCommand") {
		console.error("Missing command");
		printHelp();

	} else {
		console.error("Unknown command: " + cmdArgs.cmd);
		printHelp();
	}
}

function printHelp() {
	console.info(" Usage:");
	console.info("\t " + process.argv[0] + " " + process.argv[1] + " -c <command> ...");
	console.info(" where <command> = [ download | analyze | extract ]");
}

function downloadAll(baseUrl) {
	console.warn("Automatic download is currently not supported");
}


var nMetadataFiles = 0;
var metadataRecords = [];
function analyzeDir(rootDir) {
	console.log("analyzing dir [" + rootDir + "]");
	fs.readdir(rootDir, function (err, filenames) { 
		if (err)
	  		throw err;

		filenames.forEach(function(filename) {
			if (endsWith(filename, ".mp3")) {
				nMetadataFiles ++;
				analyzeMetadataFfmpeg(rootDir + "/" + filename, function () {
					var outfile = fs.createWriteStream(rootDir + "/" + METADATA_FILE);

					//sort keys
					var sortedKeys = [];
					for (filename in metadataRecords) {
						sortedKeys.push(filename);
					}
					sortedKeys.sort();

					for (var i in sortedKeys) {
						filename = sortedKeys[i];
						//console.info("filename: "+filename);
						outfile.write(JSON.stringify(metadataRecords[filename]) + "\n");
					}
					outfile.end();
					console.info("Written metadata file");
				});
			}
		});
	});
}

/*function analyzeMetadataMM(filename) {
	//console.log("analyzeMetadata " + filename);

	mm(fs.createReadStream(filename), function (err, metadata) {
		if (err)
		  	throw err;

		var justFilename = path.basename(filename);

		console.log("filename: " + justFilename + ", artist: " + metadata.artist + ", album: " + metadata.album + ", title: " + metadata.title);
	});
}
*/
function analyzeMetadataFfmpeg(filename, finalCallback) {
	//console.log("analyzeMetadataFfmpeg " + filename);

	//command line: ffmpeg -i
	ffmpeg.ffprobe(filename, function(err, metadata) {
		if (err)
		  	throw err;

		var record = {};
		record.artist =  metadata.format.tags.artist;
		record.album =  metadata.format.tags.album;
		record.title =  metadata.format.tags.title;
		record.duration =  metadata.format.duration;

		var justFilename = path.basename(filename);
		record.filename = justFilename;
		metadataRecords[justFilename] = record;

		process.stdout.write(".");
		if (isAnalyzeMetadataComplete()) {
			process.stdout.write("\n");
			finalCallback();
		}
	});
}

function isAnalyzeMetadataComplete() {
	return ( nMetadataFiles == Object.keys(metadataRecords).length );
}


/**
 * fragmentRate: generate a fragment every fragmentRate seconds of total duration.
 */
function extractRandomFragments(rootDir, fragmentRate, fragmentSize) {
	fragmentRate = (typeof fragmentRate !== 'undefined' ? fragmentRate : 3600);
	fragmentSize = (typeof fragmentSize !== 'undefined' ? fragmentSize : 15);

	parseMetadataFile(rootDir);

	//compute totDuration
	var totDuration = 0; //in secs
	for (i in metadataRecords) {
		metadataRecord = metadataRecords[i];
		totDuration += metadataRecord.duration;
	}

	//compute fragment position
	var MAX_FRAGMENT_TRIES = 10;
	var nFragments = Math.floor(totDuration / fragmentRate);
	console.info("nFragments: " + nFragments);
	for (var iFragment=0; iFragment < nFragments; iFragment++) {
		var nTries = 0;
		do {
			startPosition = Math.random() * totDuration;
			endPosition = startPosition + fragmentSize;
			res = findItem(metadataRecords, "duration", startPosition);
			startIndex = res[0];
			relStartPosition = res[1];
			res = findItem(metadataRecords, "duration", endPosition);
			endIndex = res[0];
			relEndPosition = res[1];

			//console.log("nTries: " + nTries + ", startIndex: " + startIndex + ", endIndex: " + endIndex);

			ok = (startIndex == endIndex);
			nTries ++;

		} while ((!ok) && (nTries < MAX_FRAGMENT_TRIES));

		if (!ok)
			throw "Could not extract fragment from [" + rootDir 
				+ "], try with smaller fragment size (current: " + fragmentSize + ")";

		var inputFilePath = rootDir + "/" + metadataRecords[startIndex].filename;
		var outputFilePath = rootDir + "/fragment_" + iFragment + ".mp3";
		createFragment(inputFilePath, outputFilePath, metadataRecords[startIndex], relStartPosition, fragmentSize);
		console.info("created fragment #" + iFragment);
	}
}

function parseMetadataFile(dirname) {
	var metadataFilePath = dirname + "/" + METADATA_FILE;

	metadataRecords = [];
	var lines = fs.readFileSync(metadataFilePath).toString().split("\n");
	for (i in lines) {
		line = lines[i].trim();
		if (line !== "")
			metadataRecords.push(JSON.parse(line));
	}
}


function createFragment(inputPath, outputPath, metadata, relStartPosition, size) {
	console.log("createFragment [" + outputPath + "] : \"" + metadata.title + "\" from " + secs2str(relStartPosition) + " for " + secs2str(size) + "");
	//cmd line: ffmpeg -ss x -t 30 -i file.mp3 fragment.mp3
	ffmpeg(inputPath).setStartTime(relStartPosition).setDuration(size).save(outputPath);

}


function randomPlayback(avgSleep, deltaSleep) {
	avgSleep = (typeof avgSleep !== 'undefined' ? avgSleep : 3*3600); //in secs
	deltaSleep = (typeof deltaSleep !== 'undefined' ? deltaSleep : (avgSleep/2) );

	while (true) {
		//randomize sleep
		var sleepTime = Math.floor(Math.random() * deltaSleep + avgSleep - (deltaSleep/2));
//		var sleepTime = 5;
		console.info("Sleeping for [" + sleepTime + "] seconds");
		sleep(sleepTime);

		//cmd line: cvlc xyz.mp3
		filename = "fart-01.mp3";
		console.info("Now playing [" + filename + "]");
		child_process.exec("cvlc " + path.dirname(process.argv[1]) + "/" + filename, function(error, stdout, stderr) {
			console.log(stdout);
		});
		console.info("File playing");
	}
}

//-----------------------------
// Utility functions
//-----------------------------

function getFirstSubDir(rootDir) {
	var filenames = fs.readdirSync(rootDir);
	for (i=0; i < filenames.length; i ++) {
		var filename = filenames[i];

		var fullPath = rootDir + "/" + filename;
		var fstat = fs.statSync(fullPath);
		if (fstat.isDirectory())
			return fullPath;
	}

	return null;
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}


function findItem(records, fieldName, absPos) {
	var currTot = 0;
	for (i in records) {
		currRecord = records[i];
		nextTot = currTot + currRecord[fieldName];

		if (absPos < nextTot)
			return [i, absPos - currTot];

		currTot = nextTot;
	}

 }


 function secs2str(secs) {
 	var MM = Math.floor(secs / 60);
 	secs = secs % 60;
 	var HH = Math.floor(MM / 60);
 	MM = MM % 60;

 	var format = "";
 	if (HH > 0) {
 		return sprintf("%dh%02d\'%06.3f\"", HH, MM, secs); 
 	} else if (MM > 0)  {
 		return sprintf("%d\'%06.3f\"", MM, secs); 
 	} else
 		return sprintf("%6.3f\"", secs); 
 }

