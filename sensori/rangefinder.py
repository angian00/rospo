#!/usr/bin/env python

import RPi.GPIO as GPIO
import time

TRIG = 23
ECHO = 24


SOUND_SPEED = 343 # m/s


print "-- Rangefinder app"


GPIO.setmode(GPIO.BCM)
GPIO.setup(TRIG,GPIO.OUT)
GPIO.setup(ECHO,GPIO.IN)


print "waiting for sensor to settle..."
GPIO.output(TRIG, False)
time.sleep(2)

print "sending trigger"
GPIO.output(TRIG, True)
time.sleep(0.00001)
GPIO.output(TRIG, False)


print "waiting for echo"
while GPIO.input(ECHO)==0:
	pulse_start = time.time()

while GPIO.input(ECHO)==1:
	pulse_end = time.time()

pulse_duration = pulse_end - pulse_start

dist = pulse_duration * SOUND_SPEED / 2 # in m


print "--> Calculated distance : %1.2f m" % (dist)

GPIO.cleanup()
