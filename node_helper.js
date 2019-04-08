/* Magic Mirror
 * Module: Standings
 *
 */
var NodeHelper = require('node_helper');
var request = require('request');

module.exports = NodeHelper.create({

	start: function () {
		console.log('MMM-MyStandings helper started ...');
	},

	getData: function (notification, url) {
		var self = this;
		//console.log('requesting:' + url);
		request({ url: url, method: 'GET' }, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var result = JSON.parse(body);
				self.sendSocketNotification(notification, result);
			} else {
				console.log("MMM-MyStandings : Could not load data.");
			}
		});
	},

	//Subclass socketNotificationReceived received.
	socketNotificationReceived: function(notification, payload) {
		this.getData(notification, payload);
	}
});