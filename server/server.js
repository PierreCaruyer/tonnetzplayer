var http = require('http');
var fs = require('fs');
var express = require('express');
var url = require('url');
var mime = require('mime');
var multer = require('multer');

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

const ONE_MINUTE = 60000;
const SERVER_PORT = 8080;
const API_MUSIC = '/uploads/music/';
const VALID_UPLOAD_DIR = './uploads';
const INVALID_UPLOAD_DIR = './invalid-uploads';
const UPLOAD_FIELDNAME = 'music-upload';
var pending_uploads = {},
    completed_uploads = {};

server.listen(SERVER_PORT, () => {
  console.log('Server started to listen on port : ' + SERVER_PORT);
});

server.on('close', () => {
  deleted_uploaded_files();
  console.log('Shutting down server');
});

var delete_existing_dir_files = function(path) {
  if(fs.existsSync(path))
    delete_dir_files(path);
};

var delete_uploaded_files = function() {
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

var upload = multer({
  dest: VALID_UPLOAD_DIR,
  limits: {
    fieldNameSize: 999999999,
    fieldSize: 999999999
  },
  includeEmptyFields: true,
  inMemory: true,
}).single(UPLOAD_FIELDNAME);

var sendFile = function(res, path, type) {
  fs.readFile('./client' + path, 'utf-8', (error, content) => {
			res.writeHead(200, {"Content-Type": type});
			res.end(content);
	});
};

var restore_filename = function(file) {
  var dest = file.destination,
      correct_name = file.originalname,
      base_name = file.filename,
      upload_dest = '';
  upload_dest = (file.mimetype === 'audio/midi') ? dest : INVALID_UPLOAD_DIR;
  fs.rename(dest + '/' + base_name, upload_dest + '/' + correct_name);
};

//Sending the .css, .js ... files with express here
app.get('/', (req, res) => {
	sendFile(res, '/MIDIPlayer.html', 'text/html');
})
.post(API_MUSIC, (req,res) => {
    upload(req,res,function(err) {
      if(err) {
        return res.status(500).end("Error occured while uploading file");
      } else if(req.file) {
        restore_filename(req.file);
        app.emit('upload-completed', req.file);
      }
      //Here the client's page refreshes after the upload is done
      res.redirect('back');
    });
})
.use((req, res, next) => { //default
	var path = url.parse(req.url).pathname;
	var type = mime.lookup(path);
	sendFile(res, path, type);
})

var loadMidiFileContent = function(socket, file) {
  console.log('Starting to load ' + file + '\'s midi content');
  fs.readFile(file, (err, content) => {
    var arraybuffer = [];
    for(var c = 0; c < content.length; c++) {
      arraybuffer[c] = String.fromCharCode(content[c] & 255);
    }
    var data = arraybuffer.join('');
    console.log(data);
    socket.emit('file-parsed', data);
  });
};

/*
** Here the name of the file is retrieved and is deleted from the pending uploads queue
** This file name will then be used as soon as the client's page is refreshed
** Once the client page is refreshed the midi data will be computed and sent to the client
*/
app.on('upload-completed', (file) => {
  console.log('Finished uploading : ' + file.originalname);
  var socket_address = pending_uploads[file.originalname];
  completed_uploads[socket_address] = {dir: VALID_UPLOAD_DIR, name: file.originalname};
  delete pending_uploads[file.originalname];
});

io.sockets.on('connection', (socket) => {
  var socket_address = socket.request.connection.remoteAddress;

  console.log('New connection at : ' + socket_address);
  /**
  ** Here, we check for a file that would have been uploaded from the same address
  ** as the socket that has just connected to the server
  */
  if(completed_uploads[socket_address]) {
    var dir = completed_uploads[socket_address].dir;
    var file = completed_uploads[socket_address].name;
    loadMidiFileContent(socket, dir + '/' + file);
    fs.unlink(dir + '/' + file);
  }

  socket.on('clientException', (error) => {
  	console.log(error.desc);
  });

  //A client has selected a
  socket.on('midi-upload', (file) => { //here the user selected a file but did not submit
    if(file.type !== 'audio/midi') {
      socket.emit('wrong-file-type', { err: 'The ' + file.type + ' file type is not supported', exp: 'Expected file type was : audio/midi file' });
      return;
    }
    console.log('New pending upload : ' + file.name);
    pending_uploads[file.name] = socket.request.connection.remoteAddress;
    setTimeout(() => {
      if(pending_uploads[file.name]) delete pending_uploads[file.name];
    }, ONE_MINUTE); //The upload will stay in a pending state for 60 seconds
  });

  socket.on('disconnect', (message) => {
    console.log('Goodbye ' + socket_address);
  });
});
