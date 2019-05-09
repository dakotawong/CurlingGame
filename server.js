/*
 Author: Shaun Moini 2019

 Server-side code for application.

 Based on javascript and node.js, and
 also makes use of the scoket.io module
 to enable real-time collaboration.

 All data exchanges are done as JSON strings.
*/

//Server Code

const app = require('http').createServer(handler)
const io = require('socket.io')(app) //wrap server app in socket io capability
const fs = require('fs') //file system to server static files
const url = require('url'); //to parse url strings

const PORT = process.env.PORT || 3000 //useful if you want to specify port through environment variable
app.listen(PORT) //start server listening on PORT

let currentStones = []      //stores the current layout of stones of an ongoing game (to be shared with clients)
let currentQueue = []  //stores the current state of the updateShootingQueue (to be shared with clients)

let spectators = [] //array of spectators
let players = []  //array of players (size of 2 max)

const ROOT_DIR = "html" //dir to serve static files from

const MIME_TYPES = {
  css: "text/css",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript", //should really be application/javascript
  json: "application/json",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain"
}

function get_mime(filename) {
  //Get MIME type based on extension of requested file name
  for (let ext in MIME_TYPES) {
    if (filename.indexOf(ext, filename.length - ext.length) !== -1) {
      return MIME_TYPES[ext]
    }
  }
  return MIME_TYPES["txt"]
}


  function handler(request, response){
    let urlObj = url.parse(request.url, true, false)
    console.log("\n============================")
    console.log("PATHNAME: " + urlObj.pathname)
    console.log("REQUEST: " + ROOT_DIR + urlObj.pathname)
    console.log("METHOD: " + request.method)

    let receivedData = ""
    let dataObj = null
    let returnObj = null

    //attached event handlers to collect the message data
    request.on("data", function(chunk) {
      receivedData += chunk
    })

    //event handler for the end of the message
    request.on("end", function() {

      //If it is a POST request then we will check the data.
      //POST not required when using sockets
      if (request.method == "POST") {}

      else if (request.method == "GET") {
        //handle GET requests as static file requests
        var filePath = ROOT_DIR + urlObj.pathname
        if (urlObj.pathname === "/") filePath = ROOT_DIR + "/index.html"

        fs.readFile(filePath, function(err, data) {
          if (err) {
            //report error to console
            console.log("ERROR: " + JSON.stringify(err))
            //respond with not found 404 to client
            response.writeHead(404)
            response.end(JSON.stringify(err))
            return
          }
          response.writeHead(200, {
            "Content-Type": get_mime(filePath)
          })
          response.end(data)
        })
      }
    })
  }

  io.on('connection', function(socket){

    //syncing registration buttons across clients
    if(players.length > 0){
      if(players[0] != null){
        if(players[0].name == 'home'){
          io.emit('joinHome')
        }
        else {io.emit('joinVisitor')}
      }
      if(players [1] != null){
        if(players[1].name == 'home'){
          io.emit('joinHome')
        }
        else {io.emit('joinVisitor')}
      }
    }

    //stores data of client that clicked on join as home in players array
    socket.on('joinHome', function(){
      if(players.length == 2) { gameFull = true }
      else{
        let client = {name: 'home', id: socket.id, turn: true}
        players.push(client)
      }
      io.emit('joinHome')
    })

    //stores data of client that clicked on join as visitor in players array
    socket.on('joinVisitor', function(){
      if(players.length == 2) { gameFull = true }
      else{
        let client = {name: 'visitor', id: socket.id, turn: false}
        players.push(client)
      }
      io.emit('joinVisitor')
    })

    //stores data of client that clicked on join as spectator in spectators array
    socket.on('joinSpectator', function(){
      spectators.push(socket.id)
      io.emit('joinSpectator')
    })

    //stores stones in currentstones array and updates registerd clients with the stones
    socket.on('updateAllStones', function(data){
      currentStones = []
      let allStones = JSON.parse(data)
      for(let x = 0; x < allStones.length; x++){
        currentStones.push(allStones[x])
      }
      for(let x = 0; x < players.length; x++){
        io.to(players[x].id).emit('updateAllStones', JSON.stringify(currentStones))
      }
      for(let x = 0; x < spectators.length; x++){
        io.to(spectators[x]).emit('updateAllStones', JSON.stringify(currentStones))
      }
    })
    //stores shootingqueue in currentqueue array and updates registerd clients with the collisions
    socket.on('updateShootingQueue', function(data){
      currentQueue = []
      let shootingQueue = JSON.parse(data)
      for(let x = 0; x < shootingQueue.length; x++){
        currentQueue.push(shootingQueue[x])
      }
      for(let x = 0; x < players.length; x++){
        io.to(players[x].id).emit('updateShootingQueue', JSON.stringify(currentQueue))
      }
      for(let x = 0; x < spectators.length; x++){
        io.to(spectators[x]).emit('updateShootingQueue', JSON.stringify(currentQueue))
      }
    })

})

console.log("Server Running at PORT 3000  CNTL-C to quit")
console.log("To Test")
console.log("http://localhost:3000/curling.html")
