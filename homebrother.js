// HomeBrother
// Web server exposing various features from my home devices
// JRY
// 11.01.2016


//generic vars
var COMPort='COM60';
var Baudrate=115200;
var PORT=80;
var MAINFILE='index.html';
var CSSFILE='styles.css';

//os
var os=require('os');
var LinuxOS=true;
LinuxOS=(os.platform()==='win32')?false:true;

//file system
var fs=require('fs');

//express
var express=require("express");
var app=express();

//websocket and server
var wsConnected=false;
var http = require('http');
var io=require('socket.io');
io=io.listen(app.listen(PORT,function(){
	console.log("WebServer: ON ("+PORT+")")
}));

app.get('/',function(req,res){
	console.log(' Received request for '+req.url );
    fs.readFile(MAINFILE,function (err, data){
		if(err)throw err;
        res.writeHead(200, {'Content-Type': 'text/html','Content-Length':data.length});
        res.write(data);
        res.end();
    });
});

app.get('/styles.css',function(req,res){
	console.log(' Received request for '+req.url );
    fs.readFile(CSSFILE,function (err, data){
		if(err)throw err;
        res.writeHead(200, {'Content-Type': 'text/css'});
        res.write(data);
        res.end();
    });
});

function CS_AckHandler(data){
	//console.log('client WS message: '+data);	
}

io.on('connection',function(socket){
	console.log("WebSocket: ON");
	wsConnected=true;
	socket.on('Ack', CS_AckHandler);
	socket.on('disconnect', function() {
		console.log("Websocket disconnected");
		socket.removeAllListeners('Ack');
		wsConnected=false;
  });
});
io.set('transports',  ['websocket', 'polling']);



//Serial port

function AppCmdSendToDevice(cmd){
	if(COMPortValid)
	{
		COMPort.write(cmd);
	}
}

function AppCmdDispatch(input){
	console.log("raw input: "+input);
	if(input.indexOf('Project')>-1){
		var data=JSON.parse(input);
		console.log("project.revision: "+data.Project.revision);
		console.log("project.author: "+data.Project.author);
		console.log("system.time: "+data.system.time);
	}
	else if(input.indexOf('moisture')>-1){
		var data=JSON.parse(input);
		console.log("data: "+data.moisture);
	}
}

function COMcb(d){
	COMcb.data=COMcb.data||"";
	if(d){ 
		d.forEach(function(elem){COMcb.data+=String.fromCharCode(elem)});
	}
	var CMDEndOffset=COMcb.data.indexOf('\n');
	if(CMDEndOffset>-1){
		AppCmdDispatch(COMcb.data.slice(0,CMDEndOffset));
		COMcb.data=COMcb.data.slice(CMDEndOffset+2,COMcb.data.length);
	}
	CMDEndOffset=COMcb.data.indexOf('\n');
	if(CMDEndOffset>-1){
		COMcb();
	}
}

var Serial=require('serialport');
var SerialPort = Serial.SerialPort;
var COMPortValid=false;
var COMName=(os.platform==='win32')?'COM0':'/dev/ttyUSB0';
var COMName =COMPort;
var COMPort = new SerialPort(COMName, {baudrate: Baudrate},false);
COMPort.open(function(err){
	if ( err) {
		console.log('failed to open '+COMName+" :"+err);
	}
	else{	
		COMPortValid=true;
		COMPort.on('data',COMcb);
		
		setTimeout(function(){AppCmdSendToDevice("sw info\n");},3000);
	}
});

process.on('SIGINT', function () {
  console.log('CTRL-C: exiting...');
  console.log("OK. bye bye");
  process.exit(0);
});