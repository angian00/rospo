#!/usr/bin/env python

from time import sleep
import pifacedigitalio as p



DELAY = 1.0  # seconds


if __name__ == "__main__":
	p.init()
    
	while True:
		in_pin_1 = p.digital_read(1)
		print("pin is "),
		if in_pin_1:
			print "ON"
		else:
			print "OFF"

        sleep(DELAY)
