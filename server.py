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

# controversial imports
try:
	import cherrypy
	from recaptcha.client import captcha
except ImportError as e:
	print "[ERROR] Some dependencies are missing, try \"pip install -r requirements.txt\""
	print "[ERROR] " + e.message
	exit()
	
# cache for staticy files
file_cache = {}
	
def contents(filename):
	# return from the cache if possible
	if filename in file_cache:
		return file_cache[filename]
	
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

class Root(object):
	@cherrypy.expose
	def display_recaptcha(self, *args, **kwargs):
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
			#redirect to where ever we want to go on success
			raise cherrypy.HTTPRedirect("success_page")

		if response.error_code:
			# this tacks on the error to the redirect, so you can let the
			# user knowwhy their submission failed (not handled above,
			# but you are smart :-) )
			raise cherrypy.HTTPRedirect(
				"display_recaptcha?error=%s"%response.error_code)
	
	@cherrypy.expose
	def default(self, *args, **kwargs):
		if len(args) == 0: # root
			return contents("index.html")
		return captcha_secret
	

cherrypy.quickstart(Root(), "", "app.conf")
