var utils=require("./utils");
var fs=require("fs");
var express=require("express");
var app=express();
var serial=require('serialport').SerialPort;
var Espruino;
fs.exists("/dev/ttyACM0",function(exists){
  if(exists)
  {
    Espruino=new serial("/dev/ttyACM0",{baudrate:9600});
    console.log("Espruino is connected ");
    if(Espruino){
      console.log("added listener on Espruino RX");
      Espruino.on('data',EspruinoRXHandler);
    }
    else
      console.log("Can't add listener on Espruino RX");
  }
});


var PORT=80;
var USER="root";
var PASS="D1stc229";
var OUT1="";
var EspruinoRX="";
var exec=require('child_process').exec;

exec("cat /sys/class/leds/blue\:ph21\:led2/brightness",function(err,stdout,stderr){
  console.log("stdout: "+stdout);
  if(stdout==0)
    OUT1="OFF";
  else
    OUT1="ON";
});

var http = require('http');
var fs = require('fs');


app.use('/',utils.basicAuth(USER,PASS));
app.use(express.static('/home/JP/nodejs/webserver/public'));

app.get("/",function(req,res){
  res.sendFile('/home/JP/nodejs/webserver/index.html');
});

//server.listen(80);
var server=app.listen(PORT,function(){
console.log("listening on "+PORT)});

var io = require('socket.io').listen(server);

function CS_OUTPUT1Handler(value){
  if(OUT1=='OFF') {
    OUT1='ON';
    exec("echo 255 > /sys/class/leds/blue\:ph21\:led2/brightness");
   }
   else{
     OUT1='OFF';
     exec("echo 0 > /sys/class/leds/blue\:ph21\:led2/brightness");
   }
   io.emit('SC_OUTPUT1',OUT1);
   console.log("new state: "+OUT1);
}


function CS_ESPRUINO_CMDHandler(value){
  console.log("remote CMD: "+value);
  if(Espruino)
  {
    console.log('Sending to Espruino...');
    value=value.replace(/(["])/g,"\\\"");
    exec("echo \""+value+"\" > /dev/ttyACM0");
    console.log('...Done');
  }
  else
    console.log("Espruino not detected");
}

function EspruinoRXHandler(data){
  console.log("Espruino rx handler");
  EspruinoRX+=data;
  if(EspruinoRX.indexOf('\r\n>')>-1)
  {
    console.log("Ready to send: "+EspruinoRX);
    io.emit('SC_EspruinoRX',EspruinoRX);
    EspruinoRX="";
  }
}

io.sockets.on('connection', function (socket) {
  socket.emit('SC_OUTPUT1',OUT1);
  socket.emit('SC_EspruinoAvailable',!(typeof Espruino=='undefined') );
  console.log('Client connected');
  socket.on('CS_OUTPUT1',CS_OUTPUT1Handler);
  socket.on('CS_ESPRUINO_CMD',CS_ESPRUINO_CMDHandler);

  socket.on('disconnect', function() {
    console.log("client disconnected");
    socket.removeListener('CS_OUTPUT1',CS_OUTPUT1Handler);
    socket.removeListener("CS_ESPRUINO_CMD",CS_ESPRUINO_CMDHandler);
  });
});
