#!/bin/bash

baseDir=`readlink -m $(dirname $0)`
scriptFile=$baseDir/sensori/temphum.py
destFile=$baseDir/web/th.dsv

procString="sudo python -u $scriptFile"
cmd="$1"

function main() {
	if [ "start" = "$cmd" ]
	then
		daemon_start
	elif  [ "stop" = "$cmd" ]
	then
		daemon_stop
	elif  [ "status" = "$cmd" ]
	then
		daemon_status
	else
		cmd_help
	fi
}

function cmd_help() {
	echo
	echo "  Usage:   $0 [start|stop|status]"
	echo
}

function daemon_start() {
	procFound=`daemon_find`
	if [ -z "$procFound" ]
	then
		nohup $procString >$destFile &
	else
		echo "Process already active: [$procFound]"
	fi
}


function daemon_stop() {
	procFound=`daemon_find`
	if [ -z "$procFound" ]
	then
		echo "Process not active"
	else
		sudo pkill -f "$procString"
		echo "Process [$procFound] killed"
	fi
}

function daemon_status() {
	procFound=`daemon_find`
	if [ -z "$procFound" ]
	then
		echo "Process not active"
	else
		echo "Process active: [$procFound]"
	fi
}


function daemon_find() {
	echo `pgrep -f "$procString"`
}

main
