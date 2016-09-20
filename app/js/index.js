var editor;
var showingPreScreen = true;
var loadedFile = null;
var midLoad = false;
		
function postcontents()
{
	// get the target filename and contents
	var filename = loadedFile;
	var contents = editor.getValue();
	
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
		if (data.node.children.length == 0)
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
}
