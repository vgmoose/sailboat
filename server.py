''' '' '' ''
Sailboat - Browser based IDE
Copyright (C) VGMoose 2016

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
''' '' '' ''

import datetime, os, base64, shutil, json

# controversial imports
try:
	import cherrypy
	from recaptcha.client import captcha
except ImportError as e:
	print "[ERROR] Some dependencies are missing, try \"pip install -r requirements.txt\""
	print "[ERROR] " + e.message
	exit()
	
# cache for staticy files (including sessions)
file_cache = {}

pwd = os.getcwd()

def is_logged_in():
	if "sesh_id" in cherrypy.request.cookie:
		# session id exists, make sure it's valid
		sesh_id = os.path.basename(cherrypy.request.cookie["sesh_id"].value)
		expiration = load_session(sesh_id)
		if expire_if_needed(sesh_id, expiration):
			# expire the client's cookie
			cherrypy.response.cookie["sesh_id"] = sesh_id
			cherrypy.response.cookie["sesh_id"]["expires"] = 0
			raise cherrypy.HTTPRedirect("/")
		return True
	return False

def expire_if_needed(sid, expiration):
	# if the session doesn't exist
	if expiration == None:
		return True
	
	# if the current date is past the expiration
	if datetime.datetime.now() > datetime.datetime.fromtimestamp(expiration):
		# remove the session by deleting the folder
		shutil.rmtree("sessions/"+sid)
		
		# invalidate the cache
		del file_cache[sid]
		
		return True
	
	return False

def load_session(sid):
	# try to open an existing session for the given id
	# (already cached from the contents method)
	try:
		return float(contents("sessions/"+sid+"/cookie.txt"))
	except:
		return None
	
def contents(filename):
	# return from the cache if possible
#	if filename in file_cache:
#		return file_cache[filename]
	
	# get the contents of the file
	c = open(filename, "r")
	out = c.read()
	c.close()
	
	# save for next time
	file_cache[filename] = out
	return out
	
# get captcha values
try:
	captcha_site	= contents(".recaptcha_site")
	captcha_secret	= contents(".recaptcha_private")
except Exception as e:
	print "[WARNING] Couldn't load secret key from the .recaptcha_site/.recaptcha_private file"
	print "[WARNING] Just put the key as the only content directly in the file"
	print "[WARNING] " + e.message
	captcha_site = captcha_secret = "none"
	
# http://code.activestate.com/recipes/577879-create-a-nested-dictionary-from-oswalk/
def get_directory_structure(rootdir):
	"""
	Creates a nested dictionary that represents the folder structure of rootdir
	"""
	dir = {}
	rootdir = rootdir.rstrip(os.sep)
	start = rootdir.rfind(os.sep) + 1
	for path, dirs, files in os.walk(rootdir):
		folders = path[start:].split(os.sep)
		valid_files = []
		
		for cfile in files:
			# only use proper file endings
			for ending in [".c", ".h", ".cpp", ".hpp", "makefile"]:
				if cfile.endswith(ending):
					valid_files.append(cfile)
					continue

		subdir = dict.fromkeys(valid_files)
		parent = reduce(dict.get, folders[:-1], dir)
		parent[folders[-1]] = subdir
	return dir

