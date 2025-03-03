'use strict';
const axios = require('axios');

/**
 * POST Handler for the /edit/ route of the Activity.
 * This route handles the edit request
 */
exports.edit = function (req, res) {
  res.status(200).send('Edit');
};

/**
 * POST Handler for the /save/ route of the Activity.
 * This route handles the save request
 */
exports.save = function (req, res) {
  res.status(200).send('Save');
};

/**
 * POST Handler for the /execute/ route of the Activity.
 * This route is used to execute the activity, typically triggering an external API (e.g., creating a postcard) based on the provided data.
 * 
 * @param {Object} req - The request object containing the activity details.
 * @param {Object} res - The response object used to send the response back to the client.
 */
exports.execute = async function (req, res) {
  const contactKey = req.body.keyValue;
  const journeyId = req.body.journeyId;
  const activityId = req.body.activityId;
  const requestBody = req.body.inArguments[0];
  const authToken = requestBody.authorization.authToken;
  const authTSSD = requestBody.authorization.authTSSD;

  try {
    let postcardJson = requestBody.postcardJson;
    const contactFields = requestBody.MapDESchema;
    postcardJson.to = contactFields;
    let now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    postcardJson.sendDate = now.toISOString();

    const internalPostcardJson = requestBody.internalPostcardJson;
    const baseUrl = process.env.POSTGRID_API_BASE_URL;

    const postcardConfigOptions = {
      method: 'POST',
      url: internalPostcardJson.messageType === 'Postcards'
        ? baseUrl + 'postcards'
        : baseUrl + 'self_mailers',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-KEY': internalPostcardJson.liveApiKeyEnabled && internalPostcardJson.live_api_key
          ? internalPostcardJson.live_api_key
          : internalPostcardJson.test_api_key
      },
      data: postcardJson
    };

    const postcardCreateCall = await axios.request(postcardConfigOptions);
    if (postcardCreateCall.status === 200 || postcardCreateCall.status === 201) {
      const postcardId = postcardCreateCall.data.id;
      const timestamp = new Date().toISOString();
      
      logToDataExtension(
        `${internalPostcardJson.messageType} created successfully. ID: ${postcardId}`,
        authTSSD, authToken, timestamp, contactKey, 'Success', journeyId, activityId,
        internalPostcardJson.messageType
      );
    } else {
      res.status(500).send('Postcard creation failed');
      return;
    }
  } catch (error) {
    const timestamp = new Date().toISOString();
    logToDataExtension(
      error.response ? JSON.stringify(error.response.data) : error.message,
      authTSSD, authToken, timestamp, contactKey, 'Error', journeyId, activityId,
      requestBody.internalPostcardJson.messageType
    );
    res.status(500).send('Error creating postcard');
    return;
  }
  
  res.status(200).send('Good');
};

/**
 * POST Handler for the /publish/ route of the Activity.
 * This route handles the publish request
 */
exports.publish = function (req, res) {
  res.status(200).send('Publish');
};

/**
 * POST Handler for the /validate/ route of the Activity.
 * This route handles the validate request
 */
exports.validate = function (req, res) {
  res.status(200).send('Validate');
};

/**
 * Logs the provided response data to the Data Extension in Marketing Cloud.
 * This function sends log entries to the Data Extension to track activity execution status.
 * 
 * @param {string} responseData - The response data or error message to log.
 * @param {string} authTSSD - The subdomain of the Marketing Cloud instance.
 * @param {string} authToken - The authentication token for the Marketing Cloud API.
 * @param {string} timeStamp - The timestamp of the log entry.
 * @param {string} contactKey - The contact key related to the request.
 * @param {string} status - The status of the request (e.g., 'Success', 'Error').
 * @param {string} journeyId - The journey ID associated with the activity.
 * @param {string} activityId - The activity ID associated with the activity.
 * @param {string} object - The object type being logged (e.g., 'Postcards').
 */
function logToDataExtension(responseData, authTSSD, authToken, timeStamp, contactKey, status, journeyId, activityId, object) {
  const payload = JSON.stringify({
    'items': [
      {
        'Status': status,
        'Response': responseData,
        'TimeStamp': timeStamp,
        'ContactKey': contactKey,
        'JourneyId': journeyId,
        'ActivityId': activityId,
        'Object': object
      }
    ]
  });

  const logDEKey = 'Postgrid_Logging_Data';

  const config = {
    method: 'post',
    url: `https://${authTSSD}.rest.marketingcloudapis.com/data/v1/async/dataextensions/key:${logDEKey}/rows`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + authToken
    },
    data: payload
  };

  return axios.request(config);
}
