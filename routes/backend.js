/**
 * @file
 * Defines the reset API routes used by the back-end.
 */

exports.screenUpdate = function (req, res) {
  if (req.body.token !== undefined) {
    var Screen = require('../lib/screen')
    var instance = new Screen(req.body.token);
    instance.on('loaded', function() {
      instance.set('name', req.body.screenName);
      instance.set('screenGroups', req.body.screenGroups);

      // Save the updates.
      instance.save();
      instance.on('saved', function() {
        // Save completed.
        res.send(200);

        // Reload screen to update groups.
        instance.reload();
      });

      // Handle error events.
      instance.on('error', function(data) {
        console.log(data.code + ': ' + data.message);
        res.send(500);
      });
    });
  }
  else {
    res.send(500);
  }
}

/**
 * Implements screen reload.
 *
 * Loads the screen based on screenID and sends reload command.
 */
exports.screenReload = function (req, res) {
  // Reload base on screens.
  if (req.body.screens !== undefined) {
    // Get screen class.
    var Screen = require('../lib/screen');

    var screens = req.body.screens;
    for (var screenID in req.body.screens) {
      console.log(screens[screenID]);
      // Create new screen object.
      var instance = new Screen(undefined, screens[screenID]);
      instance.on('loaded', function(data) {
        instance.reload();
      });

      instance.on('error', function(data) {
        console.log(screens[screenID] + ': ' + data.code + ' - ' + data.message);
      });
    }

    res.send(200);
  }
  // Reload based on groups.
  else if (req.body.groups !== undefined) {
    // Get sockets.
    var sio = global.sio;

    var groups = req.body.groups;
    for (var groupsID in groups) {
      sio.sockets.in(groups[groupsID]).emit('reload', {});
    }

    res.send(200);
  }
  else {
    res.send(500);
  }
}

/**
 * Implements push channel content.
 */
exports.pushChannel = function (req, res) {
  res.send(501);
}

/**
 * Implements emergency content push.
 */
exports.pushEmergency = function (req, res) {
  res.send(501);
}

/**
 * Implements status request.
 */
exports.status = function (req, res) {
  res.send(501);
}
