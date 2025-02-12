define([
  'postmonger',
  '../js/utilities/utilityHelper.js'
], function (
  Postmonger,
  utilitiesHelper
) {
  'use strict';

  var request = require([request]);
  var connection = new Postmonger.Session();
  const base64ToFile = utilitiesHelper.base64ToFile;
  const convertToBase64 = utilitiesHelper.convertToBase64;
  var payload = {};
  var deData = {};
  var previewDEMapOptions = {};
  var authorization = {};
  let deFields = {};
  let previewPayload = {
    isValid: true
  };
  var authToken, et_subdomain, authTSSD;
  let fromContact = {};
  let toContact = '';

  var steps = [ // initialize to the same value as what's set in config.json for consistency        
    { 'label': 'Connect Account', 'key': 'step1' },
    { 'label': 'Select Message type', 'key': 'step2' },
    { 'label': 'Create', 'key': 'step3' },
    { 'label': 'Map Fields', 'key': 'step4' },
    { 'label': 'Preview', 'key': 'step5' }
  ];

  $(window).ready(onRender);

  function onRender() {
    connection.trigger('ready');
    connection.trigger('requestSchema');
    $('#card-insert-type').addClass('hidden');
  }
  const toggleButtonTestKey = $('#toggle-password-test-key');
  const toggleButtonLiveKey = $('#toggle-password-live-key');
  toggleButtonTestKey.on('click', showHideTestKey);
  toggleButtonLiveKey.on('click', showHideLiveKey);
  connection.on('initActivity', initialize);
  connection.on('clickedNext', onClickedNext);
  connection.on('clickedBack', onClickedBack);
  connection.on('gotoStep', onGotoStep);

  connection.on('requestedSchema', function (data) {
    // save schema
    deFields = data['schema'];
    var optionsData = '';
    data['schema'].forEach(ele => {
      //change schema of field so that field with space between can also be render
      optionsData +=`<option value="${ele.name}">${ele.name}</option>`;
      var key = ele.key;
      const myArray = key.split('.');
      var value = myArray[0]+'.'+myArray[1]+'.'+'"'+ele.name+'"';  
      deData[ele.name]=value;        
      //Storing data extension mapping
    });
    $('.mapping-fields-group select').append(optionsData);
    console.log('-------------------shwoign the schema below -------------');
    console.log(data['schema']);
    console.log('showing the DE Data', deData);
    connection.trigger('ready');
  });

  function setFileToInput(base64String, fileName) {
    let file = base64ToFile(base64String, fileName);

    // Use DataTransfer to set the file in the input element
    let dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    $('#pdf-upload')[0].files = dataTransfer.files;
    $('#file-name').text(dataTransfer.files[0].name);
    $('#remove-pdf').show();
  };

  function initialize(data) {
    if (data) {
      payload = data;
      console.log('ggggggggggggggggggggggggggggggggggggggg');
      console.log('Payload on SAVE function: ' + JSON.stringify(payload['arguments'].execute.inArguments));
      console.log(payload);
    }
    var hasPostcardArguments = Boolean(
      payload['arguments'] &&
      payload['arguments'].execute &&
      payload['arguments'].execute.inArguments &&
      payload['arguments'].execute.inArguments.length > 0 &&
      payload['arguments'].execute.inArguments[0].internalPostcardJson
    );
    var hasMapDESchema = Boolean(
      payload['arguments'] &&
      payload['arguments'].execute &&
      payload['arguments'].execute.inArguments &&
      payload['arguments'].execute.inArguments.length > 0 &&
      payload['arguments'].execute.inArguments[0].previewDEMapOptions
    );
    var postcardArguments = hasPostcardArguments ? payload['arguments'].execute.inArguments[0].internalPostcardJson : {};
    previewDEMapOptions = hasMapDESchema ?payload['arguments'].execute.inArguments[0].previewDEMapOptions : {};
    console.log('postcard arguments below');
    console.log(postcardArguments);
    console.log('previewDEMapOptions below');
    console.log('changes should reflect', postcardArguments.test_api_key);
    console.log(previewDEMapOptions);

    // Iterating over every postcardArguments for prepopulating

    $.each(postcardArguments, function(key, value) {
      switch (key) {
      case 'test_api_key':
        $('#test-api-key').val(value).change();
        break;
      case 'live_api_key':
        $('#live-api-key').val(value).change();
        break;
      case 'creationType':
        $('input[name=\'createType\'][value=\'' + value + '\']').prop('checked', true);
        break;
      case 'messageType':
        $('input[name=\'msgType\'][value=\'' + value + '\']').prop('checked', true);
        break;
      case 'description':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' .description';
        console.log('description query: '+queryString);
        $(queryString).val(value);
        break;
      case 'frontTemplateName':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' #frontTemplateInput';
        $(queryString).val(value);
        $(queryString).attr('data-id', postcardArguments.frontTemplateId);
        break;
      case 'backTemplateName':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' #backTemplateInput';
        $(queryString).val(value);
        $(queryString).attr('data-id', postcardArguments.backTemplateId);
        break;
      case 'size':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' input[value="' + value + '"]';
        $(queryString).prop('checked', true);
        break;
      case 'isExpressDelivery':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '') + ' .express-delivery-btn';
        $(queryString).prop('checked', value);
        if(value) {
          var queryStringMailingClass = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '') + ' .mailing-class';
          $(queryStringMailingClass).prop('disabled', true);
        }
        break;
      case 'frontHtmlContent':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '') + ' .html-editor-front';
        $(queryString).val(value);
        break;
      case 'backHtmlContent':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '') + ' .html-editor-back';
        $(queryString).val(value);
        break;
      case 'fromContact' :
        $('#search-contact').val(value.name).change();
        fromContact.id = value.id;
        fromContact.name = value.name;
        console.log('Setting up the names');
        break;
      case 'encodedPdf':
        var base64Data = 'data:application/pdf;base64,'+value;
        setFileToInput(base64Data, postcardArguments['pdfName']);
        break;
      case 'mailingClass':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '') + ' .mailing-class';
        $(queryString).val(value);
        break;
      case 'liveApiKeyEnabled':
        $('.test-to-live-switch input').prop('checked', value).trigger('change');
        break;
      default:
        console.log('Unknown key: ' + key);
      }
    });
    
    connection.trigger('requestTokens');
    connection.trigger('requestEndpoints');
    initializeHandler();

  }
  // Start of Getting Endpoints and AuthToken of Marketing Cloud Instance
  connection.on('requestedEndpoints', onGetEndpoints);
  function onGetEndpoints (endpoints) {
    // Response: endpoints = { restHost: <url> } i.e. "rest.s1.qa1.exacttarget.com"
    console.log('Get End Points function: '+JSON.stringify(endpoints));
    et_subdomain = endpoints.restHost;        
    //{"authTSSD":"https://mcp77m12wgt8vbq2j9n10v1dq.auth.marketingcloudapis.com"}
    authTSSD = (endpoints.authTSSD).split('//')[1].split('.')[0];
  }

  connection.on('requestedTokens', onGetTokens);
  function onGetTokens (tokens) {
    // Response: tokens = { token: <legacy token>, fuel2token: <fuel api token> }
    console.log('Get tokens function: '+JSON.stringify(tokens));
    authToken = tokens.fuel2token;
  }
  // End of Getting Endpoints and AuthToken of Marketing Cloud Instance

  // wizard step *******************************************************************************
  var currentStep = steps[0].key;
  function onClickedNext() {
    switch (currentStep.key) {
    case 'step1':
      if (validateApiKeys()) {
        authenticateApiKeys().then((isAuthenticated) => {
          if (isAuthenticated) {
            // Proceed with the next steps
            handleApiKeyToggle();
            fetchContacts();
            connection.trigger('nextStep');
          } else {
            // Handle authentication failure
            handleValidationFailure();
          }
        }).catch((error) => {
          console.error("Authentication failed:", error);
        });
      }
      else{
        handleValidationFailure();
      }
      break;

    case 'step2':
      if (validateStep2()) {
        $('#step3 .screen').toggle(false);
        let selectedMessageType;

        let selectedRadio = $('input[name="msgType"]:checked');
        if (selectedRadio.length > 0) {
          selectedMessageType = selectedRadio.val().replace(/\s+/g, '');
          console.log("Selected ID:", selectedMessageType);
        } else {
          console.log("No option selected.");
        }

        let isHtml = $('#htmlId').is(':checked');
        let isPdf = $('#pdfId').is(':checked');
        let isExtTemp = $('#extTempId').is(':checked');

        if (isExtTemp) {
          fetchTemplates();
        }

        $(`.${selectedMessageType} > .screen-1`).toggle(isHtml);
        $(`.${selectedMessageType} > .screen-2`).toggle(isPdf);
        $(`.${selectedMessageType} > .screen-3`).toggle(isExtTemp);

        connection.trigger('nextStep');
        createContact();
      } else {
        handleValidationFailure();
      }
      break;

    case 'step3':
      prepopulateToDeMapping();
      $('#dropdown-options').hide();
      if ($('.screen-3').css('display') === 'block') {
        validateStep3() ? proceedToNext() : handleValidationFailure();
      } else {
        validateStep3A()
          .then((isValid) => {
            isValid ? proceedToNext() : handleValidationFailure();
          })
          .catch((error) => {
            console.error('Error during validation:', error);
            handleValidationFailure(); // Handle errors gracefully
          });
      }
      break;

    case 'step4':
        console.log('to contact step: '+toContact);;
        
      if (validateToContact()) {
        getPreviewURL();
      } else {
        handleValidationFailure();
      }
      break;

    case 'step5':
      save();
      break;

    default:
      connection.trigger('nextStep');
    }
  }

  function handleValidationFailure() {
    showStep(currentStep);
    connection.trigger('ready');
  }

  function proceedToNext() {
    setPreviewPayload();
    connection.trigger('nextStep');
  }

  function onClickedBack() {
    connection.trigger('prevStep');
  }

  function onGotoStep(step) {
    showStep(step);
    connection.trigger('ready');
  }

  function showStep(step) {
    currentStep = step;
    $('.step').hide();

    switch (currentStep.key) {
    case 'step1':
      $('#step1').show();
      connection.trigger('updateButton', {
        button: 'back',
        visible: false,
      });
      connection.trigger('updateButton', {
        button: 'next',
        text: 'next',
        visible: true,
      });
      break;
    case 'step2':
      $('#step2').show();
      connection.trigger('updateButton', {
        button: 'back',
        visible: true,
      });
      connection.trigger('updateButton', {
        button: 'next',
        text: 'next',
        visible: true,
      });
      break;
    case 'step3':
      $('#step3').show();
      connection.trigger('updateButton', {
        button: 'back',
        visible: true,
      });
      connection.trigger('updateButton', {
        button: 'next',
        text: 'next',
        visible: true,
      });
      break;
    case 'step4':
      $('#step4').show();
      connection.trigger('updateButton', {
        button: 'back',
        visible: true,
      });
      connection.trigger('updateButton', {
        button: 'next',
        text: 'next',
        visible: true,
      });
      break;
    case 'step5':
      $('#step5').show();
      connection.trigger('updateButton', {
        button: 'back',
        visible: true,
      });
      connection.trigger('updateButton', {
        button: 'next',
        text: 'done',
        visible: true,
      });
      break;
    }
  }

  async function save() {
    payload['arguments'].execute.inArguments = [{}];
    var MapDESchema = {};
    $('.mapping-fields-group select').each(function(){
      var eleID = $(this).attr('id');
      var optionSelect = $(this).find(':selected').val();
      if(optionSelect !== 'Select'){
        MapDESchema[eleID]='{{'+deData[optionSelect]+'}}';
      }
      previewDEMapOptions[eleID]=optionSelect;
    });

    // Coverting PDF in base64
    if (previewPayload.pdf) {
      await convertToBase64(previewPayload.pdf)
        .then((base64String) => {
          previewPayload.encodedPdf = base64String;
          // You can now use this base64String in your logic
        })
        .catch((error) => {
          return;
        });
    }
    previewPayload.xyz = 'live_deepakTest';
    previewPayload.messageType = $('input[name=\'msgType\']:checked').val();
    previewPayload.creationType = $('input[name=\'createType\']:checked').val();
    payload['arguments'].execute.inArguments[0]['internalPostcardJson'] = previewPayload;
    payload['arguments'].execute.inArguments[0]['MapDESchema']=MapDESchema;
    payload['arguments'].execute.inArguments[0]['previewDEMapOptions']=previewDEMapOptions;
    payload['metaData'].isConfigured = true;
    var postCardJson = {
      from: previewPayload.fromContact ? previewPayload.fromContact.id : '',
      size: previewPayload.size,
      sendDate: previewPayload.sendDate,
      express: previewPayload.isExpressDelivery,
      description: previewPayload.description,
    };
    if(!previewPayload.isExpressDelivery) {
        postCardJson.mailingClass = previewPayload.mailingClass;
    }
    if(previewPayload.messageType === 'Postcards'){
      if(previewPayload.creationType === 'HTML'){
        postCardJson.frontHTML = previewPayload.frontHtmlContent;
        postCardJson.backHTML = previewPayload.backHtmlContent;
      } else if(previewPayload.creationType === 'Existing Template'){
        postCardJson.frontTemplate = previewPayload.frontTemplateId;
        postCardJson.backTemplate = previewPayload.backTemplateId;
      } else if(previewPayload.creationType === 'PDF Upload'){
        postCardJson.pdf = previewPayload.pdfLink;
      }
    }
    payload['arguments'].execute.inArguments[0]['postcardJson'] = postCardJson;
    authorization['authToken'] = authToken;
    authorization['et_subdomain'] = et_subdomain;
    authorization['authTSSD'] = authTSSD;
    console.log('authorization', authorization);
    
    payload['arguments'].execute.inArguments[0]['authorization'] = authorization;
    console.log('previewPayload');
    console.log(JSON.stringify(previewPayload));
    console.log('Payload on SAVE function: ' + JSON.stringify(payload['arguments'].execute.inArguments));
    connection.trigger('updateActivity', payload);
  }

  function initializeHandler() {
    executeScreenTwoMethods();
    setDefaultValuesForPostCardHtmlCreation();
  }

  function showHideLiveKey(e) {
    e.preventDefault();

    const icon = $('#toggle-password-live-key i'); // Select the icon inside the button
    const liveKeyInput = $('#live-api-key'); // Select the input field

    if (liveKeyInput.attr('type') === 'text') {
      liveKeyInput.attr('type', 'password'); // Change input type to text
      icon.removeClass('fa-eye').addClass('fa-eye-slash'); // Update icon class
    } else {
      liveKeyInput.attr('type', 'text'); // Change input type back to password
      icon.removeClass('fa-eye-slash').addClass('fa-eye'); // Update icon class
    }
  }

  function showHideTestKey() {
    const icon = $('#toggle-password-test-key i'); // Select the icon inside the button
    const testKeyInput = $('#test-api-key'); // Select the input field

    if (testKeyInput.attr('type') === 'text') {
      testKeyInput.attr('type', 'password'); // Change input type to text
      icon.removeClass('fa-eye').addClass('fa-eye-slash'); // Update icon class
    } else {
      testKeyInput.attr('type', 'text'); // Change input type back to password
      icon.removeClass('fa-eye-slash').addClass('fa-eye'); // Update icon class
    }

  }

  $('#test-api-key').on('input', hideErrorTestKey);
  $('#live-api-key').on('input', hideErrorLiveKey);

  function validateApiKeys() {
    let isValid = true;
    const testApiKey = $('#test-api-key').val().trim();
    const liveApiKey = $('#live-api-key').val().trim();
    const regexForTestApiKey = /^test_sk_[a-zA-Z0-9]{16,}$/;
    const regexForLiveApiKey = /^live_sk_[a-zA-Z0-9]{16,}$/;
    // Validate Test API Key
    if (testApiKey === '') {
      $('#test-api-key').css('border', '1px solid red'); // Highlight input box
      $('#test-api-key-error').text('Missing or invalid authentication').show(); // Show error message
      isValid = false;
    } else if (!regexForTestApiKey.test(testApiKey)) {
      $('#test-api-key').css('border', '1px solid red'); // Highlight input box
      $('#test-api-key-error').text(`Invalid API key: ${testApiKey}`).show(); // Show error message with key value
      isValid = false;
    } else {
      previewPayload.test_api_key = testApiKey;
      $('#test-api-key-error').hide(); // Hide error message if valid
      $('#test-api-key').css('border', ''); // Remove highlight
    }
    // Validate Live API Key (only if it's not empty)
    previewPayload.live_api_key = liveApiKey;
    if (liveApiKey !== '') {
      if (!regexForLiveApiKey.test(liveApiKey)) {
        $('#live-api-key').css('border', '1px solid red'); // Highlight input box
        $('#live-api-key-error').text(`Invalid API key: ${liveApiKey}`).show(); // Show error message with key value
        isValid = false;
        previewPayload.live_api_key = '';
      }
    }
    return isValid;
  }
  
  function hideErrorTestKey() {
    $('#test-api-key').css('border', ''); // Reset border
    $('#test-api-key-error').hide(); // Hide error message
  }
  function hideErrorLiveKey(){
    $('#live-api-key').css('border', ''); // Reset border
    $('#live-api-key-error').hide();
  }

  /* step 2 functions kritika */
  function validateStep2() {
    let isValid = true;
    let errorMessages = [];

    // Validate Message Type
    if (!$('input[name=\'msgType\']:checked').length) {
      errorMessages.push('Message Type is required.');
      isValid = false;
      $('#msgType-error').text('Message Type is required.');
    } else {
      $('#msgType-error').text('');  // Clear error if valid
    }

    // Validate Creation Type
    if (!$('input[name=\'createType\']:checked').length) {
      errorMessages.push('Creation Type is required.');
      isValid = false;
      $('#createType-error').text('Creation Type is required.');
    } else {
      $('#createType-error').text('');  // Clear error if valid
    }

    // Show general error message if any
    if (!errorMessages.length) {
      $('#step2-error').hide();
    } else {
      $('#step2-error').html(errorMessages.join('<br>')).show();
    }

    return isValid;
  }

  function handleApiKeyToggle() {
    if (typeof previewPayload === 'undefined') {
      return;
    }

    const testApiKey = previewPayload.test_api_key || '';
    const liveApiKey = previewPayload.live_api_key || '';
    const $liveModeToggle = $('.test-to-live-switch input');

    if ($liveModeToggle.length === 0) {
      return;
    }

    if (testApiKey && !liveApiKey) {
      previewPayload.liveApiKeyEnabled = false;
      $liveModeToggle.prop('disabled', true).prop('checked', false);
    } else {
      $liveModeToggle.prop('disabled', false);
    }
  }

  $(document).ready(function () {
    const $liveModeToggle = $('.test-to-live-switch input');
    const $errorMessage = $('#liveModeError');
    console.log('Script Loaded: Checking Live Mode Toggle');
    console.log('Live Mode Toggle Found:', $liveModeToggle.length);
    if ($liveModeToggle.length === 0) {
      console.error('Error: Live Mode Toggle input NOT found in the DOM!');
      return; // Exit script if element is missing
    }
    // Attach events to the parent label (because disabled inputs don't fire events)
    $('.test-to-live-switch').on('mouseenter', function () {
      console.log('Hover detected on Live Mode Toggle container');
      if ($liveModeToggle.prop('disabled')) {
        console.log('Live Mode Toggle is Disabled - Showing Error Message');
        $errorMessage.show();
      }
    });
    $('.test-to-live-switch').on('mouseleave', function () {
      console.log('Mouse Left Live Mode Toggle - Hiding Error Message');
      $errorMessage.hide();
    });

    $('.test-to-live-switch input').on('change', function() {
      previewPayload.liveApiKeyEnabled = $(this).is(':checked');
    });
  });

  $('.step2radioBTN').change(function () {
    var isPostcard = $('#postcard').is(':checked');
    var isHtml = $('#htmlId').is(':checked');
    var isPdf = $('#pdfId').is(':checked');
    var isExtTemp = $('#extTempId').is(':checked');

    if (isPostcard) {
      $('#postcardScreen').show();
      $('#postcardScreen > .screen-1').toggle(isHtml);
      $('#postcardScreen > .screen-2').toggle(isPdf);
      $('#postcardScreen > .screen-3').toggle(isExtTemp);
    } else {
      $('#postcardScreen').hide();
    }

    // The "Next" button remains enabled
    connection.trigger('updateButton', {
      button: 'next',
      enabled: true
    });
  });

  function executeScreenTwoMethods() {
    // Handle showing Card Insert checkbox when "Letters" or "Self-Mailer" is selected
    $('input[name="msgType"]').change(function () {

      if (this.id === 'letters' || this.id === 'self-mailer') {
        $('#card-insert-container').addClass('visible'); // Show Card Insert checkbox
        $('.card-insert-wrapper').addClass('visible'); // Show Card Insert wrapper (if needed)
      } else {
        $('#card-insert-container').removeClass('visible'); // Hide Card Insert checkbox
        $('.card-insert-wrapper').removeClass('visible'); // Hide Card Insert wrapper (if needed)
      }
      // If "Self-Mailer" is selected, uncheck "Card Insert"
      if (this.id === 'letters' || this.id === 'self-mailer') {
        $('#card-insert').prop('checked', false).trigger('change'); // Uncheck and trigger change event
      }
    });
    // Show/Hide Card Insert Type section when Card Insert is checked/unchecked
    $('#card-insert').change(function () {

      if (this.checked) {
        $('#card-insert-type').removeClass('hidden'); // Show Card Insert Type section
      } else {
        $('#card-insert-type').addClass('hidden'); // Hide Card Insert Type section
      }
    });
  }

  /* end of step 2 functions kritika */

  /** screen 3A script */
  function setDefaultValuesForPostCardHtmlCreation() {
    $('.postcard-html-editor .html__btn--front').click(function () {
      $(this).addClass('show');
      $('.postcard-html-editor .html__btn--back').removeClass('show');
      $('.html-editor-front').addClass('show');
      $('.html-editor-back').removeClass('show');
    });
    $('.postcard-html-editor .html__btn--back').click(function () {
      $(this).addClass('show');
      $('.postcard-html-editor .html__btn--front').removeClass('show');
      $('.html-editor-front').removeClass('show');
      $('.html-editor-back').addClass('show');
    });

    const today = new Date().toISOString().split('T')[0];
    $('input[type="date"]').each(function () {
      $(this).val(today);
      $(this).attr('min', today);
    });

    $('#pdf-upload').on('change', function () {
      console.log('file type: '+this.files[0].type);
      if (this.files.length > 0 && this.files[0].type === 'application/pdf') {
        $('#file-name').text(this.files[0].name);
        $('#remove-pdf').show();
      } else if (this.files[0].type !== 'application/pdf') {
        $('.drop-pdf .error-msg').text('Invalid file type! Please upload a PDF file.').addClass('show');
      }
    });

    $('#remove-pdf').on('click', function(e) {
      e.preventDefault();

      $('#pdf-upload').val('');
      $('#file-name').text('Drag or Upload PDF');
      $(this).hide();
    });

    $('#drop-area').on('dragover', function (e) {
      e.preventDefault();
    });

    $('#drop-area').on('drop', function (e) {
      e.preventDefault();
      const droppedFile = e.originalEvent.dataTransfer.files[0];
      if (droppedFile && droppedFile.type === 'application/pdf') {
        $('#pdf-upload')[0].files = e.originalEvent.dataTransfer.files;
        $('#file-name').text(droppedFile.name);
      }
    });
  }

  async function validateStep3A() {
    let isValid = true;

    if ($('.screen-2').css('display') === 'block') {
      let isDescriptionValid = validateInputField($('.postcard-pdf-container #description'));
    //   let isSendDateValid = validateInputField($('.postcard-pdf-container #sendDate'));
    
      if (!isDescriptionValid) {
        isValid = false;
      }

      const pdfInput = $('.drop-pdf #pdf-upload')[0]; 

      
      if (pdfInput.files.length > 0) {
        const pdfFile = pdfInput.files[0];

        try {
          const pdfValidationResult = await validatePDFFile(pdfFile);
          if (!pdfValidationResult.isValid) {
            isValid = false;
            $('.drop-pdf .error-msg').text(pdfValidationResult.errorMessage).addClass('show');
          } else {
            $('.drop-pdf .error-msg').removeClass('show');
          }
        } catch (error) {
          console.error('Error validating PDF:', error);
          isValid = false;
        }
      } else {
        $('.drop-pdf .error-msg').text('Please select a PDF file').addClass('show');
        isValid = false;
      }
    }

    if ($('.screen-1').css('display') === 'block') {
      let isDescriptionValid = validateInputField($('.postcard-input-fields #description'));
    //   let isSendDateValid = validateInputField($('.html-screen-wrapper #sendDate'));
    
      if (!isDescriptionValid) {
        isValid = false;
      }
  
      let isPostcardSizeSelected = $('.postcard-html-size input[name="postcardHtmlSize"]:checked').length;
      let frontHtmlContent = $('.html-editor-front').val().trim();
      let backtHtmlContent = $('.html-editor-back').val().trim();
      let postcardHtmlEditorErrorMsg = $('.postcard-html-editor .error-msg');
  
      if (!(isPostcardSizeSelected > 0)) {
        $('.postcard-html-size .error-msg').addClass('show');
        isValid = false;
      } else {
        $('.postcard-html-size .error-msg').removeClass('show');
      }
  
      if (frontHtmlContent === '' || backtHtmlContent === '') {
        isValid = false;
        if (frontHtmlContent === '' && backtHtmlContent === '') {
          postcardHtmlEditorErrorMsg.text('Please enter content in both Front and Back fields.').addClass('show');
        } else if (frontHtmlContent === '') {
          postcardHtmlEditorErrorMsg.text('Please enter content in the Front field.').addClass('show');
        } else {
          postcardHtmlEditorErrorMsg.text('Please enter content in the Back field.').addClass('show');
        }
      } else { 
        postcardHtmlEditorErrorMsg.removeClass('show');
      }
    };

    return isValid;
  }

  function validatePDFFile(pdfFile) {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();

      fileReader.onload = function (event) {
        const typedarray = new Uint8Array(event.target.result);

        pdfjsLib.getDocument(typedarray).promise.then(function (pdf) {
          const numPages = pdf.numPages;
          pdf.getPage(1).then(function (page) {
            const viewport = page.getViewport({ scale: 1 });
            const width = viewport.width;
            const height = viewport.height;

            const pdfDimensions = `${(width / 72).toFixed(2)}x${(height / 72).toFixed(2)}`;
            const selectedPDFDimension = $('.postcard-pdf-size input[name="postcardPDFSize"]:checked').data('dimentions');

            if (numPages !== 2) {
              resolve({
                isValid: false,
                errorMessage: `File has an incorrect number of pages ${numPages} when expecting 2.`
              });
            } else if (pdfDimensions !== selectedPDFDimension) {
              resolve({
                isValid: false,
                errorMessage: `File has incorrect page dimensions ${pdfDimensions} when expecting ${selectedPDFDimension}.`
              });
            } else {
              resolve({ isValid: true });
            }
          }).catch(reject);
        }).catch(reject);
      };

      fileReader.onerror = reject;
      fileReader.readAsArrayBuffer(pdfFile);
    });
  }

  /** screen 3A script */

  function validateInputField(element) {
    if (element.val().trim() === '') {
      element.addClass('error');
      element.siblings('.error-msg').addClass('show');
      return false;
    } else {
      element.removeClass('error');
      element.siblings('.error-msg').removeClass('show');
      return true;
    }
  }

  function setPreviewPayload() {
    if ($('#postcardScreen .screen-1').css('display') === 'block') {
      const description = $('.screen-1 #description').val();
    //   const sendDate = $('.screen-1 #sendDate').val();
      const mailingClass = $('.screen-1 #mailingClass').val();
      const frontHtmlContent = $('.html-editor-front').val();
      const backHtmlContent = $('.html-editor-back ').val();
      const size = $('.postcard-html-size input[name=\'postcardHtmlSize\']:checked').val();
      const isExpressDelivery = $('.postcard-html-express-delivery #expDelivery').is(':checked');

      previewPayload.screen = 'html';
      previewPayload.description = description;
      previewPayload.sendDate = getFormattedDate();
      previewPayload.mailingClass = mailingClass;
      previewPayload.frontHtmlContent = frontHtmlContent;
      previewPayload.backHtmlContent = backHtmlContent;
      previewPayload.size = size;
      previewPayload.isExpressDelivery = isExpressDelivery;
    } else if ($('#postcardScreen .screen-2').css('display') === 'block') {
      const description = $('#postcardScreen .screen-2 #description').val();
    //   const sendDate = $('#postcardScreen .screen-2 #sendDate').val();
      const mailingClass = $('#postcardScreen .screen-2 #mailingClass').val();
      const size = $('.postcard-pdf-size input[name=\'postcardPDFSize\']:checked').val();
      const isExpressDelivery = $('#postcardScreen .screen-2 #expDelivery').is(':checked');
      const pdfInput = $('#postcardScreen .screen-2 #pdf-upload')[0];
      const pdfFile = pdfInput.files[0] ;

      previewPayload.screen = 'pdf';
      previewPayload.description = description;
      previewPayload.sendDate = getFormattedDate();
      previewPayload.mailingClass = mailingClass;
      previewPayload.size = size;
      previewPayload.isExpressDelivery = isExpressDelivery;
      previewPayload.pdf = pdfFile;
      previewPayload.pdfName = pdfFile.name;
    } else if ($('#postcardScreen .screen-3').css('display') === 'block') {
      const description = document.querySelector('#description3').value;
    //   const sendDate = document.querySelector('#sendDate3').value;
      const frontTemplateId = document.querySelector('#frontTemplateInput')?.dataset.id;
      const backTemplateId = document.querySelector('#backTemplateInput')?.dataset.id;
      const size = $('.screen-3 input[name=\'size\']:checked').val();
      const isExpressDelivery = $('.screen-3 #expDelivery').is(':checked');
      const mailingClass = $('.screen-3 #mailingClass3').val();
      const frontTemplateName = $('#frontTemplateInput')?.val();
      const backTemplateName = $('#backTemplateInput')?.val();

      previewPayload.screen = 'existing-template';
      previewPayload.description = description;
      previewPayload.sendDate = getFormattedDate();
      previewPayload.frontTemplateId = frontTemplateId;
      previewPayload.backTemplateId = backTemplateId;
      previewPayload.size = size;
      previewPayload.mailingClass = mailingClass;
      previewPayload.isExpressDelivery = isExpressDelivery;
      previewPayload.frontTemplateName = frontTemplateName;
      previewPayload.backTemplateName = backTemplateName;
    }

    console.log('set preview payload: '+JSON.stringify(previewPayload));
    
  }

  function getFormattedDate() {
    let now = new Date();
    const sendDate = now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(now.getDate()).padStart(2, '0');
    let istOffset = 5.5 * 60 * 60 * 1000; // Convert 5.5 hours to milliseconds
    let istTime = new Date(now.getTime() + istOffset);

    let formattedDate = sendDate;
    let formattedTime = istTime.toISOString().split('T')[1]; // Extract the time part from IST

    
    return `${formattedDate}T${formattedTime}`;
  }

  async function createPostcard() {
    const url = 'https://api.postgrid.com/print-mail/v1/postcards';
    let data;
    
    let headers = {
      'x-api-key': previewPayload.test_api_key,
    };

    console.log('existing template contact '+toContact);
    console.log('preview payload: '+JSON.stringify(previewPayload));

    if(previewPayload.screen === 'pdf'){
      data = new FormData();
      data.append('to', toContact);
      data.append('from', fromContact.id || '');
      data.append('sendDate', previewPayload.sendDate);
      data.append('express', previewPayload.isExpressDelivery);
      data.append('description', previewPayload.description);
      data.append('size',previewPayload.size);
      if(!previewPayload.isExpressDelivery) {
        data.append('mailingClass', previewPayload.mailingClass);
      } 
      data.append('pdf', previewPayload.pdf);
    } else if (previewPayload.screen === 'html') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      data = new URLSearchParams({
        'to': toContact,
        'from': fromContact.id || '',
        'frontHTML': previewPayload.frontHtmlContent,
        'backHTML': previewPayload.backHtmlContent,
        'size': previewPayload.size,
        'sendDate': previewPayload.sendDate,
        'express': previewPayload.isExpressDelivery,
        'description': previewPayload.description,
        'mergeVariables[language]': 'english',
        'metadata[company]': 'PostGrid'
      });
      if (!previewPayload.isExpressDelivery) {
        data.append('mailingClass', previewPayload.mailingClass);
      }
    } else if(previewPayload.screen === 'existing-template') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      
      data = new URLSearchParams({
        'to': toContact,
        'from': fromContact.id || '',
        frontTemplate: previewPayload.frontTemplateId,
        backTemplate: previewPayload.backTemplateId,
        size: previewPayload.size,
        sendDate: previewPayload.sendDate,
        description: previewPayload.description,
        'express': previewPayload.isExpressDelivery,
      });
      if (!previewPayload.isExpressDelivery) {
        data.append('mailingClass', previewPayload.mailingClass);
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: data
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(`HTTP error! Status: ${response.status}, Message: ${JSON.stringify(errorResponse.error)}`);
      }

      const result = await response.json();
      previewPayload.pdfLink = result.uploadedPDF;

      return result;
    } catch (error) {
      console.error('Error creating postcard:', error.message);
      throw error;
    }
  }

  async function fetchPostcardDetails(postcardId) {
    const apiUrl = `https://api.postgrid.com/print-mail/v1/postcards/${postcardId}?expand[]=frontTemplate&expand[]=backTemplate`;
    const apiKey = previewPayload.test_api_key; 

    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching postcard details:', error);
      throw error;
    }
  }

  async function showPdfPreview(postcardId) {
    try {
      $('#pdf-preview').attr('src', '');
      $('#pdf-preview-container').css('display', 'none');
      $('.retry-preview-btn').css('display', 'none');
      $('.preview-message').css('display', 'none');
      const postcardDetails = await fetchPostcardDetails(postcardId);
      const pdfUrl = postcardDetails.url;
      console.log('PDF URL:', pdfUrl);
      connection.trigger('nextStep');
      if (pdfUrl) {
        $('.retry-preview-btn').css('display', 'inline-block');
        $('.preview-message').css('display', 'inline-block');
        $('.retry-btn-wrap .loader').removeClass('show');
        $('.retry-preview-btn').off('click').on('click', function() {
          console.log('Show Preview button clicked!');
          $('#pdf-preview').attr('src', pdfUrl + '#toolbar=0&navpanes=0');
          $('#pdf-preview-container').css('display', 'block');
          $('.retry-preview-btn').css('display', 'none');
          $('.preview-message').css('display', 'none');
        });
      } else {
        console.warn('No PDF URL received!');
        $('#pdf-preview-container').css('display', 'none');
        $('.retry-preview-btn').css('display', 'none');
        $('.preview-message').css('display', 'block');
        $('.retry-btn-wrap .loader').addClass('show');
        setTimeout(() => {
            showPdfPreviewRetry(postcardId);
        }, 2000);
      }
    } catch (error) {
      console.error('Error fetching PDF Preview:', error);
      $('#pdf-preview-container').css('display', 'none');
      $('.retry-preview-btn').css('display', 'none');
      $('.preview-message').css('display', 'block');
    }
  }

  async function showPdfPreviewRetry(postcardId) {
    const postcardDetails = await fetchPostcardDetails(postcardId);
    const pdfUrl = postcardDetails.url;

    if (pdfUrl) {
        $('.retry-preview-btn').css('display', 'inline-block');
        $('.retry-btn-wrap .loader').removeClass('show');
        $('.retry-preview-btn').off('click').on('click', function() {
          console.log('Show Preview button clicked!');
          $('#pdf-preview').attr('src', pdfUrl + '#toolbar=0&navpanes=0');
          $('#pdf-preview-container').css('display', 'block');
          $('.retry-preview-btn').css('display', 'none');
          $('.preview-message').css('display', 'none');
        });
      } else {
        console.warn('No PDF URL received!');
        $('#pdf-preview-container').css('display', 'none');
        $('.retry-preview-btn').css('display', 'none');
        $('.preview-message').css('display', 'block');
        setTimeout(() => {
            showPdfPreviewRetry(postcardId);
        }, 2000);
      }
  }

  async function getPreviewURL () {
    try {
      const postcardResponse = await createPostcard();
      const postcardId = postcardResponse.id;
      previewPayload.postcardId = postcardId;

      setTimeout(async function() {
        await showPdfPreview(postcardId);
      }, 2000);

    } catch (error) {
      $('.preview-container .retry-preview-btn').addClass('show');
      $('#pdf-preview-container').css('display','none');
      $('.pdf-preview-error-msg').text('Failed to fetch preview.');

    }
  }

  function createContact () {
    const url = 'https://api.postgrid.com/print-mail/v1/contacts';
                
    // Data payload (form-encoded)
    const formData = new URLSearchParams();
    formData.append('firstName', 'Kevin');
    formData.append('lastName', 'Smith');
    formData.append('companyName', 'PostGrid');
    formData.append('addressLine1', '20-20 bay st');
    formData.append('addressLine2', 'floor 11');
    formData.append('city', 'toronto');
    formData.append('provinceOrState', 'ON');
    formData.append('email', 'kevinsmith@postgrid.com');
    formData.append('phoneNumber', '9059059059');
    formData.append('jobTitle', 'Manager');
    formData.append('postalOrZip', 'M5J 2N8');
    formData.append('country', 'CA');
    formData.append('countryCode', 'CA');
    formData.append('description', 'Kevin Smith\'s contact information');
    formData.append('metadata[friend]', 'no');
    formData.append('skipVerification', 'false');
    formData.append('forceVerifiedStatus', 'false');

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': previewPayload.test_api_key
      },
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        console.log('Contact Created:', data);
        toContact = data.id;
        console.log('to contact: '+toContact);;
        
      })
      .catch(error => {
        console.error('Error:', error);
      });
  }

  $('.preview-container .retry-preview-btn').click(async function() {
    await showPdfPreview(previewPayload.postcardId);
  });

  $('.express-delivery-btn').on('click', function() {
    var isChecked = $(this).prop('checked');
    var mailingClass = $(this).closest('.spacer').find('.mailing-class');
    
    if (isChecked) {
      mailingClass.prop('disabled', true);
    } else {
      mailingClass.prop('disabled', false);
    }
  });

  /** screen 4 script */
  let timeoutId;
  function fetchContacts(searchQuery) {
    $.ajax({
      url: 'https://api.postgrid.com/print-mail/v1/contacts', // Replace with your API endpoint
      method: 'GET',
      data: searchQuery ? { search: searchQuery, limit: 10 } : { limit: 10 },
      headers: {
        'x-api-key': previewPayload.test_api_key// Replace with your API key
      },
      success: function (response) {
        // Clear existing options
        $('#dropdown-options').empty();


        // Populate the dropdown with new options
        response.data.forEach(function (contact) {
          $('#dropdown-options').append(
            $('<div>').text(contact.firstName ? contact.firstName : contact.companyName).data('contact', contact)
          );
        });

        // Show the dropdown if there are results
        if (response.data.length > 0) {
          $('#dropdown-options').show();
        } else {
          $('#dropdown-options').hide();
        }
      },
      error: function (xhr, status, error) {
        console.error('Error fetching contacts:', error);
      }
    });
  }

  function debounce(func, delay) {
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(context, args), delay);
    };
  }

  const debouncedFetchContacts = debounce(fetchContacts, 300);

  $('#search-contact').on('input', function () {
    const searchQuery = $(this).val();
    if (searchQuery.length > 2) { // Only search if the input has more than 2 characters
      debouncedFetchContacts(searchQuery);
    } else {
      $('#dropdown-options').empty().hide();
    }
  });

  $('#dropdown-options').on('click', 'div', function () {
    const contact = $(this).data('contact');
    var contactValue = contact.firstName ? contact.firstName : contact.companyName
    $('#search-contact').val(contactValue); // Set the selected contact name in the input
    $('#dropdown-options').hide(); // Hide the dropdown
    fromContact.id = contact.id;
    fromContact.name = contactValue;
  });

  $(document).on('click', function (event) {
    if (!$(event.target).is('#dropdown-options, #search-contact') && $(event.target).closest('#step4').length) {
      $('#dropdown-options').hide();
    }
  });

  $('#search-contact').on('focus', function () {
    const searchQuery = $(this).val().trim();
    if ($('#dropdown-options').is(':hidden')) {
      if (searchQuery === '' && $('#dropdown-options div').length == 0) {
        fetchContacts(); // Fetch default contacts if input is empty
      } else {
        $('#dropdown-options').show(); // Show dropdown if it was hidden
      }
    }
  });

  function validateToContact() {
    let isValid = true;
    previewPayload.fromContact = fromContact;
    resetToContactMappingErrors();
    let requiredFields = ['#addressLine1', '#firstName', '#companyName', '#city', '#provinceOrState', '#countryCode'];
    let isAnyFieldEmpty = false;
    requiredFields.forEach(selector => {
      let value = $(selector).val();
      // Special validation for First Name or Company (one must be selected)
      if (selector === '#firstName' || selector === '#companyName') {
        if ($('#firstName').val() === 'Select' && $('#companyName').val() === 'Select') {
          $('#firstName, #companyName').css('border', '2px solid red');
          isAnyFieldEmpty = true;
        }
      } else {
        if (value === 'Select') {
          $(selector).css('border', '2px solid red');
          isAnyFieldEmpty = true;
        }
      }
    });
    if (isAnyFieldEmpty) {
      $('.error-message-contactMapping').text('Please fill all required fields.').css('color', 'red').show();
      isValid = false;
    }
    return isValid;
  }

  // Handling * in Company Label based on First Name selection
