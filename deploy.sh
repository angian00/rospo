#!/bin/sh

srcDir=/home/angian/host_vbox/rospo #TODO: make smart

destHost=raspag
destUser=pi
destDir=/home/pi/rospo

#rsync -v -u -r -e ssh --delete --exclude .git --exclude audioQuote/full_works --exclude audioQuote/bkp $srcDir/* ${destUser}@${destHost}:${destDir}

#no delete
rsync -v -u -r -e ssh --exclude .git --exclude audioQuote/full_works --exclude audioQuote/bkp $srcDir/* ${destUser}@${destHost}:${destDir}
