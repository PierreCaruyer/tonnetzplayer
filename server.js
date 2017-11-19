var http = require('http')
var fs = require('fs')
var app = require('express')()
var url = require('url')
var multer = require('multer')
var io = require('socket.io').listen(server)

const ONE_MINUTE = 60000
const SERVER_PORT = 3000
const API_MUSIC = '/uploads/music/' //Must match with the action field of the client's form
const VALID_UPLOAD_DIR = './uploads'
const PUBLIC_DIRECTORY = './public/'
const UPLOAD_FIELDNAME = 'music-upload' //Must match with the name field of the file input in the client's form

var completed_uploads = {}
const server = http.createServer(app)

server.listen(SERVER_PORT, () => poke(VALID_UPLOAD_DIR))
server.on('close', () => delete_dir_files(VALID_UPLOAD_DIR)) //deleting uploaded files to clear a bit space

const delete_dir_files = dir =>
  fs.readdir(dir, (err, files) =>
    files.forEach(file => fs.unlink(dir + '/' + file)))

const poke = dir => fs.access(dir, fs.F_OK, err => { if(err) fs.mkdir(dir) })

const upload = multer({
  dest: VALID_UPLOAD_DIR,
  limits: { fieldNameSize: 999999999, fieldSize: 999999999 },
  includeEmptyFields: true,
  inMemory: true,
}).single(UPLOAD_FIELDNAME)

const restore_filename = file => 
  fs.rename(file.destination + '/' + file.filename, file.destination + '/' + file.originalname)

app.post(API_MUSIC, (req,res) => {
  poke(VALID_UPLOAD_DIR)
  upload(req, res, err => {
    if(err) return res.status(500).end("Error occured while uploading file")
    if(req.file) {
      restore_filename(req.file)
      completed_uploads[req.connection.remoteAddress] = { dir: VALID_UPLOAD_DIR, name: req.file.originalname }
      app.emit('upload-completed', req.file)
    }
    res.redirect('back') //Here the client's page refreshes after the upload is done
  })
})
.use((req, res, next) => { //default
  var options = {
    root: PUBLIC_DIRECTORY,
    dotfiles: 'deny',
    headers: { 'x-timestamp': Date.now(), 'x-sent': true }
  }
  res.sendFile(url.parse(req.url).pathname, options, err => next(err))
})

const loadMidiFileContent = (socket, dir, file) => {
  console.log('Starting to load ' + file + '\'s midi content')
  fs.readFile(dir + file, (err, content) => {
    if(err) return
    var array = []
    for(var i = 0; i < content.length; i++)
      array.push(String.fromCharCode(content[i] & 255))
    socket.emit('file-parsed', {midi: array.join(''), name: file}) //Sending the data to the client
    fs.unlink(dir + file) //deleting the uploaded file to free up some space on the server's hard disk
  })
}

io.sockets.on('connection', socket => {
  const socket_address = socket.request.connection.remoteAddress
  console.log('New connection at : ' + socket_address)

  /**
   * Right after a new socket connects to the server, the socket address is checked, if it is found in completed_uploads,
   * it means the client is reconnecting to the server (because of the web browser refreshing after the POST request)
   * after having uploaded his file to the server.
   * The content of the file is then computed in order to be sent as a string containing the midi data.
  **/
  if(!completed_uploads[socket_address]) return
  const dir = completed_uploads[socket_address].dir + '/', file = completed_uploads[socket_address].name

  fs.access(dir + file, fs.F_OK, () => loadMidiFileContent(socket, dir, file))
  delete completed_uploads[socket_address] //one-time-usage strcuture

  socket.on('clientException', error => { console.log('Client ' + error.desc) })
  socket.on('disconnect', message => { console.log('Goodbye ' + socket_address) })
})
