#!/usr/bin/env node

/**
 * @file
 * This is the main application that uses architect to build the application
 * base on plugins.
 */

var path = require('path');
var architect = require("architect");

// Load config file.
var configs = require(__dirname + '/config.json');

// Configure the plugins.
var config = [
  {
    "packagePath": "./plugins/logger",
    "filename": configs.log.file,
    "debug": configs.log.debug
  },
  {
    "packagePath": "./plugins/server",
    "port": configs.port,
    "path": path.join(__dirname, 'public')
  },
  {
    "packagePath": "./plugins/cache",
    "config": configs.cache
  },
  {
    "packagePath": "./plugins/apikeys",
    "file": __dirname + '/' + configs.apikeys
  },
  {
    "packagePath": "./plugins/socket"
  },
  {
    "packagePath": "./plugins/auth",
    "secret": configs.secret,
    "admin": configs.admin
  },
  {
    "packagePath": "./plugins/api"
  }
];

// User the configuration to start the application.
config = architect.resolveConfig(config, __dirname);
architect.createApp(config, function (err, app) {
  "use strict";

  if (err) {
    throw err;
  }
});
