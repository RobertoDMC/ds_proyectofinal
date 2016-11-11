var express = require('express');
var app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');
var toPort = require('hash-to-port');
var idTarget = process.argv[2];

var c = 0;

var port = toPort(idTarget);

app.post("/", function(req, res) {
	console.log("Post Received");
	c++;
	console.log(c);
})

http.listen(port, function(){
  console.log('listening on: ' + port);
});