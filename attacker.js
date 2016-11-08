var querystring = require('querystring');
var http = require('http');
var request = require('request');
var express = require('express');
var toPort = require('hash-to-port');
var app = express();
var http = require('http').Server(app);
var bodyParser = require('body-parser');

//Arreglo de ips y p[uertos de los otros arduinos
var arduinos;
//Un JSON de la Forma {position:N}, donde n es la posicion del vector de ips attackInfo, a la cual se atacara
var attacking;
//Ip y puerto de donde atacar
var attackInfo;
//Json con la IP y piuerto del Arduino
var info = {};
//Flag si el arduino es leader o no
var leader = true;
//Delay entre el possts para el iotDashboard
var delay = 1000;
//Ip del arduino
var ip;
//Data a enviarse en los posts
var data = {
      "id": "myIOT"
    };
var port = toPort(data.id);
//Contador de post, para verificar si ya se reaalizaron los posts necesarios para escoger el lider
var posts = 0;
//Boolean para saber si atacar o no
var attack = false;
//Info del leader IP y Puerto
var leaderInfo

var i;

//Variable que cuenta si es que ya existio un lider por lo menos una vez
var leaderC;

var length = 1;

//Obteniendo la Ip del arduino y creando al arreglo info
require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  ip = add;
  console.log(ip);
  info.id = data.id;
  info.ip = ip;
  info.port = port;
});

app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});


var pid = Math.floor((Math.random() * 100) - 1);
console.log("ID:" + pid);

//Post para enviar una vez al servidor la ip y puerto del arduino
(request({
url: "http://localhost:8080/ip",
method: "POST",
json: true,   // <--Very important!!!
body: info
}, function (error, response, body){
})); 

var controlLoop = setinterval(function(){
    postIOT();
    if(leader && posts == length)
    {
        startAttack();
        leaderC ++;
    }
    if(attack)
    {
        attackPost();
    }
    if(!leader && leaderC >0)
    {
        checkLeader();
    }

},delay); 

//Funcion para hacer post al Server IOT
function postIOT(){
            var time = getDateTime();
            var val1 = Math.floor((Math.random() * 200) - 100);
            var val2 = Math.floor((Math.random() * 200) - 100);

            data.datetime = "\"" + time + "\"";
            data.data = {'sensor0':val1, 'sensor1':val2};
            (request({
            url: "http://localhost:8080",
            method: "POST",
            json: true,
            body: data
            }, function (error, response, body){
            console.log(body);
            if(!isNaN(body))
            {
                console.log("Delay Changed");
                delay = parseInt(body);
            }
            else
            {
                if(body != "ok")
                {
                    console.log(body.arduino);
                    console.log(body.target);
                    //console.log(body.arduino[0]);
                    //console.log(body.arduino[1]);
                    arduinos = body.arduino;
                    attackInfo = body.target;
                    length = arduinos.length;
                    setLeader();
                }
            }
            })); 
};

//Post para esoger el lider
app.post("/leader", function(req, res){
    //console.log("ID" + req.body);
    if(pid < req.body.id)
    {
        //el pid recibido es mayor q el mio, no soy leader
        res.end("leader");
        console.log("leader");
    }
    else
    {
        //pid recibido es menor q el mio yo soy leader
        res.end("notLeader");
        console.log("notLeader");
    }
    posts++;
});

//Post para recibir las IPS y Puertos de los otros arduinos
app.post("/arduino", function(req, res){
    arduinos = req.body;
});

//Post en el q llega la informacion de que ip atacar y q puerto
app.post("/attack", function(req, res){
    attacking = req.body.position;
    leaderInfo = req.body.leader;
    attack = true;
});

//Post para para los ataques
app.post("/stop", function(req, res){
    attack = false;
});

//Get para ver si el lider sigue vivo
app.get("/leader", function(req, res){
    if(leader)
    {
        res.end("alive");
    }
});

//Funcion para determinar si un attacker es lier o on
function setLeader(){
    var i ;
    var pidjs = {};
    pidjs.id = pid
    for(i = 0 ; i < length; i++)
    {
        (request({
        url: "http://" + arduinos[i].ip + ":" + arduinos[i].port + "/leader",
        method: "POST",
        json: true,   // <--Very important!!!
        body: pidjs
        }, function (error, response, body){
            if(body == "notLeader")
            {
                leader = false;
            }
            else
            {
                leader = leader && true;
            }
        }));
    }
};

//Funcion para checkear si el leder sigue vivo
function checkLeader(){
    (request({
        url: "http://" + leaderInfo.ip + ":" + leaderInfo.port + "/leader",
        method: "GET",
        json: true,   // <--Very important!!!
        body: pidjs
        }, function (error, response, body){
            if(body!="alive");
            {
                setLeader();
            }
        }));
};

//Attackpost para atacar a la ip designada
function startAttack(){
            var attackjs = {};
            attackjs.position = Math.floor((Math.random() * arduinos.length) - 1);
            attackjs.leader = info;
            for(i = 0 ; i < arduinos.length; i++)
            {
                (request({
                url: "http://" + arduinos[i].ip + ":" + arduinos[i].port + "/attack",
                method: "POST",
                json: true,   // <--Very important!!!
                body: attackjs
                }, function (error, response, body){
                //Ignore the response    
                })); 
            }
};

//Attackpost para atacar a la ip designada
function attackPost(){
            var time = getDateTime();
            var val1 = Math.floor((Math.random() * 200) - 100);
            var val2 = Math.floor((Math.random() * 200) - 100);

            data.datetime = "\"" + time + "\"";
            data.data = {'sensor0':val1, 'sensor1':val2};
            
                (request({
                url: "http://" + attackInfo[attacking].ip + ":" + attackInfo[attacking].port,
                method: "POST",
                json: true,   // <--Very important!!!
                body: data
                }, function (error, response, body){
                //Ignore the response    
                })); 
};

//Obteniendo datetime
function getDateTime() {
    var date = new Date();
   
    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    var milli = date.getMilliseconds();
    if(milli < 10)
    {
        milli = "0" + milli;
    }
    else if(milli < 100)
    {
        milli = "00" + milli;
    }

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec + "." + milli;
};

//Servidor escuchando en un puerto
http.listen(port, function(){
  console.log('listening on: ' + port);
});