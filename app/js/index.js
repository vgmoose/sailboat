var editor;
var showingPreScreen = true;
var loadedFile = null;
var midLoad = false;
var time;
var lastSeconds;

var allFiles = {};

function updateAllFiles(filename, contents)
{
	if (!(filename in allFiles))
		allFiles[filename] = {};
		
	allFiles[filename].origText = contents;
}
		
function postcontents()
{
	// get the target filename and contents
	var filename = loadedFile;
	var contents = editor.getValue();
	
	// update the local cache
	localStorage[filename] = contents;
	updateAllFiles(filename, contents);
	codeUpdateMade();
	
	if (loadedFile.toLowerCase().endsWith("makefile"))
	{
		swal("Unauthorized", "You cannot edit a Makefile.", "error");
		return;
	}
	
	// post the file contents to the server
	$.post("/files/"+filename, {"data": contents});
	
//	// update the file listing
//	refresh_files();
	
}

function loadcontents(filename, loadFromCache)
{
	// if it ends with an asterisk, use the in-memory version
	if (loadFromCache)
	{
				loadedFile = filename;
		console.log("Loading ", filename, " from cache");
		editor.session.setValue(allFiles[filename].currentText);
		editor.focus();
		editor.gotoLine(0);
		return;
	}
	
	// set the target contents
	$.get("/files/"+filename, function(data) {
		updateAllFiles(filename, data);
		// clear the session (undo history) and replace it with the new data
		// TODO: restore a backed up ACE session to allow multiple files to be edited at once
				loadedFile = filename;

		
		editor.session.setValue(data);
		editor.focus();
		editor.gotoLine(0);
		
		
		if (showingPreScreen)
		{
			// hide the initial screen if it's being shown
			$("#preloader").hide();
			$("#editor").show();
			showingPreScreen = false;
		}
	});
}

function make(forceUnsaved)
{
	if (!forceUnsaved)
		if (!check_for_unsaved())
			return;
	
	swal({   title: "Compiling...",   text: "Please wait! Your project is being built. This may take a while!",   showConfirmButton: false });
	
	$.ajax({url:"/make", 
			type: "GET",
			complete: function(xhr) {
				if (xhr.status == 200)
		   			swal("Success!", "Your project successfully compiled! Check the sidebar for the executables and build log.", "success");
				else if (xhr.status == 429)
					swal("Rate Limited", "Sorry! As of right now, you must wait at least a minute after a compile.", "warning");
				else if (xhr.status == 422)
					swal("Compilation Error", "There was an error while trying to build your project. Check the build.log in the sidebar for more details.", "error");
				else
					swal("Unknown Error", "There was a "+xhr.status+" Error while trying to build your project.", "error");

				refresh_files();
		   	}});
}

function clean()
{
	$.get("/clean", function(data) {
		swal("Success!", "Your project has been cleaned. Executable and build files are gone from the sidebar.", "success");
		refresh_files();
	});
}

function newfolder()
{
	swal({title:"New Folder", text:"Enter a new folder name/path. It will be created from the root of the project", type:"input", showCancelButton :true, closeOnConfirm: false, inputPlaceholder: "enter directory name"}, function(data) {
		if (data === false || data === ""){
			swal.showInputError("Folder name cannot be blank.");
			return false;
		}
		
		$.post("/files/"+data, function(data2) {
			swal("Success!", "Folder "+ data+" was successfully created. Check the sidebar.", "success");
			 refresh_files();
		});
	});
	
}

