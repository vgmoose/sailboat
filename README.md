# sailboat :sailboat:
WIP browser based IDE.

The intent of this project is to facilitate allowing potentially untrustworthy users to edit and compile code on a remote system. 

## Setup
```
git clone https://github.com/vgmoose/sailboat.git
cd sailboat
pip install -r requirements.txt
python server.py
```

For configuring SSL, take a look at the app.conf file

## Usage
*The described functionality below is not yet complete*

A user is authenticated to an editing session via a captcha code. When the code is correctly entered, they are given a cookie representing the session. The session can be used to edit up to 5MB of files, with each file less than 10KB each. The files can also be compiled into a binary to download.

Sessions are ephemeral, and the cookie expires in 72 hours. At this point, any files the user was working on will be completely deleted. Files are cached in local storage, which can be exported upon the next visit to the site.

A countdown is displayed in the upper right corner of the screen representing how much time is left in the session. At any time the cookie can be refreshed, allowing the countdown to start again at 72 hours. This effectively allows unlimited-length sessions as long as they are refreshed before he countdown ever hits 0.

An important attribute of the sailboat editor is that it *isn't* a cloud storage solution, files contained within the editor are not intended to be permanent, and storing them is just a means to an ends to facilitate remote cloud compilation of the code in question!

## License
Sailboat is licensed under [GNU GPL v3](http://choosealicense.com/licenses/gpl-3.0/).

[CherryPy](http://www.cherrypy.org) and [Ace](https://github.com/ajaxorg/ace) are under the BSD license, and [jstree](https://github.com/vakata/jstree) is under the MIT license.