class Root(object):
	@cherrypy.expose
	def auth(self, *args, **kwargs):
		captcha_html = captcha.displayhtml(
						   captcha_site,
						   use_ssl=False,
						   error="Something broke!")

		# You'll probably want to add error message handling here if you 
		# have been redirected from a failed attempt
		return """
		<form action="validate">
		%s
		<input type=submit value="Submit Captcha Text" \>
		</form>
		"""%captcha_html

	# send the recaptcha fields for validation
	@cherrypy.expose
	def validate(self, *args, **kwargs):
		# these should be here, in the real world, you'd display a nice error
		# then redirect the user to something useful

		if not "recaptcha_challenge_field" in kwargs:
			return "no recaptcha_challenge_field"

		if not "recaptcha_response_field" in kwargs:
			return "no recaptcha_response_field"

		recaptcha_challenge_field	= kwargs["recaptcha_challenge_field"]
		recaptcha_response_field	= kwargs["recaptcha_response_field"]

		# response is just the RecaptchaResponse container class. You'll need 
		# to check is_valid and error_code
		response = captcha.submit(
			recaptcha_challenge_field,
			recaptcha_response_field,
			captcha_secret,
			cherrypy.request.headers["Remote-Addr"],)

		if response.is_valid:
			# if the user has an existing session, we'll get and renew itt
			if "sesh_id" in cherrypy.request.cookie:
				sesh_id = cherrypy.request.cookie["sesh_id"]
				expiration = load_session(sesh_id)
				if not expire_if_needed(sesh_id, expiration):
					# renew it
					pass
				
			# generate a new session and cookie
			expires = datetime.datetime.now() + datetime.timedelta(hours=72)
			expires = str((expires - datetime.datetime(1970, 1, 1)).total_seconds())
			
			sesh_id = base64.b64encode(os.urandom(16)).replace("/", "-")
			
			# write the cookie to a file
			# TODO: check for collisions
			homepath = "sessions/"+sesh_id
			os.mkdir(homepath)
			c = open(homepath+"/cookie.txt", "w")
			c.write(expires)
			c.close()
			
			cherrypy.response.cookie["sesh_id"] = sesh_id
			cherrypy.response.cookie["sesh_id"]["max-age"] = datetime.timedelta(hours=72).total_seconds()
			
			#redirect to where ever we want to go on success
			raise cherrypy.HTTPRedirect("/")

		if response.error_code:
			# this tacks on the error to the redirect, so you can let the
			# user knowwhy their submission failed (not handled above,
			# but you are smart :-) )
			raise cherrypy.HTTPRedirect(
				"auth?error=%s"%response.error_code)
	
	@cherrypy.expose
	def index(self, *args, **kwargs):
		if is_logged_in():
			return contents("index.html")
			
		# unauthorized
		else:
			raise cherrypy.HTTPRedirect("/auth")
							
	@cherrypy.expose
	def files(self, *args, **kwargs):
		if is_logged_in():
			sid = os.path.basename(cherrypy.request.cookie["sesh_id"].value)
			homepath = pwd+"/"+"sessions/"+sid+"/"
			
			# make sure the target path is in the home directory
			target_path = ""
			if len(args) > 0:
				target_path += "/".join(args)
			else:
				homepath = homepath[:-1]

			target_path = os.path.abspath(homepath + target_path)
			
			if not target_path.startswith(homepath):
				# not allowed
				raise cherrypy.HTTPError(403)
			
			if len(args) > 0:
				
				# only fetch .c .h .cpp .hpp and Makefile files
				failed = True
				lower_path = target_path.lower()
				for ending in [".c", ".h", ".cpp", ".hpp"]:
					if lower_path.endswith(ending):
						failed = False
						break
						
				# makefiles are allowed for getting only
				if cherrypy.request.method == "GET":
					if lower_path.endswith("makefile"):
						failed = False
						
				if failed:
					raise cherrypy.HTTPError(403)
				
				if cherrypy.request.method == "GET":
					# get the target file and return it
					t = open(target_path, "r")
					result = t.read()
					t.close()
				
					return result
				
				elif cherrypy.request.method == "POST":
					# ge the target file and write the post contents to it
					t = open(target_path, "w")
					t.write(kwargs["data"])
					t.close()
					
					return "Wrote contents of [data] to " + target_path
					
			# no path specified, return json overview
			else:
				cherrypy.response.headers['Content-Type'] = "application/json"
				return json.dumps(get_directory_structure(homepath).values()[0], sort_keys=True, indent=4, separators=(',', ': '))
			
		

cherrypy.quickstart(Root(), "", "app.conf")
