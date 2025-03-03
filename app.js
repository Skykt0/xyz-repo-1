require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const credentialPath = '../../public/js/credentials.json'
const path = require('path');
var activity = require('./routes/activity');
const app = express();

app.use(express.static(path.join(__dirname, '/public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.post("/retrieveData", async (req, res) => {
    console.log('body: '+JSON.stringify(req.body));
    
    const { authTSSD, token } = req.body;
   const SFMC_SOAP_URL = `https://${authTSSD}.soap.marketingcloudapis.com/Service.asmx`;
   console.log('url: '+SFMC_SOAP_URL);
   
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" 
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xmlns:xsd="http://www.w3.org/2001/XMLSchema">
        <soapenv:Header>
            <fueloauth>${token}</fueloauth>
        </soapenv:Header>
        <soapenv:Body>
            <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
                <RetrieveRequest>
                    <ObjectType>DataExtensionObject[PostgridDEforAPI]</ObjectType>
                    <Properties>LiveKey</Properties>
                    <Properties>TestKey</Properties>
                    <Properties>Client_Secret</Properties>
                    <Properties>Client_Id</Properties>
                </RetrieveRequest>
            </RetrieveRequestMsg>
        </soapenv:Body>
    </soapenv:Envelope>`;

    try {
        const response = await axios.post(SFMC_SOAP_URL, xmlData, {
            headers: {
                "Content-Type": "text/xml",
                "Accept": "text/xml",
                "SoapAction": "Retrieve"
            }
        });
        let responseData = response.data;
        let parser = new DOMParser();
        let xmlDoc = parser.parseFromString(responseData, "text/xml");

        let properties = xmlDoc.getElementsByTagName("Property");
        let result = {};

        for (let i = 0; i < properties.length; i++) {
            let name = properties[i].getElementsByTagName("Name")[0].textContent;
            let value = properties[i].getElementsByTagName("Value")[0].textContent;
            result[name] = value;
        }
        fs.writeFileSync(credentialPath, JSON.stringify(result));
        res.send(response.data); 
    } catch (error) {
        res.status(500).send(error.toString());
    }
});
app.post('/save/', activity.save);
app.post('/validate/', activity.validate);
app.post('/publish/', activity.publish);
app.post('/execute/', activity.execute);

const PORT = process.env.PORT || 3000;

app.listen(PORT);