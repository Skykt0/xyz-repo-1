define([
  'postmonger'
], function (
  Postmonger
) {
  'use strict';
  var request = require([request]);
  var connection = new Postmonger.Session();
  var payload = {};
  let deFields;
  let selectedFieldsForMapping = {};
  let previewPayload = {
    test_api_key: 'test_sk_uQXxwmGMghWwG5wEfezZVN'
  };
  let fromContact = '';

  var steps = [ // initialize to the same value as what's set in config.json for consistency        
    { 'label': 'Connect Account', 'key': 'step1' },
    { 'label': 'Select Message type', 'key': 'step2' },
    { 'label': 'Create', 'key': 'step3' },
    { 'label': 'Map Fields', 'key': 'step4' },
    { 'label': 'Preview', 'key': 'step5' }
  ];

  $(window).ready(onRender);

  function onRender() {
    console.log('onRender()************************************************************');
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
    console.log('*** Schema ***', data['schema']);
    deFields = data['schema'];
    populateDropdowns();
  });

  function initialize(data) {
    console.log('initialize()************************************************************');
    if (data) {
      payload = data;
    }
    initializeHandler();
  }

  // wizard step *******************************************************************************
  var currentStep = steps[0].key;
  function onClickedNext() {
    console.log('onClickedNext() ************************************************************');

    switch (currentStep.key) {
    case 'step1':
      if (validateApiKeys()) {
        connection.trigger('nextStep');
      } else {
        handleValidationFailure();
      }
      break;

    case 'step2':
      if (validateStep2()) {
        console.log('validate--*************' + validateStep2());
        connection.trigger('nextStep');
      } else {
        handleValidationFailure();
      }
      break;

    case 'step3':
      console.log('inside step 3');
      if ($('.screen-3').css('display') === 'block') {
        validateStep3() ? proceedToNext() : handleValidationFailure();
      } else {
        validateStep3A() ? proceedToNext() : handleValidationFailure();
      }
      break;

    case 'step4':
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
    console.log('set preview start');
    
    setPreviewPayload();
    connection.trigger('nextStep');
  }


  function onClickedBack() {
    console.log('onClickedBack()************************************************************');
    connection.trigger('prevStep');
  }

  function onGotoStep(step) {
    console.log('onGotoStep()************************************************************', step);
    showStep(step);
    connection.trigger('ready');
  }

  function showStep(step) {

    console.log('showStep()************************************************************');
    currentStep = step;

    $('.step').hide();

    switch (currentStep.key) {
    case 'step1':
      console.log('case step1************************************************************');
      $('#step1').show();
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
    case 'step2':
      console.log('case step2************************************************************');
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
      console.log('case step3************************************************************');
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
      console.log('case step4************************************************************');
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
      console.log('case step5************************************************************');
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


  function save() {
    console.log('save()************************************************************');
    payload['arguments'].execute.inArguments = [{}];
    connection.trigger('updateActivity', payload);
  }


  function initializeHandler() {
    console.log('inside initializehandelloer');
    executeScreenTwoMethods();
    setDefaultValuesForPostCardHtmlCreation();
  }


  function showHideLiveKey(e) {
    e.preventDefault();
    console.log('inside showHideLiveKey');

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
    console.log('inside showHideTestKey');
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
    console.log('inside validate api keys function');
    let isValid = true;
    const testApiKey = $('#test-api-key').val().trim();
    const liveApiKey = $('#live-api-key').val().trim();
    const regexForTestApiKey = /^test_sk_[a-zA-Z0-9]{16,}$/;
    const regexForLiveApiKey = /^live_sk_[a-zA-Z0-9]{16,}$/;
    if (testApiKey === '') {
      $('#test-api-key').css('border', '1px solid red'); // Highlight input box
      $('#test-api-key-error').show(); // Show error message
      isValid = false;
    }
    else if(!regexForTestApiKey.test(testApiKey)){
      $('#test-api-key').css('border', '1px solid red'); // Highlight input box
      $('#test-api-key-error').text('Enter a valid API key.').show();
      isValid =  false;
    }

    // checking Live API key if it is not empty
    if(liveApiKey !== ''){
      if(!regexForLiveApiKey.test(liveApiKey)){
        $('#live-api-key').css('border', '1px solid red'); // Highlight input box
        $('#live-api-key-error').text('Enter a valid API key or leave it blank.').show();
        isValid =  false;
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

  //start of adding * in Company Label 
  $('.mapping-fields-group #first-name').change(function () {
    var firstNameValue = $(this).val();
    var companyLabel = $('.mapping-fields-group label[for=\'company\']');
  
    if (firstNameValue !== 'Select') {
      companyLabel.text('Company'); // Remove *
    } else {
      companyLabel.text('Company *'); // Add * back
    }
  });

  $('#company').change(function () {
    var selectedValue = $(this).val();
    let firstNameValue =$('.mapping-fields-group label[for=\'first-name\']');

    if (selectedValue !== 'Select') {
        firstNameValue.text('First Name'); // Remove *
      } else {
        firstNameValue.text('First Name *'); // Add * back
      }
});

  //end of adding * in Company Label

  //   $('#test-api-key').on('input', hideError);
  //   function validateApiKeys() {
  //     console.log('inside validate api keys function');

  //     const testApiKey = $('#test-api-key').val().trim();

  //     if (testApiKey === '') {
  //       $('#test-api-key').css('border', '1px solid red'); // Highlight input box
  //       $('#test-api-key-error').show(); // Show error message
  //       return false;
  //     }
  //     return true;

  //   }

  function hideError() {
    $('#test-api-key').css('border', ''); // Reset border
    $('#test-api-key-error').hide(); // Hide error message
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
        console.log('Radio button changed:', this.id);
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
        console.log('Card Insert checkbox changed:', this.checked);
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
      $(this).val(today);  // Set default value
      $(this).attr('min', today);  // Set minimum selectable date
    });

    $('#pdf-upload').on('change', function () {
      if (this.files.length > 0 && this.files[0].type === 'application/pdf') {
        $('#file-name').text(this.files[0].name);
      }
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

  function validateStep3A() {
    let isValid = true;

    if ($('.screen-2').css('display') === 'block') {
        if(!validateInputField($('.postcard-pdf-container #description')) || !validateInputField($('.postcard-pdf-container #sendDate'))) {
            isValid = false;
          }
  
        const pdfInput = $('.drop-pdf #pdf-upload')[0]; // Get file input element
        if (pdfInput.files.length > 0) {
          const pdfFile = pdfInput.files[0] ;
  
          const fileReader = new FileReader();
      
          fileReader.onload = function(event) {
            const typedarray = new Uint8Array(event.target.result);
            pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
              const numPages = pdf.numPages;
              pdf.getPage(1).then(function(page) {
                const viewport = page.getViewport({ scale: 1 });
                const width = viewport.width;
                const height = viewport.height;
  
                const pdfDimensions = `${(width / 72).toFixed(2)}x${(height / 72).toFixed(2)}`;
                const selectedPDFDimention = $('.postcard-pdf-size input[name="postcardPDFSize"]:checked').data('dimentions');
  
                console.log(`PDF Dimensions: ${pdfDimensions} inches`);
                if(numPages !== 2) {
                  $('.drop-pdf .error-msg').text(`File has an incorrect number of pages ${numPages} when expecting 2.`).addClass('show');
                } else if (pdfDimensions !== selectedPDFDimention) {
                  $('.drop-pdf .error-msg').text(`File has incorrect page dimensions ${pdfDimensions} when expecting ${selectedPDFDimention}.`).addClass('show');
                } else {
                  $('.drop-pdf .error-msg').removeClass('show');
                }
              });
            }).catch(function(error) {
              console.error('Error loading PDF:', error);
              isValid = false;
            });
          };
          fileReader.readAsArrayBuffer(pdfFile);
        } else {
          console.log('No file selected. Please select a file.');
          $('.drop-pdf .error-msg').addClass('show');
          isValid = false;
        }

        if($('.pdf-error').hasClass('show')){
            isValid = false;
        }
      }
    if ($('.screen-1').css('display') === 'block') {
      if(!validateInputField($('.postcard-input-fields #description')) || !validateInputField($('.html-screen-wrapper #sendDate'))) {
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

    console.log('isValid: '+isValid);
    
    return isValid;
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
    console.log('set preview called');
    
    if ($('#postcardScreen .screen-1').css('display') === 'block') {
      const description = $('.screen-1 #description').val();
      const sendDate = $('.screen-1 #sendDate').val();
      const mailingClass = $('.screen-1 #mailingClass').val();
      const frontHtmlContent = $('.html-editor-front').val();
      const backHtmlContent = $('.html-editor-back ').val();
      const size = $('.postcard-html-size input[name=\'postcardHtmlSize\']:checked').val();
      const isExpressDelivery = $('.postcard-html-express-delivery #expDelivery').is(':checked');

      previewPayload.screen = 'html';
      previewPayload.description = description;
      previewPayload.sendDate = sendDate;
      previewPayload.mailingClass = mailingClass;
      previewPayload.frontHtmlContent = frontHtmlContent;
      previewPayload.backHtmlContent = backHtmlContent;
      previewPayload.size = size;
      previewPayload.isExpressDelivery = isExpressDelivery;
    } else if ($('#postcardScreen .screen-2').css('display') === 'block') {
      console.log('screen-2 pdf preview should be shown');
      const description = $('#postcardScreen .screen-2 #description').val();
      const sendDate = $('#postcardScreen .screen-2 #sendDate').val();
      const mailingClass = $('#postcardScreen .screen-2 #mailingClass').val();
      const size = $('.postcard-pdf-size input[name=\'postcardPDFSize\']:checked').val();
      const isExpressDelivery = $('#postcardScreen .screen-2 #expDelivery').is(':checked');
      const pdfInput = $('#postcardScreen .screen-2 #pdf-upload')[0];
      const pdfFile = pdfInput.files[0] ;

      previewPayload.screen = 'pdf';
      previewPayload.description = description;
      previewPayload.sendDate = sendDate;
      previewPayload.mailingClass = mailingClass;
      previewPayload.size = size;
      previewPayload.isExpressDelivery = isExpressDelivery;
      previewPayload.pdf = pdfFile;
      console.log('Selected file:', pdfFile.name);
      console.log('File size:', pdfFile.size, 'bytes');
      console.log('File type:', pdfFile.type);
    } else if ($('#postcardScreen .screen-3').css('display') === 'block') {
      console.log('ex template set preview');
        
      const description = document.querySelector('#description3').value;
      const sendDate = document.querySelector('#sendDate3').value;
      const frontTemplateId = document.querySelector('#frontTemplateInput')?.dataset.id;
      const backTemplateId = document.querySelector('#backTemplateInput')?.dataset.id;
      const size = $('.screen-3 input[name=\'size\']:checked').val();
      if (!frontTemplateId || !backTemplateId || !size) {
        console.error('Missing required fields for postcard creation.');
        return null;
      }
      previewPayload.screen = 'existing-template';
      previewPayload.description = description;
      previewPayload.sendDate = sendDate;
      previewPayload.frontTemplateId = frontTemplateId;
      previewPayload.backTemplateId = backTemplateId;
      previewPayload.size = size;
    }
  }

  async function createPostcard() {
    const url = 'https://api.postgrid.com/print-mail/v1/postcards';
    let data;
    
    let headers = {
      'x-api-key': previewPayload.test_api_key,
    };

    console.log('ex template : '+JSON.stringify(previewPayload));

    if(previewPayload.screen === 'pdf'){
      console.log('inside the create postcard function');
      data = new FormData();
      data.append('to', 'contact_hGsXV82wSiv6wpta1uXf5M');
      data.append('from', fromContact);
      data.append('sendDate', previewPayload.sendDate);
      data.append('express', previewPayload.isExpressDelivery);
      data.append('description', previewPayload.description);
      data.append('size',previewPayload.size);
      data.append('mailingClass', previewPayload.mailingClass);
      data.append('pdf', previewPayload.pdf);
    } else if (previewPayload.screen === 'html') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      data = new URLSearchParams({
        'to': 'contact_hGsXV82wSiv6wpta1uXf5M',
        'from': 'contact_hGsXV82wSiv6wpta1uXf5M',
        'frontHTML': previewPayload.frontHtmlContent,
        'backHTML': previewPayload.backHtmlContent,
        'size': previewPayload.size,
        'sendDate': previewPayload.sendDate,
        'express': previewPayload.isExpressDelivery,
        'description': previewPayload.description,
        'mailingClass': previewPayload.mailingClass,
        'mergeVariables[language]': 'english',
        'metadata[company]': 'PostGrid'
      });
    } else if(previewPayload.screen === 'existing-template') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
        
      data = new URLSearchParams({
        'to': 'contact_hGsXV82wSiv6wpta1uXf5M',
        'from': 'contact_hGsXV82wSiv6wpta1uXf5M',
        frontTemplate: previewPayload.frontTemplateId,
        backTemplate: previewPayload.backTemplateId,
        size: previewPayload.size,
        sendDate: previewPayload.sendDate,
        description: previewPayload.description,
      });
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
      console.log('Postcard created successfully:', result);
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
      const postcardDetails = await fetchPostcardDetails(postcardId);
      const pdfUrl = postcardDetails.url;
      console.log('postcard details: '+pdfUrl);
    
      connection.trigger('nextStep');
      if (pdfUrl) {
        $('#pdf-preview').attr('src', pdfUrl + '#toolbar=0&navpanes=0');
        $('.preview-container .retry-preview-btn').removeClass('show');
      } else {
        $('.preview-container .retry-preview-btn').addClass('show');
        $('#pdf-preview-container').html('<p>Preview not found.</p>');
      }
    } catch (error) {
      $('.preview-container .retry-preview-btn').addClass('show');
      console.log('preview error: '+error);
    }

    $('#pdf-preview').on('error', function () {
      $('.preview-container .retry-preview-btn').addClass('show');
      $('#pdf-preview-container').html('<p>Unable to load preview.</p>');
    });
  }

  async function getPreviewURL () {
    try {
      const postcardResponse = await createPostcard();
      const postcardId = postcardResponse.id;
      previewPayload.postcardId = postcardId;

      setTimeout(async function() {
        await showPdfPreview(postcardId);
      }, 4000);

    } catch (error) {
      $('#pdf-preview-container').html('<p>Failed to fetch preview.</p>');
      console.log('error: '+JSON.stringify(error));
      
      $('.preview-container .retry-preview-btn').addClass('show');
    }
  }

  $('.preview-container .retry-preview-btn').click(async function() {
    await showPdfPreview(previewPayload.postcardId);
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
        console.log('Resonese here', response.data);

        // Populate the dropdown with new options
        response.data.forEach(function (contact) {
          $('#dropdown-options').append(
            $('<div>').text(contact.firstName).data('contact', contact)
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
    $('#search-contact').val(contact.firstName); // Set the selected contact name in the input
    $('#dropdown-options').hide(); // Hide the dropdown
    console.log('contactId: '+contact.id);
    
    fromContact = contact.id;
    // You can also store the selected contact ID or other data if needed
    console.log('Selected Contact:', contact);
  });

  $(document).on('click', function (event) {
    if (!$(event.target).closest('.mapping-dropdown').length) {
      $('#dropdown-options').hide();
    }
  });

  $('#search-contact').on('focus', function () {
    //  fetchContacts(); // Show initial contacts
    const searchQuery = $(this).val().trim();
    if ($('#dropdown-options').is(':hidden')) { // Only fetch if dropdown is hidden
      fetchContacts(searchQuery); // Use existing searchQuery if present
    }

  });

  function populateDropdowns() {
    $('.mapping-fields-group select').each(function () {
      let $select = $(this);
      let defaultOption = $select.find('option:first').prop('outerHTML'); // Preserve the first default option
      let currentSelection = $select.val(); // Store current selection

      $select.empty().append(defaultOption); // Reset options

      deFields.forEach((field) => {
        if (!Object.values(selectedFieldsForMapping).includes(field.name) || field.name === currentSelection) {
          $select.append($('<option></option>').attr('value', field.name).text(field.name));
        }
      });

      $select.val(currentSelection); // Reapply previous selection if still valid
    });
  }

  $('.mapping-fields-group select').on('change', function () {
    let fieldId = $(this).attr('id');
    let selectedValue = $(this).val();

    // Remove previous selection
    if (selectedFieldsForMapping[fieldId]) {
      delete selectedFieldsForMapping[fieldId];
    }

    // Store new selection
    if (selectedValue && selectedValue !== $(this).find('option:first').val()) {
      selectedFieldsForMapping[fieldId] = selectedValue;
    }

    // Refresh all dropdowns
    populateDropdowns();
  });

  function validateToContact() {
    let isValid = true;
    resetToContactMappingErrors();

    // Validate Address Line 1
    let address1 = $('#address1').val();
    if (address1 === 'Select') {
      $('#address1').css('border', '2px solid red');
      $('.error-message-contactMapping').text('Address Line 1 is required.').css('color', 'red').show();
      isValid = false;
    }

    // Validate First Name or Company (one must be selected)
    let firstName = $('#first-name').val();
    let company = $('#company').val();
    if (firstName === 'Select' && company === 'Select') {
      $('#first-name, #company').css('border', '2px solid red');
      $('.error-message-contactMapping').text('Either First Name or Company must be selected.').css('color', 'red').show();
      isValid = false;
    }

    return isValid;
  }

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
        $('#description3').after('<span class="error-message">Please write the description.</span>');
        $('#description3').addClass('error-field');
        isValid = false;
    }
    let selectedDate = $('#sendDate3').val();
    if (!selectedDate || selectedDate < today) {
        $('#sendDate3').after('<span class="error-message">Send Date cannot be in the past.</span>');
        $('#sendDate3').addClass('error-field');
        isValid = false;
    }
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
        $('#frontTemplateInput').after('<span class="error-message">Please select the Front Template, this is required.</span>');
        $('#frontTemplateInput').addClass('error-field');
        isValid = false;
    }
    // Validate Back Template
    if (!$('#backTemplateInput').val().trim()) {
        $('#backTemplateInput').after('<span class="error-message">Please select the Back Template, this is required.</span>');
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
    console.log('Fetching templates...');
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

    console.log(`${listId} populated with templates.`);
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

  fetchTemplates();
  /** screen 3C script */
});