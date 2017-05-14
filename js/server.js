var http = require('http');
var fs = require('fs');
var express = require('express');
var url = require('url');
var mime = require('mime');
var multer = require('multer');

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './uploads');
  },
  filename: function (req, file, callback) {
    console.log(file.fieldname);
    callback(null, file.fieldname + '-' + Date.now() + '.mid');
  }
});

var upload = multer({ storage : storage}).single('musicUpload');

var sendFileWithType = function(res, path, type, encoding) {
	fs.readFile('.' + path, encoding, function(error, content) {
			res.writeHead(200, {"Content-Type": type});
			res.end(content);
	});
};

var sendFile = function(res, path, type) {
	sendFileWithType(res, path, type, 'utf-8');
};

//Sending the files with express here
app.get('/', function(req, res) {
	sendFile(res, '/MIDIPlayer.html', 'text/html');
})
.get('/socket.io/socket.io.js',function(req,res){
	sendFile(res, '/node_modules/socket.io-client/dist/socket.io.js', "text/javascript");
})
.get('/css/:filename',function(req,res){
	sendFile(res, '/css/' + req.params.filename, "text/css")
})
.post('/api/music',function(req,res){
    upload(req,res,function(err) {
        if(err) {
            return res.end("Error uploading file.");
        }
        res.end("File is uploaded");
    });
})
.use(function(req, res, next) {
	var path = url.parse(req.url).pathname;
	var type = mime.lookup(path);
	sendFile(res, path, type);
})

io.sockets.on('connection', function (socket) {
    console.log('Un client est connecté !');
});
io.sockets.on('clientException', function(socket) {
	console.log(socket.error);
});

server.listen(8080);
