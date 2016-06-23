var express = require('express');
var app = express();
var path = require('path');
var port = 3030;
var bodyParser = require('body-parser');
var firebase = require("firebase");

firebase.initializeApp({
  serviceAccount: "serviceAccountCredentials.json",
  databaseURL: "https://clear-idea-135023.firebaseio.com"
});

// As an admin, the app has access to read and write all data, regardless of Security Rules
var db = firebase.database();
var ref = db.ref("tokens");

// instruct the app to use the `bodyParser()` middleware for all routes
app.use(bodyParser());

// viewed at http://localhost:8080
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

// This route receives the posted form.
// As explained above, usage of 'body-parser' means
// that `req.body` will be filled in with the form elements
app.post('/login', function(req, res){
  deviceID = req.body.deviceId;
  console.log("deviceID: "+deviceID);
  findFirebaseDeviceId(deviceID);
  setTokenForDevice(deviceID, deviceID);
});

app.listen(port, function () {
  console.log('Example app listening on port 3000!');
});

function findFirebaseDeviceId(deviceId) {
	// myFirebaseRef = new Firebase("https://lightupmeetings.firebaseio.com/");
	ref.orderByKey().equalTo(deviceId).once("value", function(snapshot) {
		var count = snapshot.numChildren();
		console.log(count);
		if (count < 1) {
			console.log("need to add the account");
		}
		else {
			snapshot.forEach(function(data) {
				console.log("The device " + data.key + " token is " + data.val());
			});
		}
	});
}

function setTokenForDevice(deviceId, token) {
	ref.child(deviceId).set(token);
}