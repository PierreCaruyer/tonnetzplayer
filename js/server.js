var http = require('http');
var fs = require('fs');
var express = require('express');
var url = require('url');
var mime = require('mime');

var app = express();

var server = http.createServer(app);

var sendFile = function(res,path, type) {
	fs.readFile('.' + path, 'utf-8', function(error, content) {
			res.writeHead(200, {"Content-Type": type});
			res.end(content);
	});
};

app.get('/', function(req, res) {
	sendFile(res, '/MIDIPlayer.html', 'text/html');
})
.get('/css/:filename',function(req,res){
	fs.readFile('./css/' + req.params.filename, function(error, content) {
			res.writeHead(200, {"Content-Type": "text/css"});
			res.end(content);
	});
})
.get('/css/bootstrap.min.css.map',function(req,res){
	fs.readFile('./css/bootstrap.min.css.map', function(error, content) {
			res.writeHead(200, {"Content-Type": "text/css"});
			res.end(content);
	});
})
.use(function(req, res, next) {
	var path = url.parse(req.url).pathname;
	console.log(path);
	var type = mime.lookup(path);
	if(path.includes('css'))
		type = 'text/css';
	else if(path.includes('.js'))
		type = 'text/javascript';
	sendFile(res, path, type);
})

var io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {
    console.log('Un client est connecté !');
});

app.listen(8080);
