#!/usr/bin/env python

import RPi.GPIO as GPIO
from time import sleep
#from RPIO import PWM

red_pin = 19
#red_pin = 26
green_pin = 21
blue_pin = 26
#blue_pin = 19




def init():
	GPIO.cleanup()  
	GPIO.setmode(GPIO.BCM)
	GPIO.setup(red_pin, GPIO.OUT)
	GPIO.setup(green_pin, GPIO.OUT)
	GPIO.setup(blue_pin, GPIO.OUT)

	reset()


def reset():
	GPIO.output(red_pin, 0)
	GPIO.output(green_pin, 0)
	GPIO.output(blue_pin, 0)


def red_only():
	GPIO.output(red_pin, 1)
	GPIO.output(green_pin, 0)
	GPIO.output(blue_pin, 0)

def green_only():
	GPIO.output(red_pin, 0)
	GPIO.output(green_pin, 1)
	GPIO.output(blue_pin, 0)

def blue_only():
	GPIO.output(red_pin, 0)
	GPIO.output(green_pin, 0)
	GPIO.output(blue_pin, 1)


def full_loop():
	while True:
		red_only()
		sleep(1)
		green_only()
		sleep(1)
		blue_only()
		sleep(1)


def pwm_init():
	wpm_freq = 50 #Hz
	global pwm_green
	pwm_green = GPIO.PWM(green_pin, wpm_freq)
	pwm_green.start(0)

	global pwm_blue
	pwm_blue = GPIO.PWM(blue_pin, wpm_freq)
	pwm_blue.start(0)

def pwm_cleanup():
	pwm_green.stop()
	pwm_blue.stop()

def pwm_loop():
	loop_duration = 10 #s
	n_steps = 10
	MAX_DC = 100.0

	pwm_step = MAX_DC / n_steps
	step_delay = loop_duration / n_steps
	delta = pwm_step

	g = MAX_DC
	#g = 50
	b = 0.0

	while True:
		pwm_green.ChangeDutyCycle(g)
		pwm_blue.ChangeDutyCycle(b)
		#print(" " + str(g) + ", " + str(b))
		g = g - delta
		if g > MAX_DC:
			g = MAX_DC
		elif g < 0.0:
			g = 0.0
		b = b + delta
		if b > MAX_DC:
			b = MAX_DC
		elif b < 0.0:
			b = 0.0

		if b >= MAX_DC or g >= MAX_DC:
			delta = -delta

		sleep(step_delay)



if __name__ == "__main__":
	print("-- RGB LED --")
    
	init()

	#full_loop()

	red_only()
	sleep(1)
	reset()

	pwm_init()
	pwm_loop()
