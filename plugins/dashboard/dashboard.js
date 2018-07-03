/**
 * @file
 * A dashboard that can be used to survailances of the screens.
 */

/**
 * Dashboard class.
 *
 * @param app
 *   The express Application.
 * @param logger
 *   The event logger.
 * @param apikeys
 *   API key object.
 * @param cache
 *   Cache object.
 * @param Screen
 *   Screen object.
 *
 * @constructor
 */
var Dashboard = function Admin(app, logger, apikeys, cache, Screen, options) {
  "use strict";

  var twig = require('twig');
  var fs = require('fs');

  this.moment = require('moment');

  var self = this;
  this.logger = logger;
  this.cache = cache;
  this.apikeys = apikeys;
  this.screen = Screen;
  this.config = options;

  this.Q = require('q');

  /**
   * Basic authentication helper function.
   */
  this.auth = function auth(req, res, next) {
    var fs = require('fs');
    var basicAuth = require('basic-auth');
    var htpasswd = require('htpasswd-auth');

    function unauthorized(res) {
      res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
      return res.sendStatus(401);
    };

    var user = basicAuth(req);

    if (!user || !user.name || !user.pass) {
      return unauthorized(res);
    };

    var file = fs.readFileSync(__dirname + '/../../' + self.config.htpasswd, 'utf8');
    htpasswd.authenticate(user.name, user.pass, file).then(function (auth) {
      if (auth) {
        return next();
      } 
      else {
        return unauthorized(res);
      };
    });
  };

  // Interpreted and loaded here as it will be used many times.
  this.bashboardTemplate = twig.twig({
    data: fs.readFileSync(__dirname + '/views/status.html', 'utf8')
  });

  

  /**
   * Dashboard status callback.
   */
  app.get('/dashboard/status', self.auth, function (req, res) {
    self.buildScreenData().then(function (screens) {
      res.send(self.bashboardTemplate.render({
        page_title: 'Aroskanalen screen',
        date: {
          month: self.moment().format('MMMM'),
          day: self.moment().format('D'),
          year: self.moment().format('YYYY')
        },
        screens: screens
      }));      
    },
    function error(error) {
      res.status(500).send(error.message);
    })
  });




  app.get('/dashboard/blacklist', self.auth, function (req, res) {

    // Create local every time to not use global memory for the template.
    var template = twig.twig({
      data: fs.readFileSync(__dirname + '/views/blacklist.html', 'utf8')
    });

    self.buildScreenData().then(function (screens) {
      res.send(template.render({
        screens: screens
      }));      
    },
    function error(error) {
      res.status(500).send(error.message);
    })
  });


  app.get('/dashboard/blacklist/save', self.auth, function (req, res) {
    res.send('...');
  });
};

/**
 * Helper function to async load all information about screens known to the middleware.
 */
Dashboard.prototype.buildScreenData = function buildScreenData() {
  var self = this;
  var deferred = self.Q.defer();

  self.apikeys.load().then(
    function (keys) {
      for (var apikey in keys) {
        self.cache.membersOfSet('screen:' + apikey, function (err, screens) {
          self.Q().then(function () {
            var screenPromises = [];
            // Loop over screens and build promises array.
            for (var i in screens) {
              screenPromises.push(self.loadScreen(apikey, keys[apikey].name, screens[i]));
            }

            return screenPromises;
          })
          .all()
          .then(function (beats) {
            var screens = {
              critical: {},
              all: {}
            };
            var total = 0;
            var no_of_critical = 0;
            for (var i in beats) {
              var beat = beats[i];

              // Check if beat has expire and add it to "critical" bucket.
              if (beat.expired) {
                if (!screens.critical.hasOwnProperty(beat.apikey)) {
                  screens.critical[beat.apikey] = [];
                }
                screens.critical[beat.apikey].push(beat);
                no_of_critical++;
              }

              // Add all beats to the all array.
              if (!screens.all.hasOwnProperty(beat.apikey)) {
                screens.all[beat.apikey] = [];
              }
              screens.all[beat.apikey].push(beat);
              total++;
            }

            screens.count = {
              total: total,
              critical: no_of_critical
            };
           
            deferred.resolve(screens);
          },
          function (error) {
            deferred.reject(error);
          })
        });
      }
    },
    function (error) {
      deferred.reject(error);
    }
  );

  return deferred.promise;
}

/**
 * Helper function to load a screen.
 *
 * @param apikey
 *   API-key for the screen to load.
 * @param name
 *   The name linked to the api-key.
 * @param screenId
 *   The id of screen to load.
 *
 * @returns {*}
 */
Dashboard.prototype.loadScreen = function loadScreen(apikey, name, screenId) {
  var self = this;
  var deferred = self.Q.defer();

  var screen = new self.screen(apikey, screenId);
  screen.load().then(
    function (screenObj) {
      deferred.resolve({
        apikey: apikey,
        name: name,
        id: screenObj.id,
        title: screenObj.title,
        heartbeat: self.moment.unix(screenObj.heartbeat).format('D. MMMM YYYY HH:mm:ss'),
        expired: self.expired(screenObj.heartbeat)
      })
    },
    function (error) {
      self.logger.error(error.message);
      deferred.reject(error.message);
    }
  );

  return deferred.promise;
}

/**
 * Check if a given timestamp has expired.
 *
 * @param timestamp
 *   Unix-timestamp.
 *
 * @returns
 *   TRUE if expired else FALSE.
 */
Dashboard.prototype.expired = function expired(timestamp) {
  return timestamp < Math.round((new Date()).getTime() / 1000) - 900;
};

/**
 * Validate that the role is admin.
 *
 * @param req
 *   Express request object.
 */
Dashboard.prototype.validateCall = function validateCall(req) {
  "use strict";

  return (req.hasOwnProperty('user')) && (req.user.role === 'admin');
};

/**
 * Register the plugin with architect.
 */
module.exports = function (options, imports, register) {
  "use strict";

  // Create the API routes using the API object.
  new Dashboard(imports.app, imports.logger, imports.apikeys, imports.cache, imports.screen, options);

  // This plugin extends the server plugin and do not provide new services.
  register(null, null);
};
