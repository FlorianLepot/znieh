var app = require('express')(),
    socketio = require('socket.io'),
    ent = require('ent');

var user = require('./model/user');

var id = 0;
var users = [];
var match = [];
var waiting = "";


io = socketio.listen('1337');

console.log("Server Started");

io.sockets.on('connection', function (socket, pseudo) {
    socket.on('nouveau_client', function(pseudo) {
        pseudo = ent.encode(pseudo);
        var p = new user(id, pseudo, socket);
    	users[id] = p;
    	socket.id = id;
        console.log("New Connection = id: " + id + " pseudo: " + pseudo);
        id++;
    });

    socket.on('matchMe', function () {
    		console.log("Joueur " + socket.id + " recherche une partie");
    		console.log("Waiting = " + waiting);
            if(waiting === ""){
                waiting = socket.id;
            }
            else{
                match.push({id1:waiting,id2:socket.id});
                console.log("MatchCréé");
                users[waiting].socket.emit('matchFound');
                socket.emit('matchFound');
                waiting = "";
            }

    });
});
