## This app displays the Abbreviation and Name of all the teams in a League for making it easy to add new logos
import json
import requests

##Change de URL (XXXXX) for the League you want to display the teams and abbreviations
##r = requests.get('https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams?region=us&lang=en&contentorigin=espn&limit=400&groups=50&groupType=conference&enable=groups&includeModules=news')
r = requests.get('https://site.web.api.espn.com/apis/site/v2/sports/football/college-football/teams?region=us&lang=en&contentorigin=espn&limit=400&groups=80&groupType=conference&enable=groups&includeModules=news')
data = r.json()
for group in range(len(data['sports'][0]['leagues'][0]['groups'])):
    for index in range(len(data['sports'][0]['leagues'][0]['groups'][group]['teams'])):
        name = data['sports'][0]['leagues'][0]['groups'][group]['teams'][index]['name']
        abre = data['sports'][0]['leagues'][0]['groups'][group]['teams'][index]['abbreviation']
        try:
            logo = data['sports'][0]['leagues'][0]['groups'][group]['teams'][index]['logos'][0]["href"]
        except:
            print(abre + "~~" + name)
        print(abre + "~" + logo + "~" + name)

##r = requests.get('http://site.api.espn.com/apis/site/v2/sports/soccer/XXXXXX/teams')
##data = r.json()
##for index in range(len(data['sports'][0]['leagues'][0]['teams'])):
##    name = data['sports'][0]['leagues'][0]['teams'][index]['team']['name']
##    abre = data['sports'][0]['leagues'][0]['teams'][index]['team']['abbreviation']
##    print(abre + "   " + name)