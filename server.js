var http = require('http')
var fs = require('fs')
var app = require('express')()
var url = require('url')
var multer = require('multer')

var server = http.createServer(app)
var io = require('socket.io').listen(server)

const ONE_MINUTE = 60000
const SERVER_PORT = 3000
const API_MUSIC = '/uploads/music/' //Must match with the action field of the client's form
const VALID_UPLOAD_DIR = './uploads'
const INVALID_UPLOAD_DIR = './invalid-uploads'
const PUBLIC_DIRECTORY = './public/'
const UPLOAD_FIELDNAME = 'music-upload' //Must match with the name field of the file input in the client's form

var pending_uploads = {},
    completed_uploads = {}

server.listen(SERVER_PORT, () => {
  console.log('Server started to listen on port : ' + SERVER_PORT)
  poke_upload_dirs()
})

server.on('close', () => {
  deleted_uploaded_files() //deleting uploaded files to clear a bit space
  console.log('Shutting down server')
})

var delete_existing_dir_files = (path) => {
  fs.access(path, fs.F_OK, err => {
    if(!err) delete_dir_files(path)
  })
}

var delete_uploaded_files = () => {
  delete_existing_dir_files(INVALID_UPLOAD_DIR)
  delete_existing_dir_files(VALID_UPLOAD_DIR)
}

var delete_dir_files = dir => {
  fs.readdir(dir, (err, files) => {
    if(err) fs.mkdir(dir)
    files.forEach(file => fs.unlink(dir + '/' + file))
  })
}

var upload = multer({
  dest: VALID_UPLOAD_DIR,
  limits: {
    fieldNameSize: 999999999,
    fieldSize: 999999999
  },
  includeEmptyFields: true,
  inMemory: true,
}).single(UPLOAD_FIELDNAME)

var restore_filename = file => {
  var dest = file.destination,
      correct_name = file.originalname,
      base_name = file.filename,
      upload_dest = ''
  poke_dir(INVALID_UPLOAD_DIR)
  poke_dir(VALID_UPLOAD_DIR)
  upload_dest = (file.mimetype === 'audio/midi') ? dest : INVALID_UPLOAD_DIR
  fs.rename(dest + '/' + base_name, upload_dest + '/' + correct_name)
}

var poke_dir = dir => {
  fs.access(dir, fs.F_OK, err => {
    if(err) fs.mkdir(dir)
  })
}

var poke_upload_dirs = () => {
  poke_dir(VALID_UPLOAD_DIR)
  poke_dir(INVALID_UPLOAD_DIR)
}

//ROUTING
app.post(API_MUSIC, (req,res) => {
  poke_upload_dirs()
  upload(req,res, err => {
    if(err)
      return res.status(500).end("Error occured while uploading file")
    if(req.file) {
      /**
       * The file is uploaded with a randomized name by the multer
       * Here we give it back its true name so that it is easier to find it back when needed
       **/
      restore_filename(req.file)
      app.emit('upload-completed', req.file)
    }
    //Here the client's page refreshes after the upload is done
    res.redirect('back')
  })
})
.use((req, res, next) => { //default
  var options = {
    root: PUBLIC_DIRECTORY,
    dotfiles: 'deny',
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true
    }
  }
  res.sendFile(url.parse(req.url).pathname, options, err => {
    if(err) next(err)
  })
})
//END ROUTING

var loadMidiFileContent = (socket, dir, file) => {
  console.log('Starting to load ' + file + '\'s midi content')
  fs.readFile(dir + file, (err, content) => {
    if(err) return
    var data = content.map(elem => String.fromCharCode(elem & 255)).join('')
    socket.emit('file-parsed', {midi: data, name: file})
  })
}

/*
** Here the name of the file is retrieved and is deleted from the pending uploads queue
** This file name will then be used as soon as the client's page is refreshed
** Once the client page is refreshed the midi data will be computed and sent to the client
*/
app.on('upload-completed', file => {
  console.log('Finished uploading : ' + file.originalname)
  var socket_address = pending_uploads[file.originalname]
  completed_uploads[socket_address] = {dir: VALID_UPLOAD_DIR, name: file.originalname}
  delete pending_uploads[file.originalname]
})

//HANDLING SOCKET COMMUNICATION FROM HERE
io.sockets.on('connection', socket => {
  var socket_address = socket.request.connection.remoteAddress
  console.log('New connection at : ' + socket_address)

  /**
   * Right after a new socket connects to the server, the socket address is checked,
   * if it is found in the completed_uploads register, it means the client is reconnecting
   * to the server (because of the web browser refreshing after the POST request) after having uploaded its file to the server.
   * The content of the file is then computed to be sent as a string containing the midi data.
  **/
  if(completed_uploads[socket_address]) {
    var dir = completed_uploads[socket_address].dir
    var file = completed_uploads[socket_address].name
    
    fs.access(dir, fs.F_OK, err => {
      if(err) fs.mkdir(dir)
      fs.access(dir + '/' + file, fs.R_OK | fs.W_OK | fs.F_OK, err => {
        if(err) {
          console.log('could not find ' + dir + '/' + file)
          return
        }
        loadMidiFileContent(socket, dir + '/', file)
        fs.unlink(dir + '/' + file) //deleting the uploaded file to free up some space on the server's hard disk
      })
    })
    /**
     * The completed_uploads structure contains one-time-usage strcutures
     * once it's been used, it is deleted.
     */
    delete completed_uploads[socket_address]
  }

  socket.on('midi-upload', (file) => { //here the user selected a file but did not submit yet
    if(file.type !== 'audio/midi') {
      var error_message = 'The ' + file.type + ' file type is not supported',
          expected_message = 'Expected file type was : audio/midi file'
      socket.emit('wrong-file-type', {err: error_message, exp: expected_message})
      return
    }
    console.log('New pending upload : ' + file.name)
    poke_upload_dirs()
    pending_uploads[file.name] = socket.request.connection.remoteAddress
    setTimeout(() => {
      if(!pending_uploads[file.name]) return
        delete pending_uploads[file.name]
        socket.emit('pending-upload-deleted', 'You were iddle for too long, your upload got deleted, please retry')
    }, 20 * ONE_MINUTE) //The upload will stay in a pending state for 20 minutes
  })                    //to prevent keeping the uploaded information in memory for too long.

  socket.on('clientException', error => {
  	console.log('Client ' +  + error.desc)
  })

  socket.on('disconnect', message => {
    console.log('Goodbye ' + socket_address)
  })
})
