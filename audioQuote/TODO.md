TODO
=======

- download manuale audiolibri
- fading in apertura e chiusura frammenti:
	- ffmpeg -y -i /home/user/video/test/sound.mp3 -af "afade=t=in:ss=0:d=3,afade=t=out:st=7:d=3,afade=t=in:st=10:d=3,afade=t=out:st=17:d=3,afade=t=in:st=20:d=3,afade=t=out:st=27:d=3" /tmp/test.mp3
	- volume filters

- playback audio: aggiungere tts metadati (posizione)
		wget -q -U Mozilla "http://translate.google.com/translate_tts?tl=it&q=prova" -O prova.mp3
