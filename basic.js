var express = require('express');
var app = express();

app.get('/', function(req, res) {
    res.redirect('http://google.com');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});