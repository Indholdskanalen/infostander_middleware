/**
 * @file
 * Used to keep track of screen connections and tokens to identify screens.
 */
var util = require('util');
var eventEmitter = require('events').EventEmitter;

/**
 * Screen object as the module pattern.
 */
var Screen = (function() {

  /**
   * Define the screen object.
   *
   * @param string token
   *   The authentication token, which is used to identify the screen.
   */
  var Screen = function(token) {
    this.id = undefined;
    this.name = undefined;
    this.groups = [];

    this.token = token;
    this.socket = undefined;

    this.redis = global.redisClient;
  }

  // Extend the object with event emitter.
  util.inherits(Screen, eventEmitter);

  /**
   * Load screen configuration from redis based the object token.
   */
  Screen.prototype.load = function load() {
    var self = this;

    // Check if screen exists in redis (token).
    self.redis.hget('screen:lookup:token', self.token, function(err, res) {
      if (err) {
        throw new Error('Redis encounted an error');
      }

      if (res != null) {
        var data = JSON.parse(res);
        self.id = data.id;

        self.redis.get('screen:' + self.id, function(err, res) {
          var data = JSON.parse(res);
          self.name = data.name;
          self.groups = data.groups;

          // Emit loaded event.
          self.emit('loaded');
        });        
      }
      else {
        // Call backend to get screen information.
        // @TODO: call backend.
        console.log('INSERTING DUMMY DATA INTO SCREEN');
        self.id = self.token.substring(1, 8);
        self.name = 'TEST ' + self.id;
        self.groups = [ '43218765' ];

        // Save content.
        self.save();

        // Wait for the save envent to complete.
        self.on('saved', function() {
          self.emit('loaded');
        });
      }
    });
  }

  /**
   * Save screen configuration to redis.
   */
  Screen.prototype.save = function save() {
    var self = this;

    console.log('screen:' + self.id);

    var data = {
      name: self.name,
      groups: self.groups
    }

    self.redis.set('screen:' + self.id, JSON.stringify(data), function(err, res) {
      if (err) {
        throw new Error('Redis encounted an error');
      }
      self.redis.hset('screen:lookup:token', self.token, JSON.stringify({ id: self.id }), function(err, res) {
        if (err) {
          throw new Error('Redis encounted an error');
        }

        self.emit('saved');
      });    
    });
  }

  /**
   * Generic get function to extract properties.
   */
  Screen.prototype.get = function get(property) {
    var self = this;

    if (self.hasOwnProperty(property)) {
      return self[property];
    }

    throw new Error("Property is not defined");
  }

  /**
   * Generic set function to set properties.
   */
  Screen.prototype.set = function set(property, value) {
    var self = this;

    if (self.hasOwnProperty(property)) {
      self[property] = value;
    }
    else {
      throw new Error("Property is not defined");
    }
  }

  return Screen;
})();

// Export the object.
module.exports = Screen;