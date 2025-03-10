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
  const internalPostcardJson = requestBody.internalPostcardJson;
  internalPostcardJson.authTSSD = authTSSD;

  let requestData = {
    authTSSD: authTSSD,
    authToken: authToken,
    contactKey: contactKey,
    journeyId: journeyId,
    activityId: activityId,
    object: internalPostcardJson.messageType,
    payload: JSON.stringify(internalPostcardJson)
  };

  try {
    let postcardJson = requestBody.postcardJson;
    const contactFields = requestBody.MapDESchema;
    postcardJson.to = contactFields;
    let now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    postcardJson.sendDate = now.toISOString();

    const baseUrl = process.env.POSTGRID_API_BASE_URL || 'https://api.postgrid.com/print-mail/v1/';

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

      requestData.timestamp = timestamp;
      requestData.responseData = `${internalPostcardJson.messageType} created successfully. ID: ${postcardId}`;
      requestData.status = 'Success';
      
      logToDataExtension(requestData);
    } else {
      res.status(500).send('Postcard creation failed');
      return;
    }
  } catch (error) {
    const timestamp = new Date().toISOString();

    requestData.timestamp = timestamp;
    requestData.responseData = error.response ? JSON.stringify(error.response.data) : error.message;
    requestData.status = 'Error';

    logToDataExtension(requestData);
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
 * Fetches client credentials from Salesforce Marketing Cloud (SFMC) using SOAP API.
 * This function retrieves credentials (Client_Secret, Client_Id) from the specified Data Extension in SFMC.
 *
 * @param {object} req - The request object containing the `authTSSD` (account identifier) and `token` (OAuth token) in the body.
 * @param {object} res - The response object used to send back the data or error response.
 */
exports.fetchClientCredentials = async function (req, res) {
  const { authTSSD, token } = req.body;
  const SFMC_SOAP_URL = `https://${authTSSD}.soap.marketingcloudapis.com/Service.asmx`;
  const xmlData = `<?xml version='1.0' encoding='UTF-8'?>
      <soapenv:Envelope xmlns:soapenv='http://schemas.xmlsoap.org/soap/envelope/' 
          xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' 
          xmlns:xsd='http://www.w3.org/2001/XMLSchema'>
          <soapenv:Header>
              <fueloauth>${token}</fueloauth>
          </soapenv:Header>
          <soapenv:Body>
              <RetrieveRequestMsg xmlns='http://exacttarget.com/wsdl/partnerAPI'>
                  <RetrieveRequest>
                      <ObjectType>DataExtensionObject[PostgridDEforAPI]</ObjectType>
                      <Properties>Client_Secret</Properties>
                      <Properties>Client_Id</Properties>
                  </RetrieveRequest>
              </RetrieveRequestMsg>
          </soapenv:Body>
      </soapenv:Envelope>`;
  try {
    const response = await axios.post(SFMC_SOAP_URL, xmlData, {
      headers: {
        'Content-Type': 'text/xml',
        'Accept': 'text/xml',
        'SoapAction': 'Retrieve'
      }
    });
    res.send(response.data);
  } catch (error) {
    res.status(500).send(error.toString());
  }
};

exports.fetchExternalKey = async function(req, res){
  const { authTSSD, token } = req.body;
  const dataExtensions = ["Postgrid_Logging_Data", "PostgridAPIDE"]; // List of Data Extensions

  for (const dataExtension of dataExtensions) {
      const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
      <s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" 
      xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" 
      xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
          <s:Header>
              <a:Action s:mustUnderstand="1">Retrieve</a:Action>
              <a:To s:mustUnderstand="1">https://${authTSSD}.soap.marketingcloudapis.com/Service.asmx</a:To>
              <fueloauth xmlns="http://exacttarget.com">${token}</fueloauth>
          </s:Header>
          <s:Body xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xmlns:xsd="http://www.w3.org/2001/XMLSchema">
              <RetrieveRequestMsg 
              xmlns="http://exacttarget.com/wsdl/partnerAPI">
                  <RetrieveRequest>
                      <ObjectType>DataExtension</ObjectType>
                      <Properties>CustomerKey</Properties>
                      <Filter xsi:type="SimpleFilterPart">
                          <Property>Name</Property>
                          <SimpleOperator>equals</SimpleOperator>
                          <Value>Postgrid_Logging_Data</Value>
                      </Filter>
                  </RetrieveRequest>
              </RetrieveRequestMsg>
          </s:Body>
      </s:Envelope>`;

      try {
          const response = await fetch(`https://${authTSSD}.soap.marketingcloudapis.com/Service.asmx`, {
              method: "POST",
              headers: {
                  "Content-Type": "text/xml",
                  "SOAPAction": "Retrieve"
              },
              body: soapEnvelope
          });

          const textResponse = await response.text();
          console.log(`Response for Postgrid_Logging_Data: `, textResponse); // Log full response

          // Parse XML response
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(textResponse, "text/xml");

          // Extract CustomerKey from response
          const customerKeyNode = xmlDoc.getElementsByTagName("CustomerKey")[0];
          const customerKey = customerKeyNode ? customerKeyNode.textContent : "Not found";

          console.log(`CustomerKey for ${dataExtension}:`, customerKey);
      } catch (error) {
          console.error(`Error fetching Data Extension: ${dataExtension}`, error);
      }
  }
};


/**
 * Fetches the authentication token from Marketing Cloud.
 * 
 * @param {string} payloadData - A JSON string containing the client credentials (clientId, clientSecret, and authTSSD) required for the authentication request.
 * @returns {string} - The access token received from the Marketing Cloud API.
 */
async function getAuthToken(payloadData){
  payloadData = JSON.parse(payloadData);
  const authTokenPayload = {
    method: 'POST',
    url: `https://${payloadData.authTSSD}.auth.marketingcloudapis.com/v2/token`,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json'
    },
    data: {
      grant_type: 'client_credentials',
      client_id: payloadData.clientId,
      client_secret: payloadData.clientSecret
    }
  };
  let response = await axios.request(authTokenPayload);
  return response.data.access_token;
}

/**
 * Logs the provided response data to the Data Extension in Marketing Cloud.
 * This function sends log entries to the Data Extension to track activity execution status.
 * 
 * @param {object} requestData - The data to be logged to the Data Extension.
 */
async function logToDataExtension(requestData) {
  requestData.authToken = await getAuthToken(requestData.payload);
  const payload = JSON.stringify({
    'items': [
      {
        'Status': requestData.status,
        'Response': requestData.responseData,
        'TimeStamp': requestData.timestamp,
        'ContactKey': requestData.contactKey,
        'JourneyId': requestData.journeyId,
        'ActivityId': requestData.activityId,
        'Object': requestData.object
      }
    ]
  });

  const logDEKey = 'Postgrid_Logging_Data';

  const config = {
    method: 'post',
    url: `https://${requestData.authTSSD}.rest.marketingcloudapis.com/data/v1/async/dataextensions/key:${logDEKey}/rows`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + requestData.authToken
    },
    data: payload
  };

  return axios.request(config);
}
