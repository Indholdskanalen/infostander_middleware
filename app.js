#!/usr/bin/env node

/**
 * @file
 * First attempt on creating a proxy with socket.io.
 */

// Setup the basic variables need to create the server
var path = require('path');
var express = require('express');
var https = require('https');
var fs = require('fs');
var config = require('nconf');

// Load configuration.
config.file({ file: 'config.json' });

// Certificate settings.
var options = {
  key: fs.readFileSync(config.get('ssl').key),
  cert: fs.readFileSync(config.get('ssl').cert),
  //ca: fs.readFileSync('./etc/ssl/ebscerts/bundle.crt')
};

// Basic app setup.
var app = express();
var server = https.createServer(options, app);
var sio = require('socket.io').listen(server);

// Token based auth.
var socketio_jwt = require('socketio-jwt');
var jwt = require('jsonwebtoken');
var jwt_secret = config.get('secret');

// Set socket.io client configuration.
if (config.get('debug') === false) {
  sio.enable('browser client minification');
  sio.enable('browser client etag');
  sio.enable('browser client gzip');
}

// Set socket.io log level (in production it should be 1).
sio.set('log level', config.get('log_level'));

// Set express app configuration.
app.set('port', config.get('port'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.use(express.favicon());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

// Log express requests.
if (config.get('debug')) {
  app.use(express.logger('dev'));
};

// Start the server.
server.listen(app.get('port'), function(){
  if (config.get('debug')) {
    console.log('Express server with socket.io is listening on port ' + app.get('port'));
  }
});

// Connect to redis server.
var redis = require("redis");
var rconf = config.get('redis')
global.redisClient = redis.createClient(rconf.port, rconf.host, { 'auth_pass': rconf.auth });
redisClient.on("error", function (err) {
  console.log(err);
});
redisClient.on("connect", function (err) {
  if (config.get('debug')) {
    console.log('Connected to redis server at: ' + rconf.host);
  }
});


// Ensure that the JWT is used to authenticate socket.io connections.
sio.configure(function (){
  sio.set('authorization', socketio_jwt.authorize({
    secret: jwt_secret,
  	handshake: true
  }))
});


/************************************
 * Load application objects
 **************************/
var rooms = [];
var Screen = require('./lib/screen');

/************************************
 * Socket events
 ***************/
sio.on('connection', function(socket) {
  console.log(socket.id);

  socket.on('ready', function(data) {
    // Create new screen object.
    var instance = new Screen(data.token);
    instance.load();

    // Store socket id.
    instance.set('socket', socket.id);
    
    // Attach to room.

  });

  // Test event.
  socket.on('ping', function (data) {
    socket.emit('pong', {});
  });
});

/************************************
 * Application routes
 ********************/
var routes = require('./routes/local');

app.get('/', routes.index);

app.post('/login', function(req, res) {
	routes.login(req, res, jwt, jwt_secret);
});

/************************************
 * Backend API
 *************/
var routes_backend = require('./routes/backend');

app.post('/pushScreens', routes_backend.pushScreens);

/************************************
 * Client API
 ************/
var routes_frontend = require('./routes/frontend');

app.post('/activate', function(req, res) {
  routes_frontend.activate(req, res, jwt, jwt_secret);
});