$('.mapping-fields-group #firstName').change(function () {
  var firstNameValue = $(this).val();
  var companyLabel = $('.mapping-fields-group label[for="companyName"]');

  if (firstNameValue !== 'Select') {
      companyLabel.text('Company'); // Remove *
  } else {
      companyLabel.text('Company *'); // Add * back
  }
});

// Handling * in First Name Label based on Company selection
$('.mapping-fields-group #companyName').change(function () {
  var companyValue = $(this).val();
  var firstNameLabel = $('.mapping-fields-group label[for="firstName"]');

  if (companyValue !== 'Select') {
      firstNameLabel.text('First Name'); // Remove *
  } else {
      firstNameLabel.text('First Name *'); // Add * back
  }
});


  function resetToContactMappingErrors() {
    $('.mapping-fields-group select').css('border', ''); // Reset border styles
    $('.error-message-contactMapping').text('').hide(); // Clear and hide error messages
  }
  $('.mapping-fields-group select').on('click', function () {
    resetToContactMappingErrors();
  });
  
  /** screen 4 script */

  /** screen 3C script */
  function validateStep3() {
    let isValid = true;
    // Remove previous error messages and red borders
    $('.error-message').remove();
    $('.error-field').removeClass('error-field');
    let today = new Date().toISOString().split('T')[0];
    $('#sendDate3').attr('min', today);
    if (!$('#description3').val().trim()) {
      $('#description3').after('<span class="error-message">The input value is missing.</span>');
      $('#description3').addClass('error-field');
      isValid = false;
    }
    // let selectedDate = $('#sendDate3').val();
    // if (!selectedDate || selectedDate < today) {
    //   $('#sendDate3').after('<span class="error-message">Send Date cannot be in the past.</span>');
    //   $('#sendDate3').addClass('error-field');
    //   isValid = false;
    // }
    if (!$('#mailingClass3').val()) {
      $('#mailingClass3').after('<span class="error-message">Mailing Class is required.</span>');
      $('#mailingClass3').addClass('error-field');
      isValid = false;
    }
    if (!$('input[name="size"]:checked').length) {
      $('.radio-buttons').after('<span class="error-message">Please select at least one size.</span>');
      isValid = false;
    }
    // Validate Front Template
    if (!$('#frontTemplateInput').val().trim()) {
      $('#frontTemplateInput').after('<span class="error-message">Please select the Front Template.</span>');
      $('#frontTemplateInput').addClass('error-field');
      isValid = false;
    }
    // Validate Back Template
    if (!$('#backTemplateInput').val().trim()) {
      $('#backTemplateInput').after('<span class="error-message">Please select the Back Template.</span>');
      $('#backTemplateInput').addClass('error-field');
      isValid = false;
    }
    return isValid;
  }
  // Remove error messages dynamically when the user starts typing
  $(document).ready(function() {
    $('input, textarea, select').on('input change', function() {
      $(this).removeClass('error-field'); // Remove red border
      $(this).next('.error-message').remove(); // Remove error message
    });
  });

  $(document).ready(function () {
    let today = new Date().toISOString().split('T')[0];
    $('#sendDate3').val(today); // Set default value
    $('#sendDate3').attr('min', today); // Restrict past dates
  });

  function lazyInvoke(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  async function fetchTemplates(searchQuery = '') {
    const requestOptions = {
      method: 'GET',
      headers: { 'x-api-key': previewPayload.test_api_key },
      redirect: 'follow'
    };

    try {
      const response = await fetch(`https://api.postgrid.com/print-mail/v1/templates?limit=10&search=${encodeURIComponent(searchQuery)}`, requestOptions);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const dataJson = await response.json();
      const data = dataJson.data;

      // Sort data by description
      const sortedData = data.sort((a, b) => {
        const descriptionA = a.description ? a.description.toString().toLowerCase() : '';
        const descriptionB = b.description ? b.description.toString().toLowerCase() : '';
        return descriptionA.localeCompare(descriptionB);
      });

      // Populate dropdowns with sorted data
      populateDropdown('frontTemplateList', sortedData);
      populateDropdown('backTemplateList', sortedData);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }

  function populateDropdown(listId, templates) {
    const $list = $('#' + listId);
    
    if (!$list.length) {
      console.error(`Dropdown list with ID ${listId} not found.`);
      return;
    }

    $list.empty();

    templates.forEach(template => {
      const $listItem = $('<li>')
        .text(template.description || 'No description')
        .attr('data-id', template.id)
        .addClass('dropdown-item')
        .on('click', function () {
          selectTemplate(listId, template);
          $list.hide(); // Hide dropdown after selection
        });

      $list.append($listItem);
    });

  }

  function selectTemplate(listId, template) {
    const inputId = listId === 'frontTemplateList' ? 'frontTemplateInput' : 'backTemplateInput';
    const inputElement = document.getElementById(inputId);
    if (inputElement) {
      inputElement.value = template.description || 'No description';
      inputElement.dataset.id = template.id; // Store ID for later use
    } else {
      console.error(`Input element with ID ${inputId} not found.`);
    }
  }

  $('#frontTemplateInput').on('focus', function () {
    $('#frontTemplateList').show();
  });

  $('#backTemplateInput').on('focus', function () {
    $('#backTemplateList').show();
  });

  $(document).on('click', function (event) {
    const isClickInsideFront = $(event.target).closest('#frontTemplateList, #frontTemplateInput').length > 0;
    const isClickInsideBack = $(event.target).closest('#backTemplateList, #backTemplateInput').length > 0;

    if (!isClickInsideFront) {
      $('#frontTemplateList').hide();
    }
    if (!isClickInsideBack) {
      $('#backTemplateList').hide();
    }
  });

  $('#frontTemplateInput').on('input', lazyInvoke(function () {
    const searchQuery = $(this).val().trim();
    fetchTemplates(searchQuery);
  }, 300));

  $('#backTemplateInput').on('input', lazyInvoke(function () {
    const searchQuery = $(this).val().trim();
    fetchTemplates(searchQuery);
  }, 300));

  /** screen 3C script */
  /* Method for Prepopulating TO Mapping */
  function prepopulateToDeMapping(){
    $.each(previewDEMapOptions, function(key, value) {
      switch (key) {
      case 'firstName':
        $('#firstName').val(value).change();  
        break;
      case 'lastName':
        $('#lastName').val(value).change();
        break;
      case 'companyName':
        $('#companyName').val(value).change();
        break;
      case 'email':
        $('#email').val(value).change();
        break;
      case 'addressLine1':
        $('#addressLine1').val(value).change();
        break;
      case 'addressLine2':
        $('#addressLine2').val(value).change();
        break;
      case 'city':
        $('#city').val(value).change();
        break;
      case 'provinceOrState':
        $('#provinceOrState').val(value).change();
        break;
      case 'countryCode':
        $('#countryCode').val(value).change();
        break;
      case 'postalOrZip':
        $('#postalOrZip').val(value).change();
        break;
      default:
        console.log('Unknown DE Map: ' + key);
      }
    });
  }

  /* Method for Authentication API */
  async function authenticateApiKeys(){
    const testApiKey = $('#test-api-key').val().trim();
    const liveApiKey = $('#live-api-key').val().trim();
    let isValid = true;

    const url = 'https://api.postgrid.com/print-mail/v1/contacts?limit=1';
    if(testApiKey){
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-api-key': testApiKey
          }
        });
  
        if (!response.ok) {
          $('#test-api-key').css('border', '1px solid red'); // Highlight input box
          $('#test-api-key-error').text(`Invalid API key: ${testApiKey}`).show(); 
          console.log(response);
          
          isValid =  false;
        }
      } catch (error) {
        console.error('Error Validating TestApiKey:', error.message);
        throw error;
      }
    }
    if(liveApiKey){
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-api-key': liveApiKey
          }
        });
  
        if (!response.ok) {
          $('#live-api-key').css('border', '1px solid red'); // Highlight input box
          $('#live-api-key-error').text(`Invalid API key: ${liveApiKey}`).show();
          isValid = false;
        }
      } catch (error) {
        console.error('Error Validating TestApiKey:', error.message);
        throw error;
      }
    }

    return isValid;
  }

  
});