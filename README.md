# postgrid custom activity
This Node.js-based application is a custom activity for Salesforce Marketing Cloud (SFMC) that interacts with the PostGrid API to send postcards, self-mailers and letters as part of SFMC journeys.

# Node.js Version
This application requires **Node.js version 18.20.7**. Please ensure that you are using this version or a compatible one.

# Install node modules
Run `npm install` to install all the local dependencies

# setup environment variables
POSTGRID_API_BASE_URL=The base URL for the PostGrid API 'https://api.postgrid.com/print-mail/v1/'
PORT=The port the server will run on (default: 3000)

# runnig the application
npm start

# routes available
This custom activity defines the following routes for interaction with SFMC:

1. POST /save/:
  Saves the activity data. Typically used for saving configurations or user input.
2. POST /validate/:
  Validates the data for the activity before performing any further actions.
3. POST /publish/:
  Handles the publishing of the custom activity. Use this to trigger any necessary publishing actions.
4. POST /execute/:
  Executes the core functionality of the custom activity. This interacts with external services (like PostGrid) to perform actions such as sending postcards.
