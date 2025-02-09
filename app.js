const express = require('express');

const path = require('path');
var bodyParser = require('body-parser');
var activity = require('./routes/activity');
const app = express();

// Configure Express
app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.json({ type: 'application/json' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/save/', activity.save);
app.post('/validate/', activity.validate);
app.post('/publish/', activity.publish);
app.post('/execute/', activity.execute);

const PORT = process.env.PORT || 3000;

app.listen(PORT);