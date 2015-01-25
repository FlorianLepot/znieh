'use strict';

var Game = require('./../model/game');
var UserStorage = require('./../storage/user.storage.js');
var GameStorage = require('./../storage/game.storage.js');
var UserManager = require('./../services/user.manager.js');
var GameManager = require('./../services/game.manager.js');
var Placement = require('./../services/placement.js');
var Pathfinder = require('./../services/pathfinder.js');

var Map = require('./../model/map');
var MapManager = require('./../services/map.manager.js');
var MapData = require('./../../client/app/json/map.json');

function GameCtrl() {

  var map = MapManager.create(MapData);
  Pathfinder.init(map);
  var games = [];

  this.add = function (socketA, socketB) {
    var playerA = UserStorage.findBySocket(socketA);
    var playerB = UserStorage.findBySocket(socketB);

    if (playerA == null || playerB == null) {
      console.log('impossible de créer la partie'.red);
      return false;
    }

    UserManager.reloadTeam(playerA);
    UserManager.reloadTeam(playerB);
    GameStorage.add(new Game(playerA, playerB, map));
    return true;
  }

  this.placementDone = function(socket, positions) {
    var game = GameStorage.findBySocket(socket);
    var player = UserStorage.findBySocket(socket);
    console.log('placement done'.blue, player.username);

    if (game.ready.length == 0) {
      GameManager.init(game);
    }

    game.ready.push(player);
    Placement.update(game, positions);

    if (game.ready.length === 2) {
        game.playerA.socket.emit('match ready', game.units);
        game.playerB.socket.emit('match ready', game.units);
    }
  }

  this.moveUnit = function(socket, unitId, to) {
    var game = GameStorage.findBySocket(socket);
    var player = UserStorage.findBySocket(socket);
    console.log('move unit'.blue, player.username);

    var unit = game.findUnitById(unitId);
    var additionalPoints = [];
    for (var i = 0; i < game.units.length; i++) {
      if (game.units[i].id != unit.id) {
          additionalPoints.push({'x': game.units[i].x, 'y': game.units[i].y});
      }
    };

    Pathfinder.addAdditionalPoints(additionalPoints);
    Pathfinder.findPathTo({'x': unit.x, 'y': unit.y }, to, function(path) {
        if (path === null) {
          console.log('move impossible'.red);
          return;
        }
        path.shift(); // remove start position
        console.log('path'.green, path);
        if (path.length < unit.moves) {
          var data = {
            'unit': unit.id,
            'path': path
          }
          unit.x = to.x;
          unit.y = to.y;
          game.playerA.socket.emit('unit moved', data);
          game.playerB.socket.emit('unit moved', data);
          return;
        }
        console.log('move too long'.red)
    });
    Pathfinder.stopAvoidingAllAdditionalPoints();
  }

  this.attack = function(socket, attackerId, defenderId) {
    var game = GameStorage.findBySocket(socket);
    var player = UserStorage.findBySocket(socket);
    console.log('attack unit'.blue, player.username);

    var attacker = game.findUnitById(attackerId);
    var defender = game.findUnitById(defenderId);

    defender.life -= 10;

    var data = {
      'attacker': attacker,
      'defender': defender,
      'dammage': 10
    };

    game.playerA.socket.emit('unit attacked', data);
    game.playerB.socket.emit('unit attacked', data);
  }

  this.remove = function (game) {
    var gameIndex = GameStorage.games.indexOf(game);

    if (GameStorage.games[gameIndex] !== undefined) {
      GameStorage.games.splice(gameIndex, 1);
    }
  }

}

module.exports = new GameCtrl();
