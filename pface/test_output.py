#!/usr/bin/env python

from time import sleep
import pifacedigitalio as p



DELAY = 5.0  # seconds


if __name__ == "__main__":
	p.init()
    
	in_pin = 1

	while True:
		p.digital_write(0, in_pin)
		in_pin = 1 - in_pin

		print("pin is "),
		if in_pin:
			print "ON"
		else:
			print "OFF"
		
		sleep(DELAY)
