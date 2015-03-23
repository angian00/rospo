#!/bin/sh


rm -rf  `dirname $0`/node_modules


apt-get install ffmpeg

npm install
#npm install fluent-ffmpeg
#npm install minimist
#npm install sprintf-js
#npm install sleep

##npm install musicmetadata #obsolete

apt-get install vlc
