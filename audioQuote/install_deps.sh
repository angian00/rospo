#!/bin/sh


rm -rf  `dirname $0`/node_modules

npm install minimist

apt-get install ffmpeg
npm install fluent-ffmpeg
#npm install musicmetadata #obsoleted

npm install sprintf-js
npm install sleep

apt-get install vlc
