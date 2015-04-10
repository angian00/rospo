#!/usr/bin/env python

import sys
import pifacedigitalio as p




if __name__ == "__main__":
	p.init()

	if len(sys.argv) < 2:
		i_pin = 4
	else:
		i_pin = int(sys.argv[1])

	if len(sys.argv) < 3:
		level = 1
	else:
		level = int(sys.argv[2])

	#print("i_pin: " + str(i_pin))
	#print("level: " + str(level))

	p.digital_write(i_pin, level)

	print "ok"
    