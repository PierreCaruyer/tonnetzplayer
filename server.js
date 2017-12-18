const fs = require('fs')
const app = require('express')()
const url = require('url')
const server = require('http').createServer(app)
const io = require('socket.io').listen(server)
const API_MUSIC = '/uploads/music/' //Must match the action field of the client's form
const VALID_UPLOAD_DIR = './uploads/'
const PUBLIC_DIRECTORY = './public/'
const UPLOAD_FIELDNAME = 'music-upload' //Must match with name field of the file input in the client's form

var songs = {}
server.listen(3000, () => poke(VALID_UPLOAD_DIR))

const poke = dir => fs.access(dir, fs.F_OK, err => { if(err) fs.mkdir(dir) })
const delete_dir_files = dir =>
  fs.readdir(dir, (err, files) =>
   files.forEach(file => fs.unlink(dir + file)))

const upload = require('multer')({
  dest: VALID_UPLOAD_DIR,
  limits: { fieldNameSize: 999999999, fieldSize: 999999999 },
  includeEmptyFields: true,
  inMemory: true,
}).single(UPLOAD_FIELDNAME)

app.post(API_MUSIC, (req,res) => {
  poke(VALID_UPLOAD_DIR)
  upload(req, res, err => {
    if(err || !req.file) return res.status(500).end("Error occured while uploading file")
    fs.rename(req.file.destination + req.file.filename, req.file.destination + req.file.originalname)
    songs[req.connection.remoteAddress] = { dir: VALID_UPLOAD_DIR, name: req.file.originalname }
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
  const address = socket.request.connection.remoteAddress
  console.log('New connection at : ' + address)
  socket.on('clientException', error => { console.log('Client at ' + address + 'just got the following error' + error.desc) })
  socket.on('disconnect', message => { console.log('Goodbye ' + address) })

  if(!songs[address]) return //if this client has not uploaded a song
  fs.access(songs[address].dir + songs[address].name, fs.F_OK, () => loadMidiFileContent(socket, songs[address].dir, songs[address].name))
  delete songs[address]
})
