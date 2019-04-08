'use strict';

Module.register("MMM-MyStandings",{
	// Default module config.
	defaults: {
		updateInterval: 60 * 60 * 1000, // every 60 minutes
		rotateInterval: 1 * 60 * 1000, // every 1 minute
		initialLoadDelay: 15 * 1000, // 15 second initial load delay
		lang: config.language,
		url: "http://site.web.api.espn.com/apis/v2/sports/",
		sports: [
			{ league: "NBA", groups: ["Atlantic", "Central", "Southeast", "Northwest", "Pacific", "Southwest"] },
			{ league: "MLB", groups: ["American League East", "American League Central", "American League West","National League East", "National League Central", "National League West"] },
			{ league: "NFL", groups: ["AFC East", "AFC North", "AFC South", "AFC West","NFC East", "NFC North", "NFC South", "NFC West"] },
			{ league: "NHL", groups: ["Atlantic Division", "Metropolitan Division", "Central Division", "Pacific Division"] }
		],
		nameStyle: "short", // "abbreviation", "full", or "short"
		showLogos: true,
		fadeSpeed: 2000,
	},

	// Module properties.
	standings: null,
	standingsInfo: [],
	standingsSportInfo: [],
	ctRotate: 0,
	currentSport: null,
	isLoaded: false,

	// Start the module.
	start: function () {
		this.getData(false);
		// Schedule the first update.
		this.scheduleUpdate();

		// Schedule the first UI load
		var self = this;
		setTimeout(function() {
			self.rotateStandings();
		}, this.config.initialLoadDelay);

		// Schedule the UI load based on normal interval
		var self = this;
		setInterval(function() {
			self.rotateStandings();
		}, this.config.rotateInterval);
	},	

	// Define required styles.
	getStyles: function () {
		return ["MMM-MyStandings.css"];
	},
	
	// Select the template depending on the display type.
	getTemplate: function () {
		return "standings.njk";
	},

	// Add all the data to the template.
	getTemplateData: function () {
		return {
			config: this.config,
			standings: this.standings,
			currentSport: this.currentSport,
		}
	},

	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		setInterval(function() {
			self.getData(true);
		}, nextLoad);
	},

	getData: function (clearAll) {
		if (clearAll === true) {
			this.standingsInfo = [];
			this.standingsSportInfo = [];
			this.isLoaded = false;
		}

		var sport;

		for (var i = 0; i < this.config.sports.length; i++) {
			switch (this.config.sports[i].league) {
				case "MLB":
				sport = "baseball/mlb/standings?level=3&sort=gamesbehind:asc,winpercent:desc";
				break;
				case "NBA":
				sport = "basketball/nba/standings?level=3&sort=gamesbehind:asc,winpercent:desc";
				break;
				case "NFL":
				sport = "football/nfl/standings?level=3&sort=winpercent:desc,playoffseed:asc";
				break;
				case "NHL":
				sport = "hockey/nhl/standings?level=3&sort=points:desc,winpercent:desc,playoffseed:asc";
				break;
			}

			this.sendSocketNotification("STANDINGS_RESULT", this.config.url + sport);
		}
	},

	socketNotificationReceived: function(notification, payload) {
		if (notification === "STANDINGS_RESULT") {
			this.standingsInfo.push(this.cleanupData(payload.children, payload.abbreviation));
			this.standingsSportInfo.push(payload.abbreviation);
		}
	},

	rotateStandings: function() {
		// If we don't have any data, do not try to load the UI
		if (this.standingsInfo === undefined || this.standingsInfo === null || this.standingsInfo.length == 0) {
			return;
		}

		// If we only have 1 sport, load it once and then do not try re loading again.
		if (this.isLoaded == true && this.standingsInfo.length == 1) {
			return;
		}

		if (this.ctRotate >= this.standingsInfo.length) {
			this.ctRotate = 0;
		}

		this.standings = this.standingsInfo[this.ctRotate];
		this.currentSport = this.standingsSportInfo[this.ctRotate];
		this.updateDom(this.config.fadeSpeed);
		this.isLoaded = true;
		this.ctRotate = this.ctRotate + 1;
	},

	// For sake of size of the arrays, let us remove items that we do not particularly care about
	cleanupData: function(standingsObject, sport) {
		var g,h,i,j;
		//leagues or conferences
		for (g = 0; g < standingsObject.length; g++) {
			//divisions
			for (h = 0; h < standingsObject[g].children.length; h++) {
				var hasMatch = false;
				var hasGroup = false;

				// We only want to show divisions/groups that we have configured
				for (var league in this.config.sports) {
					if (this.config.sports[league].league == sport) {
						if (this.config.sports[league].groups !== undefined) {
							hasGroup = true;
						}
					
						if (this.config.sports[league].groups !== undefined && this.config.sports[league].groups.includes(standingsObject[g].children[h].name)) {
							hasMatch = true;
						}
					}
				}

				if (hasMatch ===  false && hasGroup) {
					standingsObject[g].children[h] = null;
					continue;
				}

				//teams
				for (i = 0; i < standingsObject[g].children[h].standings.entries.length; i++) {
					var newStats = [];
					//records
					for (j = 0; j < standingsObject[g].children[h].standings.entries[i].stats.length; j++) {
						var newEntry = [];
						var entry = standingsObject[g].children[h].standings.entries[i].stats[j];

						if (sport === 'NHL')
						{
							switch (entry.name) {
								case "wins":
								newEntry.name = entry.name
								newEntry.value = entry.value
								newStats.push({
									key: 1,
									value: newEntry
								});
								break;
								case "losses":
								newEntry.name = entry.name
								newEntry.value = entry.value
								newStats.push({
									key: 2,
									value: newEntry
								});
								break;
								case "otLosses":
								newEntry.name = entry.name
								newEntry.value = entry.value
								newStats.push({
									key: 3,
									value: newEntry
								});
								break;
								case "points":
								newEntry.name = entry.name
								newEntry.value = entry.value
								newStats.push({
									key: 4,
									value: newEntry
								});
								break;
							}
						}
						else if (sport === 'MLB')
						{
							switch (entry.name) {
								case "wins":
								newEntry.name = entry.name
								newEntry.value = entry.value
								newStats.push({
									key: 1,
									value: newEntry
								});
								break;
								case "losses":
								newEntry.name = entry.name
								newEntry.value = entry.value
								newStats.push({
									key: 2,
									value: newEntry
								});
								break;
								case "gamesBehind":
								newEntry.name = entry.name
								newEntry.value = entry.value
								newStats.push({
									key: 3,
									value: newEntry
								});
								break;
							}
						}
						else if (sport === 'NBA')
						{
							switch (entry.name) {
								case "wins":
								newEntry.name = entry.name
								newEntry.value = entry.value
								newStats.push({
									key: 1,
									value: newEntry
								});
								break;
								case "losses":
								newEntry.name = entry.name
								newEntry.value = entry.value
								newStats.push({
									key: 2,
									value: newEntry
								});
								break;
								case "gamesBehind":
								newEntry.name = entry.name
								newEntry.value = entry.value
								newStats.push({
									key: 3,
									value: newEntry
								});
								break;
							}
						}
						else if (sport === 'NFL')
						{
							switch (entry.name) {
								case "wins":
								newEntry.name = entry.name
								newEntry.value = entry.value
								newStats.push({
									key: 1,
									value: newEntry
								});
								break;
								case "losses":
								newEntry.name = entry.name
								newEntry.value = entry.value
								newStats.push({
									key: 2,
									value: newEntry
								});
								break;
								case "ties":
								newEntry.name = entry.name
								newEntry.value = entry.value
								newStats.push({
									key: 3,
									value: newEntry
								});
								break;
							}
						}
					}

					// Sort these to help display in the correct order
					function sortByKey(array, key) {
						return array.sort(function(a, b) {
							var x = a[key]; var y = b[key];
							return ((x < y) ? -1 : ((x > y) ? 1 : 0));
						});
					}
					
					newStats = sortByKey(newStats, 'key');

					var finalValues = [];
					for (var key in newStats) {
						finalValues.push(newStats[key].value);
					}
					
					standingsObject[g].children[h].standings.entries[i].stats = finalValues;
				}
			}
		}

		return standingsObject;
	}
});
