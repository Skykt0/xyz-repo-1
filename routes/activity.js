'use strict';
// Deps
/*
 * POST Handler for / route of Activity (this is the edit route).
 */
const axios = require('axios');
exports.edit = function (req, res) {
  res.status(200).send('Edit');
};

/*
 * POST Handler for /save/ route of Activity.
 */
exports.save = function (req, res) {
  res.status(200).send('Save');
};

/*
 * POST Handler for /execute/ route of Activity.
 */
exports.execute = async function (req, res) {
  var contactKey = req.body.keyValue;
  var journeyId = req.body.journeyId;
  var activityId = req.body.activityId;
  var requestBody = req.body.inArguments[0];        
  var authToken = requestBody.authorization.authToken;
  var authTSSD = requestBody.authorization.authTSSD;

  try {
    var postcardJson = req.body.inArguments[0].postcardJson;
    var contactFields = req.body.inArguments[0].MapDESchema ;
    postcardJson.to = contactFields;
    let now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    postcardJson.sendDate = now.toISOString();
    var internalPostcardJson = req.body.inArguments[0].internalPostcardJson ;
    let baseUrl = 'https://api.postgrid.com/print-mail/v1/';
    const postcardConfigOptions = {
      method: 'POST',
      url: internalPostcardJson.messageType === 'Postcards' ? baseUrl + 'postcards': baseUrl + 'self_mailers',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-KEY': internalPostcardJson.test_api_key
      },
      data: postcardJson
    };
    var postcardCreateCall = await axios.request(postcardConfigOptions);
    if (postcardCreateCall.status === 200 || postcardCreateCall.status === 201) {
      var postcardId = postcardCreateCall.data.id;
      const d = new Date();
      let timeStamp = d.toISOString();
      logToDataExtension(`Postcard created successfully. ID: ${postcardId}`, authTSSD, authToken, timeStamp, contactKey, 'Success', journeyId, activityId);

    } else {
      res.status(500).send('Postcard creation failed');
      return;
    }
  } catch (error) {
    const d = new Date();
    let timeStamp = d.toISOString();
    logToDataExtension(error.response ? JSON.stringify(error.response.data) : error.message, authTSSD, authToken, timeStamp, contactKey, 'Error', journeyId, activityId);
    res.status(500).send('Error creating postcard');
    return;
  }
  res.status(200).send('good');
};

/*
 * POST Handler for /publish/ route of Activity.
 */
exports.publish = function (req, res) {
  res.status(200).send('Publish');
};

/*
 * POST Handler for /validate/ route of Activity.
 */
exports.validate = function (req, res) {
  res.status(200).send('Validate');
};
function logToDataExtension(responseData, authTSSD, authToken, timeStamp, contactKey, status, journeyId, activityId) {
  var payload = JSON.stringify({
    'items': [
      {
        'Status': status,
        'Response': responseData,
        'TimeStamp': timeStamp,
        'ContactKey' : contactKey,
        'JourneyId' : journeyId,
        'ActivityId' : activityId
      }
    ]
  });

  var logDEKey = 'Postgrid_Logging_Data';

  const config = {
    method: 'post',
    url: `https://${authTSSD}.rest.marketingcloudapis.com/data/v1/async/dataextensions/key:${logDEKey}/rows`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer '+authToken
    },
    data: payload
  };

  return axios.request(config);
}
