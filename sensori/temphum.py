#!/usr/bin/env python

import Adafruit_DHT
from datetime import datetime
from time import sleep, tzset
import os


sensor = Adafruit_DHT.DHT11
pin = 17
sleep_time = 300 #secs

#force using local times
os.environ['TZ'] = 'Europe/Rome'
tzset()

# Note that sometimes you won't get a reading and
# the results will be null (because Linux can't
# guarantee the timing of calls to read the sensor).  
# If this happens try again!


if __name__ == "__main__":
	while True:
		hum, temp = Adafruit_DHT.read_retry(sensor, pin)
		ts = datetime.now()

		if hum is None:
			hum_str = "---"
		else:
			hum_str = str(hum)

		if temp is None:
			hum_str = "---"
		else:
			temp_str = str(temp)

		print ts.strftime("%Y-%m-%d %H:%M:%S") + "|" + temp_str + "|" +  hum_str

		sleep(sleep_time)
