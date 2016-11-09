var express = require('express');
var app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');

const PORT = 10100;

app.post("/", function(req, res) {
	console.log("Post Received");
	console.log(req.body);
})

http.listen(PORT, function(){
  console.log('listening on: ' + PORT);
});