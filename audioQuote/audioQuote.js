#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
var child_process = require('child_process');

var sleep = require('sleep').sleep;
var sprintf = require("sprintf-js").sprintf;
var ffmpeg = require('fluent-ffmpeg');


var METADATA_FILE = "metadata.json";
var	rootFullDir = process.cwd() + "/full_works";
var	rootFragmentDir = process.cwd() + "/fragments";


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
			lastArg = getFirstSubDir(rootFullDir);
			console.warn("Directory not specified, using " + lastArg);
		}

		analyzeDir(lastArg);

	} else if (cmdArgs.cmd === "extract") {
		if (lastArg == null) {
			lastArg = getFirstSubDir(rootFullDir);
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

function analyzeAll(force) {
	fs.readdirSync(rootFullDir).forEach(function(dirname, index) {
		var subdir = rootFullDir + "/" + dirname;
		var fstat = fs.statSync(subdir);
		if (fstat.isDirectory()) {
			var metadataFilePath = TODO;
			var isMetadataCurrent = TODO;
			if (force || (!isMetadataCurrent))
				analyzeDir(subdir);
		}
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

				console.info("analyzed file " + filename);
			}
		});
	});
}

/**
 * fragmentRate: generate a fragment every fragmentRate seconds of total duration.
 */
function extractRandomFragments(inputDir, fragmentRate, fragmentSize) {
	fragmentRate = (typeof fragmentRate !== 'undefined' ? fragmentRate : 3600);
	fragmentSize = (typeof fragmentSize !== 'undefined' ? fragmentSize : 15);

	var inputMetadataFile = inputDir + "/" + METADATA_FILE;
	var inputMetadata = parseMetadataFile(inputMetadataFile);

	//compute totDuration
	var totDuration = 0; //in secs
	for (i in inputMetadata) {
		totDuration += inputMetadata[i].duration;
	}

	var outputDir = rootFragmentDir + "/" + path.basename(inputDir);
	resetDir(outputDir);
	var outputMetadata = [];

	//compute fragment position
	var MAX_FRAGMENT_TRIES = 10;
	var nFragments = Math.floor(totDuration / fragmentRate);
	console.info("nFragments: " + nFragments);
	for (var iFragment=0; iFragment < nFragments; iFragment++) {
		var nTries = 0;
		do {
			startPosition = Math.random() * totDuration;
			endPosition = startPosition + fragmentSize;
			res = findItem(inputMetadata, "duration", startPosition);
			startIndex = res[0];
			relStartPosition = res[1];
			res = findItem(inputMetadata, "duration", endPosition);
			endIndex = res[0];
			relEndPosition = res[1];

			//console.log("nTries: " + nTries + ", startIndex: " + startIndex + ", endIndex: " + endIndex);

			ok = (startIndex == endIndex);
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

	for (iFragment in outputMetadata) {
		outputMetadataRecord = outputMetadata[iFragment];
		//console.info("filename: "+filename);
		outputMetadataStream.write(JSON.stringify(outputMetadataRecord) + "\n");
	}
	outputMetadataStream.end();
	console.info("Written metadata file " + outputMetadataPath);
}

function parseMetadataFile(metadataFilePath) {
	var metadataRecords = [];
	var lines = fs.readFileSync(metadataFilePath).toString().split("\n");
	for (i in lines) {
		line = lines[i].trim();
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
	outputMetadata.startPosition = relStartPosition;
	outputMetadata.duration = size;
	outputMetadata.title = inputMetadata.title;
	outputMetadata.artist = inputMetadata.artist;  
	outputMetadata.album = inputMetadata.album;  
	outputMetadata.trackDuration = inputMetadata.duration;

	return outputMetadata;
}


function randomPlayback(avgSleep, deltaSleep) {
	avgSleep = (typeof avgSleep !== 'undefined' ? avgSleep : 3*3600); //in secs
	deltaSleep = (typeof deltaSleep !== 'undefined' ? deltaSleep : (avgSleep/2) );

	while (true) {
		//randomize sleep
		var sleepTime = Math.floor(Math.random() * deltaSleep + avgSleep - (deltaSleep/2));
		console.info("Sleeping for [" + sleepTime + "] seconds");
		sleep(sleepTime);

		//cmd line: cvlc xyz.mp3
		mp3Path = chooseRandomFragment();
		console.info("Now playing [" + mp3Path + "]");
		child_process.exec("cvlc " + mp3Path, function(error, stdout, stderr) {
			console.log(stdout);
		});
		console.info("File played");
	}
}

/**
 * Among all files
 */
function chooseRandomFragment() {
	var fragmentMetadata = readFragmentMetadata();
	var iFragment = Math.floor(Math.random() * fragmentMetadata.length);

	//return {path: "fart-01.mp3"};
	return fragmentMetadata[iFragment];
}

function readFragmentMetadata() {
	var fragmentMetadata = [];

	fs.readdirSync(rootFragmentDir).forEach(function(dirname, index) {
		var subdir = rootFragmentDir + "/" + dirname;
		var fstat = fs.statSync(subdir);
		if (fstat.isDirectory())
			fragmentMetadata.append(parseMetadata(subdir));
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

