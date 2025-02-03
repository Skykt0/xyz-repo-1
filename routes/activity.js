'use strict';
// Deps
/*
 * POST Handler for / route of Activity (this is the edit route).
 */
exports.edit = function (req, res) {

  // console.log("5 -- For Edit");
  // console.log("Edited: ", req);
  res.send(200, 'Edit');
};
/*
 * POST Handler for /save/ route of Activity.
 */
exports.save = function (req, res) {

  // console.log("5 -- For Save");
  // console.log("Saved: ", req);
  res.send(200, 'Save');
};

/*
 * POST Handler for /execute/ route of Activity.
 */
exports.execute = function (req, res) {
  try {
    console.log('execute work');
    console.log('req body : ', req.body);

  } catch (error) {
    console.log(error.response);
  }
  res.send(200, 'good');
};

/*
 * POST Handler for /publish/ route of Activity.
 */
exports.publish = function (req, res) {
  // console.log("5 -- For Publish");
  // console.log("Published: " + req);
  res.send(200, 'Publish');
};
/*
 * POST Handler for /validate/ route of Activity.
 */
exports.validate = function (req, res) {
  console.log('Validated: ' + client);
  res.send(200, 'Validate');
};


