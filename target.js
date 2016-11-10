var express = require('express');
var app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');

var c = 0;

const PORT = 10100;

app.post("/", function(req, res) {
	console.log("Post Received");
	c++;
	console.log(c);
})

http.listen(PORT, function(){
  console.log('listening on: ' + PORT);
});