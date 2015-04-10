#!/usr/bin/env node

"use strict";

var path = require("path");
var fs = require("fs");
var child_process = require('child_process');

var sleep = require('sleep').sleep;
var sprintf = require("sprintf-js").sprintf;
var ffmpeg = require('fluent-ffmpeg');


var METADATA_FILE = "metadata.json";
var	prjDir = path.dirname(process.argv[1]);
var	rootFullDir = prjDir + "/full_works";
var	rootFragmentDir = prjDir + "/fragments";


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

	//console.dir(cmdArgs);
	var lastArg = null;
	if (cmdArgs._.length > 0)
		lastArg = cmdArgs._[0];

	if (cmdArgs.cmd === "download") {
		downloadAll(lastArg);

	} else if (cmdArgs.cmd === "analyze") {
		if (lastArg == null) {
			analyzeAll(false);
			//console.warn("Directory not specified, defaulting to all");
		} else
			analyzeDir(lastArg);

	} else if (cmdArgs.cmd === "extract") {
		if (lastArg == null) {
			extractAll(true);
			//console.warn("Directory not specified, defaulting to all");
		} else
			extractDir(lastArg);

	} else if (cmdArgs.cmd === "playback") {
		randomPlayback(60*60*4);

	} else if (cmdArgs.cmd === "fart") {
		randomPlayback(60*60*1, null, null, prjDir + "/farts");


	//---  undocumented commands
	} else if (cmdArgs.cmd === "test-playback") {
		randomPlayback(30);

	} else if (cmdArgs.cmd === "test-random") {
		randomPlayback(null, null, true);


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
	console.info(" where <command> = [ download | analyze | extract | playback | fart ]");
}

function downloadAll(baseUrl) {
	console.warn("Automatic download is currently not supported");
}

function analyzeAll(force) {
	fs.readdirSync(rootFullDir).forEach(function(dirname, index) {
		var subdir = rootFullDir + "/" + dirname;
		var dstat = fs.statSync(subdir);
		if (dstat.isDirectory() && (!isMetadataCurrent(subdir) || force))
			analyzeDir(subdir);
	});
}

