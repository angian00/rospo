#!/usr/bin/env node

var path = require("path");
var fs = require("fs");

//var mm = require('musicmetadata');
var ffmpeg = require('fluent-ffmpeg');

main();



function main() {
	parseCmdLine();
}


function parseCmdLine() {
	var cmdArgs = require('minimist')(process.argv.slice(2), 
			{ 	'default': { 'cmd': 'xxx'}, 
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

		analyzeAll(lastArg);

	} else {
		console.error("Unknown command: " + cmdArgs.cmd);
	}
}

function downloadAll(baseUrl) {
	console.warn("Automatic download is currently not supported");
}


function analyzeAll(rootDir) {
	console.log("analyzeAll " + rootDir);
	fs.readdir(rootDir, function (err, filenames) { 
		if (err)
	  		throw err;

		filenames.forEach(function(filename) {
			if (endsWith(filename, ".mp3"))
				analyzeMetadataFfmpeg(rootDir + "/" + filename);
		});
	});
}

function analyzeMetadataMM(filename) {
	//console.log("analyzeMetadata " + filename);

	mm(fs.createReadStream(filename), function (err, metadata) {
		if (err)
		  	throw err;
		console.log("filename: " + path.basename(filename) + ", artist: " + metadata.artist + ", album: " + metadata.album + ", title: " + metadata.title);
	});
}

function analyzeMetadataFfmpeg(filename) {
	console.log("analyzeMetadataFfmpeg " + filename);

	ffmpeg.ffprobe(filename, function(err, metadata) {
		if (err)
		  	throw err;

		storeMetadata(filename, metadata.format);
	});
}

function storeMetadata(filename, metadata) {
	console.log("filename: " + path.basename(filename) + ", artist: " + metadata.tags.artist + ", album: " + metadata.tags.album 
		+ ", title: " + metadata.tags.title + ", duration: " + metadata.duration);
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