var http = require('http');
var fs = require('fs');
var express = require('express');
var url = require('url');
var mime = require('mime');
var multer = require('multer');
var loader = require('./midi/file-loader.js')
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var router = express.Router();

const SERVER_PORT = 8080;
const API_MUSIC = '/uploads/music/';
const VALID_UPLOAD_DIR = './uploads';
const INVALID_UPLOAD_DIR = './invalid-uploads';
const UPLOAD_FIELDNAME = 'music-upload';
var pending_uploads = {},
    completed_uploads = {},
    sockets_by_address = {};

server.listen(SERVER_PORT, () => {
  console.log('Server started to listen on port : ' + SERVER_PORT);
});

server.on('close', () => {
  deleted_uploaded_files();
});

var delete_existing_dir_files = function(path) {
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

/*var storage = multer.diskStorage({
  destination: function (req, file, directoryRedirect) {
    if(file.mimetype === 'audio/midi') {
      directoryRedirect(null, VALID_UPLOAD_DIR);
    } else {
      directoryRedirect(null, INVALID_UPLOAD_DIR);
    }
  },
  filename: function (req, file, rename) {
    rename(null, file.originalname);
  }
});

var upload = multer({ storage : storage }).single('music-upload');*/

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
      res.redirect('back');
    });
})
.use((req, res, next) => { //default
	var path = url.parse(req.url).pathname;
	var type = mime.lookup(path);
	sendFile(res, path, type);
})

var delete_all_files_from_address = function(ip_address) {
  var indices_to_slice = [];
  for(var c = 0; c < pending_uploads.length; c++)
    if(pending_uploads[c].remote_address === ip_address)
      indices_to_slice.push(c);

  if(indices_to_slice.length === 0)
    return false;

  for(var a = indices_to_slice.length - 1; a >= 0; a--)
    pending_uploads.slice(indices_to_slice[a], 1);

  return true;
};

app.on('upload-completed', (file) => {
  console.log('Finished uploading : ' + file.originalname);
  var socket_address = pending_uploads[file.originalname];
  var socket = sockets_by_address[socket_address];
  var midiContent = loader.loadMidiFileContent(socket, VALID_UPLOAD_DIR + '/' + file.originalname);
});

io.sockets.on('connection', (socket) => {
  var socket_address = socket.request.connection.remoteAddress;
  sockets_by_address[socket_address] = socket;
  console.log('New connection at : ' + socket_address);

  socket.on('clientException', (error) => {
  	console.log(error.desc);
  });

  socket.on('new-upload', (file) => { //here the user selected a file but did not submit
    console.log('New pending upload : ' + file.name);
    pending_uploads[file.name] = socket.request.connection.remoteAddress;
    app.route(API_MUSIC).post(loader.startUpload(upload, socket, file.name));
  });

  socket.on('disconnect', (message) => {
    console.log('Goodbye ' + socket_address);
    delete sockets_by_address[socket_address];
  });
});
