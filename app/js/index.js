var editor;
		
function postcontents()
{
	// get the target filename and contents
	var filename = $("#name").val();
	var contents = editor.getValue();

	// post the file contents to the server
	$.post("/files/"+filename, {"data": contents});

}

function loadcontents()
{
	// get the target filename and contents
	var filename = $("#name").val();
	
	// set the target contents
	$.get("/files/"+filename, function(data) {
		editor.setValue(data);
	});
}

function onload()
{
	// setup the ACE editor
	editor = ace.edit("editor");
	editor.setTheme("ace/theme/twilight");
	editor.session.setMode("ace/mode/c_cpp");
	
	// setup jstree sidebar
	$('#files').jstree({ plugins : ["checkbox","sort","types","wholerow"], "core" : { "themes" : { "name" : "default-dark" } }, "types" : { "file" : { "icon" : "jstree-file" } } });
}