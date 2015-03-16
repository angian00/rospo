#!/bin/sh


apt-get install ffmpeg


rm -rf  `dirname $0`/node_modules

npm install minimist

npm install fluent-ffmpeg
#or...
#npm install musicmetadata

