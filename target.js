var express = require('express');
var app = express();
var http = require('http').Server(app);

const PORT = 10100;

app.post("/", function(req, res) {
	console.log("Post Received");
})

http.listen(PORT, function(){
  console.log('listening on: ' + PORT);
});