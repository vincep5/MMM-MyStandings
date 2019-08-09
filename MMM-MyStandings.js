'use strict';

Module.register("MMM-MyStandings",{
	// Default module config.
	defaults: {
		updateInterval: 60 * 60 * 1000, // every 60 minutes
		rotateInterval: 1 * 60 * 1000, // every 1 minute
		initialLoadDelay: 10 * 1000, // 10 second initial load delay
		lang: config.language,
		url: "http://site.web.api.espn.com/apis/v2/sports/",
		sports: [
			{ league: "NBA", groups: ["Atlantic", "Central", "Southeast", "Northwest", "Pacific", "Southwest"] },
			{ league: "MLB", groups: ["American League East", "American League Central", "American League West", "National League East", "National League Central", "National League West"] },
			{ league: "NFL", groups: ["AFC East", "AFC North", "AFC South", "AFC West", "NFC East", "NFC North", "NFC South", "NFC West"] },
			{ league: "NHL", groups: ["Atlantic Division", "Metropolitan Division", "Central Division", "Pacific Division"] },
			{ league: "MLS", groups: ["Eastern Conference", "Western Conference"] },
			{ league: "NCAAF", groups: ["American Athletic - East", "American Athletic - West", "Atlantic Coast Conference - Atlantic", "Atlantic Coast Conference - Coastal",
										"Big 12 Conference", "Big Ten - East", "Big Ten - West", "Conference USA - East", "Conference USA - West",
										"FBS Independents", "Mid-American - East", "Mid-American - West", "Mountain West - Mountain", "Mountain West - West",
										"Pac 12 - North", "Pac 12 - South", "SEC - East", "SEC - West", "Sun Belt - East", "Sun Belt - West"] }
		],
		nameStyle: "short", // "abbreviation", "full", or "short"
		showLogos: true,
		useLocalLogos: true, // true, then display logos from folder.  false, then display logos from the ESPN url
		showByDivision: true, // true, then display one division at a time.  false, display all divisions per sport
		fadeSpeed: 2000,
	},

	// Module properties.
	standings: null,
	standingsInfo: [],
	standingsSportInfo: [],
	ctRotate: 0,
	ctDivision: 0,
	currentSport: null,
	currentDivision: null,
	isLoaded: false,
	hasMoreDivisions: false,

	// Start the module.
	start: function () {
		// Set some default for groups if not found in user config
		for (var league in this.config.sports) {
			if (this.config.sports[league].groups === undefined) {
				for (var leagueDefault in this.defaults.sports) {
					if (this.defaults.sports[leagueDefault].league === this.config.sports[league].league) {
						this.config.sports[league].groups = this.defaults.sports[leagueDefault].groups;
						break;
					}
				}
			}
		}

		// Get initial API data
		this.getData(false);

		// Schedule the API data update.
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
			currentDivision: this.currentDivision,
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
		// When we want to refresh data from the API call
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
				case "MLS":
					sport = "soccer/usa.1/standings?sort=rank:asc";
					break;
				case "NCAAF":
					sport = "football/college-football/standings?group=80&level=3&sort=leaguewinpercent:desc,vsconf_wins:desc,vsconf_gamesbehind:asc,vsconf_playoffseed:asc,wins:desc,losses:desc,playoffseed:asc,alpha:asc";
					break;
			}

			this.sendSocketNotification("STANDINGS_RESULT", this.config.url + sport);
		}
	},

	socketNotificationReceived: function(notification, payload) {
		if (notification === "STANDINGS_RESULT") {
			var abbr;

			if (payload.abbreviation === undefined) {
				if (payload.name === 'FBS (I-A)') {
					abbr = "NCAAF";
				}
			} else {
				abbr = payload.abbreviation;
			}

			this.standingsInfo.push(this.cleanupData(payload.children, abbr));
			this.standingsSportInfo.push(abbr);
		}
	},

	rotateStandings: function() {
		// If we do not have any data, do not try to load the UI
		if (this.standingsInfo === undefined || this.standingsInfo === null || this.standingsInfo.length === 0) {
			return;
		}

		if (this.ctRotate >= this.standingsInfo.length) {
			this.ctRotate = 0;
		}

		this.standings = this.standingsInfo[this.ctRotate];
		this.currentSport = this.standingsSportInfo[this.ctRotate];

		if (this.config.showByDivision) {
			// If we only have 1 sport and 1 division, load it once and then do not try re loading again.
			if (this.isLoaded === true && this.standingsInfo.length === 1 && this.ctDivision === 0 && this.hasMoreDivisions === false) {
				return;
			}

			var isLastDivisionInSport = false;

			for (var league in this.config.sports) {
				if (this.config.sports[league].league === this.currentSport) {
					this.currentDivision = this.config.sports[league].groups[this.ctDivision];

					if (this.ctDivision === this.config.sports[league].groups.length - 1) {
						isLastDivisionInSport = true;
					}
					if (this.config.sports[league].groups.length > 1) {
						this.hasMoreDivisions = true;
					}
				}
			}

			this.updateDom(this.config.fadeSpeed);
			this.isLoaded = true;
			this.ctDivision = this.ctDivision + 1;

			// Reset the division and increment the rotate when we reach the last division in a sport
			if (isLastDivisionInSport) {
				this.ctDivision = 0;
				this.ctRotate = this.ctRotate + 1;
			}
		} else {
			// If we only have 1 sport, load it once and then do not try re loading again.
			if (this.isLoaded === true && this.standingsInfo.length === 1) {
				return;
			}

			this.updateDom(this.config.fadeSpeed);
			this.isLoaded = true;
			this.ctRotate = this.ctRotate + 1;
		}
	},

	// For sake of size of the arrays, let us remove items that we do not particularly care about
	cleanupData: function(standingsObject, sport) {
		var g,h,i,j;
		var formattedStandingsObject = [];
		var imageType = ".svg";

		if (sport === 'NCAAF') {
			imageType = ".png";
		}

		//leagues or conferences - extract out the division
		for (g = 0; g < standingsObject.length; g++) {
			if (standingsObject[g].children !== undefined) {
				for (h = 0; h < standingsObject[g].children.length; h++) {
					formattedStandingsObject.push(standingsObject[g].children[h]);
				}
			} else if (standingsObject[g].standings !== undefined) {
				formattedStandingsObject.push(standingsObject[g]);
			}
		}

		if (formattedStandingsObject.length === 0) {
			formattedStandingsObject = standingsObject;
		}

		//division
		for (h = 0; h < formattedStandingsObject.length; h++) {
			var hasMatch = false;

			// We only want to show divisions/groups that we have configured
			for (var league in this.config.sports) {
				if (this.config.sports[league].league === sport) {
					if (this.config.sports[league].groups !== undefined && this.config.sports[league].groups.includes(formattedStandingsObject[h].name)) {
						hasMatch = true;
					}
				}
			}

			if (hasMatch === false) {
				formattedStandingsObject[h] = null;
				continue;
			}

			//teams
			for (i = 0; i < formattedStandingsObject[h].standings.entries.length; i++) {
				if (this.config.useLocalLogos === true) {
					var team = formattedStandingsObject[h].standings.entries[i].team;
					team.logos[0].href = this.file("logos/" + sport + "/" + team.abbreviation + imageType);
				}

				var newStats = [];
				//records
				for (j = 0; j < formattedStandingsObject[h].standings.entries[i].stats.length; j++) {
					var newEntry = [];
					var entry = formattedStandingsObject[h].standings.entries[i].stats[j];

					if (sport === 'NHL')
					{
						switch (entry.name) {
							case "wins":
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 1,
									value: newEntry
								});
								break;
							case "losses":
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 2,
									value: newEntry
								});
								break;
							case "otLosses":
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 3,
									value: newEntry
								});
								break;
							case "points":
								newEntry.name = entry.name;
								newEntry.value = entry.value;
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
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 1,
									value: newEntry
								});
								break;
							case "losses":
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 2,
									value: newEntry
								});
								break;
							case "gamesBehind":
								newEntry.name = entry.name;
								newEntry.value = entry.displayValue;
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
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 1,
									value: newEntry
								});
								break;
							case "losses":
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 2,
									value: newEntry
								});
								break;
							case "gamesBehind":
								newEntry.name = entry.name;
								newEntry.value = entry.displayValue;
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
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 1,
									value: newEntry
								});
								break;
							case "losses":
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 2,
									value: newEntry
								});
								break;
							case "ties":
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 3,
									value: newEntry
								});
								break;
						}
					}
					else if (sport === 'MLS')
					{
						switch (entry.name) {
							case "wins":
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 1,
									value: newEntry
								});
								break;
							case "ties":
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 2,
									value: newEntry
								});
								break;
							case "losses":
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 3,
									value: newEntry
								});
								break;
							case "points":
								newEntry.name = entry.name;
								newEntry.value = entry.value;
								newStats.push({
									key: 4,
									value: newEntry
								});
								break;
						}
					}
					else if (sport === 'NCAAF')
					{
						switch (entry.name) {
							case "vsConf":
								newEntry.name = entry.displayName;
								newEntry.value = entry.displayValue;
								newStats.push({
									key: 1,
									value: newEntry
								});
								break;
							case "overall":
								newEntry.name = entry.displayName;
								newEntry.value = entry.displayValue;
								newStats.push({
									key: 2,
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

				formattedStandingsObject[h].standings.entries[i].stats = finalValues;
			}
		}

		return formattedStandingsObject;
	}
});
