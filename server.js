const fs = require('fs')
const url = require('url')
const multer = require('multer')
const app = require('express')()
const UPLOAD_DIR = './uploads/'
const UPLOAD_FIELDNAME = 'music-upload' //Must match with name field of the file input in the client's form
const server = require('http').createServer(app)
const io = require('socket.io').listen(server)
var songs = {}
server.listen(3000, () => fs.exists(UPLOAD_DIR, exists => { if(!exists) fs.mkdir(UPLOAD_DIR) }))
const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, UPLOAD_DIR),
  filename: (req, file, callback) => {
    songs[req.connection.remoteAddress] = { dir: UPLOAD_DIR, name: file.originalname }
    callback(null, file.originalname)
  }
})
const upload = multer({storage: storage}).single(UPLOAD_FIELDNAME)

app.post('/uploads/music/', (req,res) => {
  fs.access(UPLOAD_DIR, fs.F_OK, err => { if(err) fs.mkdir(UPLOAD_DIR) })
  upload(req, res, err => res.redirect('back')) //Here the client's page refreshes after the upload is done
}).use((req, res, next) => {
  let options = {
    root: './public/',
    dotfiles: 'deny',
    headers: { 'x-timestamp': Date.now(), 'x-sent': true }
  }
  res.sendFile(url.parse(req.url).pathname, options, err => next(err))
})

const readFileAsync = (path, socket) => new Promise((resolve, reject) =>
  fs.readFile(path, (err, content) =>
    err ? reject(err) : resolve({file: path, endpoint: socket, data: content})
))

const extractMidiData = args => new Promise(resolve =>
  resolve({name: args.file, socket: args.endpoint, midi: new Array(args.data.length)
    .fill(undefined)
    .map((value, index) => args.data[index])
    .map(value => String.fromCharCode(value & 255))
    .join('')
  }))

const sendMidiData = args => new Promise(resolve => {
  args.socket.emit('file-parsed', {midi: args.midi, name: args.name})
  resolve(args)
})

const cleanupMidiData = args => new Promise(() => {
  fs.unlink(args.name)
  delete songs[args.socket.request.connection.remoteAddress]
})

const loadMidiFileContent = (socket, dir, file) => {
  console.log('Starting to load ' + file + '\'s midi content')
  readFileAsync(dir + file, socket)
    .then(extractMidiData, console.error)
    .then(sendMidiData, console.error)
    .then(cleanupMidiData)
    .catch(console.error)
}

io.sockets.on('connection', socket => {
  const address = socket.request.connection.remoteAddress
  console.log('New connection at : ' + address)
  socket.on('clientException', error => console.log('Client at ' + address + 'just got the following error' + error.desc))
  socket.on('disconnect', message => console.log('Goodbye ' + address))
  if(songs[address])
    fs.access(songs[address].dir + songs[address].name, fs.F_OK, () =>
      loadMidiFileContent(socket, songs[address].dir, songs[address].name))
})
