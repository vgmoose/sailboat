var editor;
var showingPreScreen = true;
var loadedFile = null;
var midLoad = false;
var time;
var lastSeconds;
		
function postcontents()
{
	// get the target filename and contents
	var filename = loadedFile;
	var contents = editor.getValue();
	
	if (loadedFile.toLowerCase().endsWith("makefile"))
	{
		alert("ERROR: You cannot edit a Makefile.");
		return;
	}
	
	// post the file contents to the server
	$.post("/files/"+filename, {"data": contents});
	
//	// update the file listing
//	refresh_files();
	
}

function loadcontents(filename)
{
	// get the target filename and contents
//	var filename = $("#name").val();
	
	// set the target contents
	$.get("/files/"+filename, function(data) {
		editor.setValue(data);
		editor.focus();
		editor.gotoLine(0);
		
		loadedFile = filename;
		
		if (showingPreScreen)
		{
			// hide the initial screen if it's being shown
			$("#preloader").hide();
			$("#editor").show();
			showingPreScreen = false;
		}
	});
}

function make()
{
	alert("Will be implemented soon!");
}

function newfolder()
{
	var filename = prompt("Enter a new foldername")
	$.post("/files/"+filename, function(data) {
			 refresh_files();
	});
}

function is_dir(filename)
{
	var failed = true;
	
	var endings = [".c", ".h", ".cpp", ".hpp"];
	for (var x in endings)
		if (filename.endsWith(endings[x]))
		{
			failed = false;
			break;
		}
	
	return failed;
}

function newfile()
{
	var filename = prompt("Enter a new filename:\nMust end with one of the following: .c .h .cpp .hpp\n\nFor now, to make it inside a folder, specify the path to the folder").toLowerCase();
	
	var failed = is_dir(filename);
	
	if (failed)
		alert("ERROR: Filename must end in one of the following: .c .h .cpp .hpp");
	else
	{
		$.post("/files/"+filename, function(data) {
			 refresh_files();
		});
	}
}

function scan(files)
{
	var html = "";
		
	for (key in files)
	{
		var value = files[key];
//		console.log(key, value);
		
		// if the value is null, this is a file
		if (value == null)
			html += "<li data-jstree='{ \"type\" : \"file\"}'>"+key+"</li>";
		
		// else we go deeper
		else
		{
			html += "<li>" + key + "<ul>";
			html += scan(files[key]);
			html += "</ul></li>";
		}
	}
	
	return html;
}

function refresh_files()
{
	// get the listing of files for this user
	var files = $.get("/files", function(data) {

		if (".git" in data)
			delete data[".git"]
	
		// create jstree html for the files that were received
		console.log(data);
		var html = "<ul>"+scan(data)+"</ul>";
				
		$("#files").jstree().settings.core.data = html;
		$("#files").jstree().refresh(true);

		
	});
}

function onload()
{
	// setup the ACE editor
	editor = ace.edit("editor");
	editor.setTheme("ace/theme/twilight");
	editor.session.setMode("ace/mode/c_cpp");
	
	// setup jstree sidebar
	$('#files').jstree({ plugins : ["sort","types","wholerow", "state"], "core" : { "themes" : { "name" : "default-dark" } }, "types" : { "file" : { "icon" : "jstree-file" } } });
	
	$("#files").on("select_node.jstree",
	 function(evt, data){
		if (data.node.children.length == 0 && (!is_dir(data.node.text) || data.node.text.toLowerCase().endsWith("makefile")))
		{
			if (midLoad)
				return;
			
			var path = data.instance.get_path(data.node,'/');
			loadcontents(path);
		}
	 }
				   
);
	
	// get tinitial app listing
	refresh_files();
	
	// get the time until cookie expires
	$.get("/time", function(data) {
		
		time = Math.floor(data);
		time += 4*60*60;
		
		// update timer every second
		setInterval(update_time, 1000);
	});
}

function update_time()
{
	var ctime = Math.floor(new Date() / 1000);
	var diff = time - ctime;
//	alert(diff);
	
	secondsToString(diff);
}

function secondsToString(totalSec)
{
	var hours = Math.floor(totalSec/3600);
	var fpart = totalSec/3600 - hours;
	var minutes = Math.floor(fpart*60);
	fpart = (fpart*60) - minutes;
	var seconds = Math.floor(fpart*60);
	
	if (lastSeconds == seconds)
	{
		seconds --;
		if (seconds == -1)
		{
			seconds = 59;
			minutes --;
		}
	}
	lastSeconds = seconds;

	var result = (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds  < 10 ? "0" + seconds : seconds);
	
	$("#time").html(result);

}