var http = require('http');
var fs = require('fs');
var express = require('express');
var url = require('url');
var mime = require('mime');
var multer = require('multer');
var player = require('./js/player.js')
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

const SERVER_PORT = 8080;
const VALID_UPLOAD_DIR = './uploads';
const INVALID_UPLOAD_DIR = './invalid-uploads';
var receivedFiles = [];
var file_remote_address_mapping = [];

server.listen(SERVER_PORT, () => {
  console.log('Server started to listen on port : ' + SERVER_PORT);
});

server.on('close', () => {
  deleted_uploaded_files();
});

var delete_existing_dir_files(path) {
  if(fs.existsSync(path))
    delete_dir_files(path);
};

var deleted_uploaded_files = function() {
  delete_existing_dir_files(INVALID_UPLOAD_DIR);
  delete_existing_dir_files(VALID_UPLOAD_DIR);
};

var delete_dir_files = function(dir) {
  fs.readdir(dir, (err, files) => {
    for(var n = 0; n < files.length; n++) {
      fs.unlink(dir + '/' + files[n]);
      console.log('Deleted ' + files[n] + ' !');
    }
  });
};

var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    if(file.mimetype === 'audio/midi') {
      callback(null, VALID_UPLOAD_DIR);
      app.emit('event:file_uploaded', file);
      receivedFiles.push(file);
    }
    else {
      callback(null, INVALID_UPLOAD_DIR);
    }
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  }
});

var upload = multer({ storage : storage}).single('musicUpload');

var sendFile = function(res, path, type) {
  fs.readFile('.' + path, 'utf-8', (error, content) => {
			res.writeHead(200, {"Content-Type": type});
			res.end(content);
	});
};

//Sending the files with express here
app.get('/', (req, res) => {
	sendFile(res, '/MIDIPlayer.html', 'text/html');
})
.get('/socket.io/socket.io.js', (req,res) => {
	sendFile(res, '/node_modules/socket.io-client/dist/socket.io.js', "text/javascript");
})
.get('/css/:filename', (req,res) => {
	sendFile(res, '/css/' + req.params.filename, "text/css")
})
.post("/api/music", (req,res) => {
    upload(req,res,function(err) {
        if(err) return res.status(500).end("Error uploading file.");
        res.redirect('back');
    });
})
.use((req, res, next) => {
	var path = url.parse(req.url).pathname;
	var type = mime.lookup(path);
	sendFile(res, path, type);
})

var delete_all_files_from_address = function(ip_address) {
  var indices_to_slice = [];
  for(var c = 0; c < file_remote_address_mapping.length; c++)
    if(file_remote_address_mapping[c].remote_address === ip_address)
      indices_to_slice.push(c);

  if(indices_to_slice.length === 0)
    return false;

  for(var a = indices_to_slice.length - 1; a >= 0; a--)
    file_remote_address_mapping.slice(indices_to_slice[a], 1);

  return true;
};

var mapping_contains = function(filename, socketAddress) {
  for(var c = 0; c < file_remote_address_mapping.length; c++)
    if(file_remote_address_mapping.remoteAddress === socketAddress && filename === file_remote_address_mapping.filename)
      return c;
  return -1;
};

io.sockets.on('connection', (socket) => {
  console.log('New connection at : ' + socket.handshake.address);

  socket.on('clientException', (error) => {
  	console.log(error.desc);
  });

  socket.on('new-upload', (file) => { //here the user selected a file but did not submit
    file_remote_address_mapping.push({
      remote_address: socket.request.connection.remoteAddress,
      filename: file.name
    });
  });

  app.on('event:file_uploaded', (file) => { //here the user finished uploading his file to the server
    console.log(JSON.stringify(file, undefined, 2));
    if(mapping_contains(file.originalname, socket.handsake.address)) {
        //var content =
        //scoket.emit('file-parsed', {parsed-notes: , timeline})
    }
  });

  socket.on('disconnect', () => {
    delete_all_files_from_address(socket.request.connection.remoteAddress);
  });
});
