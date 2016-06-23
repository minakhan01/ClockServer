var express = require('express');
var app = express();
var path = require('path');
var port = 3030;
var bodyParser = require('body-parser');
var firebase = require("firebase");
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var url = require('url');
var fs = require('fs');

var clientSecret;
var clientId;
var redirectUrl;
var auth;
var oauth2Client;

var deviceID;

firebase.initializeApp({
  serviceAccount: "serviceAccountCredentials.json",
  databaseURL: "https://clear-idea-135023.firebaseio.com"
});

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Calendar API.
  authorize(JSON.parse(content));
});

// respond with "hello world" when a GET request is made to the homepage
app.get('/receiveToken', function(req, res) {
  console.log("req.url: "+req.url);
  url_parts = url.parse(req.url, true);
  queryData = url_parts.query;
  console.log("code: "+queryData.code);
  code = queryData.code;
  oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      setTokenForDevice(deviceID, token);
      // res.redirect(req.url + "getCalendarEvents:"+ deviceID);
      res.sendFile(path.join(__dirname + '/done.html'));

  });
});


// respond with "hello world" when a GET request is made to the homepage
app.get('/getCalendarEvents:id', function(req, res) {
	// myFirebaseRef = new Firebase("https://lightupmeetings.firebaseio.com/");
	ref.orderByKey().equalTo(req.params.id).once("value", function(snapshot) {
			snapshot.forEach(function(data) {
				console.log("The device " + data.key + " token is " + data.val());
				oauth2Client.credentials = data.val();
				listEvents(oauth2Client, res);
			});
	});
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials) {
  clientSecret = credentials.installed.client_secret;
  clientId = credentials.installed.client_id;
  redirectUrl = credentials.installed.redirect_uris[1]+":"+port+"/receiveToken";
  auth = new googleAuth();
  oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
}

// As an admin, the app has access to read and write all data, regardless of Security Rules
var db = firebase.database();
var ref = db.ref("tokens");

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

// instruct the app to use the `bodyParser()` middleware for all routes
app.use(bodyParser());

// viewed at http://localhost:8080
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

// viewed at http://localhost:8080
app.get('/deviceId/:id', function(req, res) {
    console.log("ended up here");
    deviceID = req.params.id;
    findFirebaseDeviceId(deviceID, res);
});

// This route receives the posted form.
// As explained above, usage of 'body-parser' means
// that `req.body` will be filled in with the form elements
app.post('/', function(req, res){
  deviceID = req.body.deviceId;
  console.log("deviceID: "+deviceID);
  console.log("req: "+req.url);
  // res.redirect(req.url+"deviceId/"+deviceID);
});

app.listen(port, function () {
  console.log('Example app listening on port 3000!');
});

function findFirebaseDeviceId(deviceId, res) {
	// myFirebaseRef = new Firebase("https://lightupmeetings.firebaseio.com/");
	ref.orderByKey().equalTo(deviceId).once("value", function(snapshot) {
		var count = snapshot.numChildren();
		console.log(count);
		if (count < 1) {
			console.log("need to add the account");
			var authUrl = oauth2Client.generateAuthUrl({
				access_type: 'offline',
				scope: SCOPES
			}); 
			res.redirect(authUrl);
		}
		else {
			snapshot.forEach(function(data) {
				console.log("The device " + data.key + " token is " + data.val());
				oauth2Client.credentials = JSON.parse(data.val());
				listEvents(oauth2Client, res);
			});
		}
	});
}

function setTokenForDevice(deviceId, token) {
	ref.child(deviceId).set(token);
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth, res) {
  var calendar = google.calendar('v3');
  var today = new Date();
  today.setHours(0,0,0,0);
  var todayString = today.toISOString();
  var tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));
  var tomorrowString = tomorrow.toISOString();
  calendar.events.list({
    auth: auth,
    calendarId: 'primary',
    timeMin: todayString,
    timeMax: tomorrowString,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var times = "";
    var events = response.items;
    if (events.length == 0) {
      console.log('No upcoming events found.');
    } else {
      // console.log('Upcoming 10 events:');
      for (var i = 0; i < events.length; i++) {
        var event = events[i];
        var start = event.start.dateTime || event.start.date;
        var time = event.start.dateTime;
        times += time.substring(time.indexOf("T")+1,time.indexOf(":")) + " ";
        console.log('%s - %s', start, event.summary);
      }
    }
    console.log(times);
    res.send(times);
  });
}