function analyzeDir(inputDir) {
	var nMetadataFiles = 0;
	var metadataRecords = [];

	function analyzeMetadataFfmpeg(filename, finalCallback) {
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


	console.log("analyzing dir [" + inputDir + "]");
	fs.readdir(inputDir, function (err, filenames) { 
		if (err)
	  		throw err;

		filenames.forEach(function(filename) {
			if (endsWith(filename, ".mp3")) {
				nMetadataFiles ++;
				analyzeMetadataFfmpeg(inputDir + "/" + filename, function () {
					var outfile = fs.createWriteStream(inputDir + "/" + METADATA_FILE);

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
					console.info("written metadata file");
				});

				console.info("analyzing file " + filename);
			}
		});
	});
}

function extractAll(force) {
	fs.readdirSync(rootFullDir).forEach(function(dirname, index) {
		var inputDir = rootFullDir + "/" + dirname;
		if (!fs.statSync(inputDir).isDirectory())
			return;

		var targetDir = rootFragmentDir + "/" + dirname;
		if ((!fs.existsSync(targetDir)) || (!isMetadataCurrent(targetDir)) || force)
			extractDir(inputDir);
	});
}

/**
 * fragmentRate: generate a fragment every fragmentRate seconds of total duration.
 */
function extractDir(inputDir, fragmentRate, fragmentSize) {
	fragmentRate = (typeof fragmentRate !== 'undefined' ? fragmentRate : 3600);
	fragmentSize = (typeof fragmentSize !== 'undefined' ? fragmentSize : 15);

	if (!isMetadataCurrent(inputDir)) {
		analyzeDir(inputDir);
	}

	var inputMetadata = parseMetadataFile(inputDir);

	//compute totDuration
	var totDuration = 0; //in secs
	for (var i in inputMetadata) {
		totDuration += inputMetadata[i].duration;
	}

	var outputDir = rootFragmentDir + "/" + path.basename(inputDir);
	resetDir(outputDir);
	var outputMetadata = [];

	//compute fragment position
	var MAX_FRAGMENT_TRIES = 10;
	var relStartPosition = null;
	var nFragments = Math.floor(totDuration / fragmentRate);
	console.info("nFragments: " + nFragments);
	for (var iFragment=0; iFragment < nFragments; iFragment++) {
		var nTries = 0;
		do {
			var startPosition = Math.random() * totDuration;
			var endPosition = startPosition + fragmentSize;
			var res = findItem(inputMetadata, "duration", startPosition);
			var startIndex = res[0];
			relStartPosition = res[1];
			res = findItem(inputMetadata, "duration", endPosition);
			var endIndex = res[0];
			var relEndPosition = res[1];

			//console.log("nTries: " + nTries + ", startIndex: " + startIndex + ", endIndex: " + endIndex);

			var ok = (startIndex == endIndex);
			nTries ++;

		} while ((!ok) && (nTries < MAX_FRAGMENT_TRIES));

		if (!ok)
			throw "Could not extract fragment from [" + inputDir 
				+ "], try with smaller fragment size (current: " + fragmentSize + ")";

		var inputFilePath = inputDir + "/" + inputMetadata[startIndex].filename;
		var outputFilePath = outputDir + "/fragment_" + iFragment + ".mp3";
		outputMetadata[iFragment] = createFragment(inputFilePath, outputFilePath, inputMetadata[startIndex], relStartPosition, fragmentSize);
		console.info("created fragment #" + iFragment);
	}

	var outputMetadataPath = outputDir + "/" + METADATA_FILE;
	var outputMetadataStream = fs.createWriteStream(outputMetadataPath);

	console.info("Writing metadata file " + outputMetadataPath);
	for (iFragment in outputMetadata) {
		//console.info("filename: "+filename);
		outputMetadataStream.write(JSON.stringify(outputMetadata[iFragment]) + "\n");
	}
	outputMetadataStream.end();
}

function parseMetadataFile(inputDir) {
	var metadataFilePath = inputDir + "/" + METADATA_FILE;
	var metadataRecords = [];
	var lines = fs.readFileSync(metadataFilePath).toString().split("\n");
	for (var i in lines) {
		var line = lines[i].trim();
		if (line !== "")
			metadataRecords.push(JSON.parse(line));
	}

	return metadataRecords;
}


function createFragment(inputPath, outputPath, inputMetadata, startPosition, size) {
	console.log("createFragment [" + outputPath + "] : \"" + inputMetadata.title + "\" from " + secs2str(startPosition) + " for " + secs2str(size) + "");
	//cmd line: ffmpeg -ss x -t 30 -i file.mp3 fragment.mp3
	ffmpeg(inputPath).setStartTime(startPosition).setDuration(size).save(outputPath);

	var outputMetadata = {};
	outputMetadata.filePath = outputPath;
	outputMetadata.startPosition = startPosition;
	outputMetadata.duration = size;
	outputMetadata.title = inputMetadata.title;
	outputMetadata.artist = inputMetadata.artist;  
	outputMetadata.album = inputMetadata.album;  
	outputMetadata.trackDuration = inputMetadata.duration;

	return outputMetadata;
}


function randomPlayback(avgSleep, deltaSleep, dryRun, rootInputDir) {
	avgSleep = (typeof avgSleep !== 'undefined' ? avgSleep : 3*3600); //in secs
	deltaSleep = (typeof deltaSleep !== 'undefined' ? deltaSleep : (avgSleep/2) );
	dryRun = (typeof dryRun !== 'undefined' ? dryRun : false );
	rootInputDir = (typeof rootInputDir !== 'undefined' ? rootInputDir : rootFragmentDir );

	while (true) {
		//cmd line: cvlc xyz.mp3
		var fragmentMetadataItem = chooseRandomFragment(rootInputDir);
		console.info("Now playing [" + fragmentMetadataItem.title + "]");
		if (dryRun) {
			sleep(1);
			continue;
		}

		child_process.exec("cvlc " + fragmentMetadataItem.filePath, function(error, stdout, stderr) {
			console.log(stdout);
		});

		//randomize sleep
		var sleepTime = Math.floor(Math.random() * deltaSleep + avgSleep - (deltaSleep/2));
		console.info("Sleeping for [" + sleepTime + "] seconds");
		sleep(sleepTime);
	}
}

/**
 * Among all files
 */
function chooseRandomFragment(rootInputDir) {
	var fragmentMetadata = readFragmentMetadata(rootInputDir);
	var iFragment = Math.floor(Math.random() * fragmentMetadata.length);

	return fragmentMetadata[iFragment];
}

function readFragmentMetadata(rootInputDir) {
	var fragmentMetadata = [];

	fs.readdirSync(rootInputDir).forEach(function(dirname, index) {
		var subdir = rootInputDir + "/" + dirname;
		var fstat = fs.statSync(subdir);
		if (fstat.isDirectory())
			fragmentMetadata = fragmentMetadata.concat(parseMetadataFile(subdir));
	});

	return fragmentMetadata;
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
	for (var i in records) {
		var currRecord = records[i];
		var nextTot = currTot + currRecord[fieldName];

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

function resetDir(targetDir) {
	if (fs.existsSync(targetDir) ) {
		console.info("Removing old data from dir " + targetDir);
    	fs.readdirSync(targetDir).forEach(function(file,index) {
	      	var curPath = targetDir + "/" + file;
	    	fs.unlinkSync(curPath);
	    });

  	} else {
		console.info("Creating dir " + targetDir);
		fs.mkdirSync(targetDir);
  	}
}

function isMetadataCurrent(targetDir) {
	var dstat = fs.statSync(targetDir);
	var metadataFilePath = targetDir + "/" + METADATA_FILE;
	return fs.existsSync(metadataFilePath) && (dstat.mtime <= fs.statSync(metadataFilePath).mtime);	
}