function is_dir(filename)
{
	var failed = true;
	
	var endings = [".c", ".h", ".cpp", ".hpp", ".ld"];
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
		swal({title:"New File", text:"Enter a new filename.\n\nFor now, to make it inside a folder, specify the path to the folder", type:"input", showCancelButton :true, closeOnConfirm: false, inputPlaceholder: "enter file name"}, function(filename) {
			if (filename === false || filename === ""){
				swal.showInputError("Filename cannot be blank.");
				return false;
			}
			var failed = is_dir(filename);
	
			if (failed) {
				swal.showInputError("Filename must end in one of the following: .c .h .cpp .hpp");
				return false;
			}
			else
			{
				$.post("/files/"+filename, function(data) {
					swal("Success!", "File "+ filename+" was successfully created. Check the sidebar.", "success");
					refresh_files();
				});
			}

	});
	
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
	// get the edited files
	var unsaved = get_unsaved_files();
	
	// get the listing of files for this user
	var files = $.get("/files", function(data) {

		if (".git" in data)
			delete data[".git"]
	
		// create jstree html for the files that were received
		console.log(data);
		var html = "<ul>"+scan(data)+"</ul>";
				
		$("#files").jstree().settings.core.data = html;
		$("#files").jstree().refresh(true);
		
//		// mark the edited files as edited again
//		for (var x; x<unsaved.length; x++)
//		{
//			for (var key in allFiles)
//			{
//				if (allFiles.hasOwnProperty(key))
//				{
//					if (allFiles[key].loadedNode.text == unsaved[x])
//						allFiles[key].loadedNode.text += "*";
//				}
//			}
//		}

		
	});
}

function codeUpdateMade()
{
	if (editor.getValue() == "")
		return;
	
	if (loadedFile in allFiles)
	{
		var origText = allFiles[loadedFile].origText;
		var loadedNode = allFiles[loadedFile].loadedNode;
	}
	else
		return;
	
	console.log("Writing ", loadedFile, " from cache");
	
	allFiles[loadedFile].currentText = editor.getValue();
	
	// mark the file as edited (even if it maybe wasn't...)
	if (!loadedNode.text.endsWith("*"))
	{
		if (origText != editor.getValue())
			$("#files").jstree('set_text', loadedNode , loadedNode.text + "*" );
	}
	else
	{
		if (origText == editor.getValue())
			$("#files").jstree('set_text', loadedNode , loadedNode.text.substring(0, loadedNode.text.length - 1) );
	}
}

function onload()
{
	// setup the ACE editor
	editor = ace.edit("editor");
	editor.setTheme("ace/theme/twilight");
	editor.session.setMode("ace/mode/c_cpp");
	editor.getSession().on('change', function() {
		codeUpdateMade();
	});

	
	// setup jstree sidebar
	$('#files').jstree({ plugins : ["sort","types","wholerow", "state"], "core" : { "themes" : { "name" : "default-dark" } }, "types" : { "file" : { "icon" : "jstree-file" } } });
	
	$("#files").on("select_node.jstree",
	 function(evt, data){
		
		if (data.node.text.toLowerCase().endsWith(".elf") || data.node.text.toLowerCase().endsWith(".rpx"))
		{
			// download the elf directly
			window.location = "/files/" + data.node.text;
			return;
		}
		
		if (data.node.children.length == 0 && (!is_dir(data.node.text) || data.node.text.toLowerCase().endsWith("makefile") || data.node.text.endsWith("*")))
		{
			if (midLoad)
				return;
						
			var path = data.instance.get_path(data.node,'/');
			
			if (path.endsWith("*"))
				path = path.substring(0, path.length-1);
			
			if (!(path in allFiles))
				allFiles[path] = {};
			
			allFiles[path].loadedNode = data.node;
			
			loadcontents(path, data.node.text.endsWith("*"));
		}
	 }
				   
	);
	
	// get tinitial app listing
	refresh_files();
	
	// get the time until cookie expires
	$.get("/time", function(data) {
		
		time = Math.floor(data);
		
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

function get_unsaved_files()
{
	var unsaved = [];
	
	// check if any files need to be saved
	for (var key in allFiles)
	{
		if (allFiles.hasOwnProperty(key))
		{
			var loadedNode = allFiles[loadedFile].loadedNode;
			var name = loadedNode.text;
			
			if (name.endsWith("*"))
			{
				unsaved.push(name.substring(0, name.length-1));
			}
		}
	}
							 
	return unsaved;
}

function check_for_unsaved()
{
	var unsaved = get_unsaved_files();
	
	if (unsaved.length > 0)
	{
		swal({   title: "Unsaved Files",   text: "You have unsaved files. Are you sure you want to compile without saving them?\n\nThese are the files: "+unsaved,   type: "warning",   showCancelButton: true,   confirmButtonColor: "#0D6B05",   confirmButtonText: "Continue",   closeOnConfirm: false }, function(){ make(true); });
		return false;
	}
	
	return true;
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