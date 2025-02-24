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
  let previewPayload = {
    isValid: true
  };
  var authToken, et_subdomain, authTSSD;
  let fromContact = {};
  let toContact = '';

  var steps = [
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
  
  connection.on('initActivity', initialize);
  connection.on('clickedNext', onClickedNext);
  connection.on('clickedBack', onClickedBack);
  connection.on('gotoStep', onGotoStep);

  connection.on('requestedSchema', function (data) {
    var optionsData = '';
    data['schema'].forEach(ele => {
      optionsData +=`<option value="${ele.name}">${ele.name}</option>`;
      var key = ele.key;
      const myArray = key.split('.');
      var value = myArray[0]+'.'+myArray[1]+'.'+'"'+ele.name+'"';  
      deData[ele.name]=value;        
    });
    $('.mapping-fields-group select').append(optionsData);
  });

  function setFileToInput(base64String, fileName) {
    let file = base64ToFile(base64String, fileName);
    let dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    $('#pdf-upload')[0].files = dataTransfer.files;
    $('#file-name').text(dataTransfer.files[0].name);
    $('#remove-pdf').show();
  };

  function initialize(data) {
    if (data) {
      payload = data;
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
        $(queryString).val(value);
        break;
      case 'frontTemplateName':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' .frontTemplate';
        $(queryString).val(value);
        $(queryString).attr('data-id', postcardArguments.frontTemplateId);
        break;
      case 'backTemplateName':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' .backTemplate';
        $(queryString).val(value);
        $(queryString).attr('data-id', postcardArguments.backTemplateId);
        break;
      case 'size':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' input[value="' + value + '"]';
        $(queryString).prop('checked', true);
        break;
      case 'isExpressDelivery':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '') + ' .express-delivery-input';
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
        break;
      }
    });
    
    connection.trigger('requestTokens');
    connection.trigger('requestEndpoints');
    initializeHandler();
  }

  connection.on('requestedEndpoints', onGetEndpoints);
  function onGetEndpoints (endpoints) {
    et_subdomain = endpoints.restHost;        
    authTSSD = (endpoints.authTSSD).split('//')[1].split('.')[0];
  }

  connection.on('requestedTokens', onGetTokens);
  function onGetTokens (tokens) {
    authToken = tokens.fuel2token;
  }

  var currentStep = steps[0].key;
  function onClickedNext() {
    switch (currentStep.key) {
    case 'step1':
      if (validateApiKeys()) {
        authenticateApiKeys().then((isAuthenticated) => {
          if (isAuthenticated) {
            handleApiKeyToggle();
            fetchContacts();
            connection.trigger('nextStep');
          } else {
            handleValidationFailure();
          }
        }).catch((error) => {
          throw error;
        });
      }
      else{
        handleValidationFailure();
      }
      break;

    case 'step2':
      if (validateStep2()) {
        setDefaultValuesForPostCardCreation();
        $('#step3 .screen').toggle(false);
        let selectedMessageType;
        let selectedRadio = $('input[name="msgType"]:checked');
        let isCartInsertEnabled = $('#card-insert').prop('checked');

        if (selectedRadio.length > 0) {
          let selectedRadioValue = selectedRadio.val().replace(/\s+/g, '');
          selectedMessageType = isCartInsertEnabled && selectedRadioValue === 'SelfMailer' ? 'Trifold'  : selectedRadioValue;
        }

        if (isCartInsertEnabled) {
          $('.Trifold .doubleSide, .Trifold .singleSide').hide();
          let selectedCardType = $('input[name="cardType"]:checked').val();
          $(`.Trifold .${selectedCardType}`).show();
        }

        let isHtml = $('#htmlId').is(':checked');

        if(isHtml){
          $(`.${selectedMessageType} .error-msg`).removeClass('show');
        }

        if(isCartInsertEnabled){
          let selectedCardInsertType = $('input[name="cardType"]:checked').val();
          if(selectedCardInsertType === 'singleSide'){
            $(`.${selectedMessageType} .html-editor .singleSided-hide`).hide();
          }
          else{
            $(`.${selectedMessageType} .html-editor .singleSided-hide`).show();
          }
        }

        let isPdf = $('#pdfId').is(':checked');
        let isExtTemp = $('#extTempId').is(':checked');

        if (isExtTemp) {
          fetchTemplates();
        }

        $(`.${selectedMessageType} > .screen-1`).toggle(isHtml);
        $(`.${selectedMessageType} > .screen-2`).toggle(isPdf);
        $(`.${selectedMessageType} > .screen-3`).toggle(isExtTemp);

        connection.trigger('nextStep');
        if(toContact === '') {
          createContact();
        }
      } else {
        handleValidationFailure();
      }
      break;

    case 'step3':
      prepopulateToDeMapping();
      $('#dropdown-options').hide();
      validateStep3()
        .then((isValid) => {
          isValid ? proceedToNext() : handleValidationFailure();
          $('.mapping-fields select').css('border', '');
          $('.error-message-contactMapping').hide();
          $('.contact-dropdown-container input').removeClass('error');
          $('.contact-dropdown-container .error-msg').removeClass('show');
        })
        .catch(() => {
          handleValidationFailure();
        });
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

    if (previewPayload.pdf) {
      await convertToBase64(previewPayload.pdf)
        .then((base64String) => {
          previewPayload.encodedPdf = base64String;
        })
        .catch(() => {
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
    } else if(previewPayload.messageType === 'Self Mailer'){
      if(previewPayload.creationType === 'HTML'){
        postCardJson.insideHTML = previewPayload.frontHtmlContent;
        postCardJson.outsideHTML = previewPayload.backHtmlContent;
      } else if(previewPayload.creationType === 'Existing Template'){
        postCardJson.insideTemplate = previewPayload.frontTemplateId;
        postCardJson.outsideTemplate = previewPayload.backTemplateId;
      } else if(previewPayload.creationType === 'PDF Upload'){
        postCardJson.pdf = previewPayload.pdfLink;
      }
    }
    payload['arguments'].execute.inArguments[0]['postcardJson'] = postCardJson;
    authorization['authToken'] = authToken;
    authorization['et_subdomain'] = et_subdomain;
    authorization['authTSSD'] = authTSSD;
    
    payload['arguments'].execute.inArguments[0]['authorization'] = authorization;
  }

  function initializeHandler() {
    executeScreenTwoMethods();
  }

  function handleValidationFailure() {
    showStep(currentStep);
    connection.trigger('ready');
  }

  function toggleApiKeyVisibility(e) {
    e.preventDefault();
    const input = $(this).prev('input');
    const icon = $(this).find('i');
  
    input.attr('type', input.attr('type') === 'text' ? 'password' : 'text');
    icon.toggleClass('fa-eye fa-eye-slash');
  }

  function validateApiKeys() {
    let isValid = true;
    const testApiKey = $('#test-api-key').val().trim();
    const liveApiKey = $('#live-api-key').val().trim();
    const regexForTestApiKey = /^test_sk_[a-zA-Z0-9]{16,}$/;
    const regexForLiveApiKey = /^live_sk_[a-zA-Z0-9]{16,}$/;

    if (testApiKey === '') {
      $('#test-api-key').css('border', '1px solid red');
      $('#test-api-key-error').text('Missing or invalid authentication').show();
      isValid = false;
    } else if (!regexForTestApiKey.test(testApiKey)) {
      $('#test-api-key').css('border', '1px solid red');
      $('#test-api-key-error').text(`Invalid API key: ${testApiKey}`).show();
      isValid = false;
    } else {
      previewPayload.test_api_key = testApiKey;
      $('#test-api-key-error').hide();
      $('#test-api-key').css('border', '');
    }

    previewPayload.live_api_key = liveApiKey;
    if (liveApiKey !== '') {
      if (!regexForLiveApiKey.test(liveApiKey)) {
        $('#live-api-key').css('border', '1px solid red');
        $('#live-api-key-error').text(`Invalid API key: ${liveApiKey}`).show();
        isValid = false;
        previewPayload.live_api_key = '';
      }
    }
    return isValid;
  }
  
  function hideError() {
    $(this).css('border', '').siblings('.error-message').hide();
  }

  function validateStep2() {
    let isValid = true;
    let errorMessages = [];

    if (!$('input[name=\'msgType\']:checked').length) {
      errorMessages.push('Message Type is required.');
      isValid = false;
      $('#msgType-error').text('Message Type is required.');
    } else {
      $('#msgType-error').text('');
    }

    if (!$('input[name=\'createType\']:checked').length) {
      errorMessages.push('Creation Type is required.');
      isValid = false;
      $('#createType-error').text('Creation Type is required.');
    } else {
      $('#createType-error').text(''); 
    }

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

  function executeScreenTwoMethods() {
    $('input[name="msgType"]').change(function () {
      if (this.id === 'letters' || this.id === 'self-mailer') {
        $('#card-insert-container').addClass('visible');
        $('.card-insert-wrapper').addClass('visible');
      } else {
        $('#card-insert-container').removeClass('visible');
        $('.card-insert-wrapper').removeClass('visible');
      }

      if (this.id === 'letters' || this.id === 'self-mailer') {
        $('#card-insert').prop('checked', false).trigger('change');
      }
    });

    $('#card-insert').change(function () {
      if (this.checked) {
        $('#card-insert-type').removeClass('hidden');
      } else {
        $('#card-insert-type').addClass('hidden');
      }
    });
  }

  function setDefaultValuesForPostCardCreation() {
    let isCartInsertEnabled = $('#card-insert').prop('checked');
    let selectedMessageType = $('input[name="msgType"]:checked').val().replace(/\s+/g, '');
    let selectedCreationType = $('input[name=\'createType\']:checked').val().replace(/\s+/g, '');
    selectedMessageType = isCartInsertEnabled && selectedMessageType === 'SelfMailer' ? 'Trifold'  : selectedMessageType;
    $(`.${selectedMessageType} .html-editor .html__btn--front`).click(function () {
      $(`.${selectedMessageType} .html-editor .btn-light`).removeClass('show');
      $(`.${selectedMessageType} .html-editor .html-area`).removeClass('show');
      $(this).addClass('show');
      $(`.${selectedMessageType} .html-editor-front`).addClass('show');
    });
    $(`.${selectedMessageType} .html-editor .html__btn--back`).click(function () {  
      $(`.${selectedMessageType} .html-editor .btn-light`).removeClass('show');
      $(`.${selectedMessageType} .html-editor .html-area`).removeClass('show');
      $(this).addClass('show');
      $(`.${selectedMessageType} .html-editor-back`).addClass('show');
    });
    $(`.${selectedMessageType} .html-editor .html__btn-card--front`).click(function () {  
      $(`.${selectedMessageType} .html-editor .btn-light`).removeClass('show');
      $(`.${selectedMessageType} .html-editor .html-area`).removeClass('show');
      $(this).addClass('show');
      $(`.${selectedMessageType} .html-editor-front-card-insert`).addClass('show');
    });
    $(`.${selectedMessageType} .html-editor .html__btn-card--back`).click(function () {  
      $(`.${selectedMessageType} .html-editor .btn-light`).removeClass('show');
      $(`.${selectedMessageType} .html-editor .html-area`).removeClass('show');
      $(this).addClass('show');
      $(`.${selectedMessageType} .html-editor-back-card-insert`).addClass('show');
    });

    $('input[name="cardType"]').change(function() {
      let containerSelector = `.${selectedMessageType} .spacer.${selectedCreationType}`;
      $(`${containerSelector} input[type="text"]`).val('');
      $(`${containerSelector} select`).prop('selectedIndex', 0);
      $(`${containerSelector} input[type="radio"]`).prop('checked', false);
      $(`${containerSelector} textarea`).val('');
      $(`${containerSelector} .size_radio_label .radio-input`).first().prop('checked', true);
    });

    const today = new Date().toISOString().split('T')[0];
    $('input[type="date"]').each(function () {
      $(this).val(today);
      $(this).attr('min', today);
    });

    $(document).on('change', '.pdf-upload', function () {
      let $uploadBox = $(this).closest('.upload-box');
      let file = this.files[0];

      if (file && file.type === 'application/pdf') {
        $uploadBox.find('.file-name').text(file.name);
        $uploadBox.find('.remove-pdf').show();
        $uploadBox.find('.pdf-error').removeClass('show');
      } else {
        $uploadBox.find('.pdf-error').text('Invalid file type! Please upload a PDF file.').addClass('show');
      }
    });

    $(document).on('click', '.remove-pdf', function (e) {
      e.preventDefault();

      let $uploadBox = $(this).closest('.upload-box');
      let $fileInput = $uploadBox.find('.pdf-upload');

      $fileInput.val('');
      $uploadBox.find('.file-name').text('Drag or Upload PDF');
      $(this).hide();
    });

    $(document).on('dragover', '.drop-pdf', function (e) {
      e.preventDefault();
    });

    $(document).on('drop', '.drop-pdf', function (e) {
      e.preventDefault();
      let $uploadBox = $(this).closest('.upload-box');
      let $fileInput = $uploadBox.find('.pdf-upload');
      let droppedFile = e.originalEvent.dataTransfer.files[0];

      if (droppedFile && droppedFile.type === 'application/pdf') {
        let fileList = new DataTransfer();
        fileList.items.add(droppedFile);
        $fileInput[0].files = fileList.files;

        $uploadBox.find('.file-name').text(droppedFile.name);
        $uploadBox.find('.remove-pdf').show();
        $uploadBox.find('.pdf-error').removeClass('show');
      } else {
        $uploadBox.find('.pdf-error').text('Invalid file type! Please upload a PDF file.').addClass('show');
      }
    });
  }

  async function validateStep3() {
    let isValid = true;
    let isCartInsertEnabled = $('#card-insert').prop('checked');
    let selectedCardInsertType;
    if(isCartInsertEnabled){
      selectedCardInsertType = $('input[name="cardType"]:checked').val();
    }
    let selectedMessageType = $('input[name="msgType"]:checked').val().replace(/\s+/g, '');
    selectedMessageType = isCartInsertEnabled && selectedMessageType === 'SelfMailer' ? 'Trifold'  : selectedMessageType;
    if ($(`.${selectedMessageType} .screen-1`).css('display') === 'block') {
      let isDescriptionValid = validateInputField($(`.${selectedMessageType} .screen-1 .description`));
      
      if (!isDescriptionValid) {
        isValid = false;
      }
      let postcardHtmlEditorErrorMsg = $(`.${selectedMessageType} .html-editor .error-msg`);
      let isPostcardSizeSelected = $(`.${selectedMessageType} .html-size .radio-input:checked`).length;
      let frontHtmlContent = $(`.${selectedMessageType} .html-editor-front`).val().trim();
      let frontHtmlBtnLabel = $(`.${selectedMessageType} .html-editor-front`).data('btn-label');
      let backtHtmlContent = $(`.${selectedMessageType} .html-editor-back`).val().trim();
      let backHtmlBtnLabel = $(`.${selectedMessageType} .html-editor-back`).data('btn-label');
      let cardfrontHtmlContent, cardfrontHtmlBtnLabel, cardbacktHtmlContent, cardbackHtmlBtnLabel;

      if(isCartInsertEnabled && selectedCardInsertType === 'doubleSide'){
        cardfrontHtmlContent = $(`.${selectedMessageType} .html-editor-front-card-insert`).val().trim();
        cardfrontHtmlBtnLabel = $(`.${selectedMessageType} .html-editor-front-card-insert`).data('btn-label');
        cardbacktHtmlContent = $(`.${selectedMessageType} .html-editor-back-card-insert`).val().trim();
        cardbackHtmlBtnLabel = $(`.${selectedMessageType} .html-editor-back-card-insert`).data('btn-label');  

        if (
          frontHtmlContent === '' || 
          backtHtmlContent === '' || 
          cardfrontHtmlContent === '' || 
          cardbacktHtmlContent === ''
        ) {
          isValid = false;
          
          if (
            frontHtmlContent === '' && 
            backtHtmlContent === '' && 
            cardfrontHtmlContent === '' && 
            cardbacktHtmlContent === ''
          ) {
            postcardHtmlEditorErrorMsg.text(`Please enter content in all ${frontHtmlBtnLabel}, ${backHtmlBtnLabel}, ${cardfrontHtmlBtnLabel}, ${cardbackHtmlBtnLabel} fields.`).addClass('show');
          } else if (frontHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the ${frontHtmlBtnLabel} field.`).addClass('show');
          } else if (backtHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the ${backHtmlBtnLabel} field.`).addClass('show');
          } else if (cardfrontHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the ${cardfrontHtmlBtnLabel} field.`).addClass('show');
          } else {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the ${cardbackHtmlBtnLabel} field.`).addClass('show');
          }
        
        } else { 
          postcardHtmlEditorErrorMsg.removeClass('show');
        }        
      }
      else if(isCartInsertEnabled && selectedCardInsertType === 'singleSide'){
        cardfrontHtmlContent = $(`.${selectedMessageType} .html-editor-front-card-insert`).val().trim();
        cardfrontHtmlBtnLabel = $(`.${selectedMessageType} .html-editor-front-card-insert`).data('btn-label');
        if (
          frontHtmlContent === '' || 
          backtHtmlContent === '' || 
          cardfrontHtmlContent === ''
        ) {
          isValid = false;
          
          if (
            frontHtmlContent === '' && 
            backtHtmlContent === '' && 
            cardfrontHtmlContent === ''
          ) {
            postcardHtmlEditorErrorMsg.text(`Please enter content in all ${frontHtmlBtnLabel}, ${backHtmlBtnLabel}, ${cardfrontHtmlBtnLabel} fields.`).addClass('show');
          } else if (frontHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the ${frontHtmlBtnLabel} field.`).addClass('show');
          } else if (backtHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the ${backHtmlBtnLabel} field.`).addClass('show');
          } else if (cardfrontHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the ${cardfrontHtmlBtnLabel} field.`).addClass('show');
          }
        } else { 
          postcardHtmlEditorErrorMsg.removeClass('show');
        } 

      }
      else{
        if (frontHtmlContent === '' || backtHtmlContent === '') {
          isValid = false;
          if (frontHtmlContent === '' && backtHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in both ${frontHtmlBtnLabel} and ${backHtmlBtnLabel} fields.`).addClass('show');
          } else if (frontHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the ${frontHtmlBtnLabel} field.`).addClass('show');
          } else {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the ${backHtmlBtnLabel} field.`).addClass('show');
          }
        } else { 
          postcardHtmlEditorErrorMsg.removeClass('show');
        }
      }
      if (!(isPostcardSizeSelected > 0)) {
        $(`.${selectedMessageType} .html-size .error-msg`).addClass('show');
        isValid = false;
      } else {
        $(`.${selectedMessageType} .html-size .error-msg`).removeClass('show');
      }
    };
    
    if ($(`.${selectedMessageType} .screen-2`).css('display') === 'block') {
      let isDescriptionValid = validateInputField($(`.${selectedMessageType} .screen-2 .description`));
      
      if (!isDescriptionValid) {
        isValid = false;
      }

      if(selectedMessageType === 'Trifold') {
        let isPdfLinkValid = isValidPdfUrl($(`.${selectedMessageType} .screen-2 .pdfLink`));
        if (!isPdfLinkValid) {
          isValid = false;
        }

        let frontHtmlContent = $(`.${selectedMessageType} .screen-2 .html-editor-front`).val().trim();
        let frontHtmlBtnLabel = $(`.${selectedMessageType} .screen-2 .html-editor-front`).data('btn-label');
        let backtHtmlContent = $(`.${selectedMessageType} .screen-2 .html-editor-back`).val().trim();
        let backHtmlBtnLabel = $(`.${selectedMessageType} .screen-2 .html-editor-back`).data('btn-label');
        let postcardHtmlEditorErrorMsg = $(`.${selectedMessageType} .screen-2 .html-editor .error-msg`);

        if (frontHtmlContent === '' || backtHtmlContent === '') {
          isValid = false;
          if (frontHtmlContent === '' && backtHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in both ${frontHtmlBtnLabel} and ${backHtmlBtnLabel} fields.`).addClass('show');
          } else if (frontHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the ${frontHtmlBtnLabel} field.`).addClass('show');
          } else {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the ${backHtmlBtnLabel} field.`).addClass('show');
          }
        } else { 
          postcardHtmlEditorErrorMsg.removeClass('show');
        }
      } else {
        const pdfInput = $(`.${selectedMessageType} .screen-2 .drop-pdf .pdf-upload`)[0]; 
        if (pdfInput.files.length > 0) {
          const pdfFile = pdfInput.files[0];
          try {
            const pdfValidationResult = await validatePDFFile(pdfFile, selectedMessageType);
            if (!pdfValidationResult.isValid) {
              isValid = false;
              $(`.${selectedMessageType} .screen-2 .drop-pdf .error-msg`).text(pdfValidationResult.errorMessage).addClass('show');
            } else {
              $(`.${selectedMessageType} .screen-2 .drop-pdf .error-msg`).removeClass('show');
            }
          } catch {
            isValid = false;
          }
        } else {
          $(`.${selectedMessageType} .screen-2 .drop-pdf .error-msg`).text('Please select a PDF file').addClass('show');
          isValid = false;
        }
      }
    }

    if ($(`.${selectedMessageType} .screen-3`).css('display') === 'block'){
      let isDescriptionValid = validateInputField($(`.${selectedMessageType} .screen-3 .description`));
      if (!isDescriptionValid) {
        isValid = false;
      }
      if (selectedMessageType === 'Trifold') {
        let frontHtmlContent = $(`.${selectedMessageType} .screen-3 .html-editor-front`).val().trim();
        let frontHtmlBtnLabel = $(`.${selectedMessageType} .screen-3 .html-editor-front`).data('btn-label');
        let backtHtmlContent = $(`.${selectedMessageType} .screen-3 .html-editor-back`).val().trim();
        let backHtmlBtnLabel = $(`.${selectedMessageType} .screen-3 .html-editor-back`).data('btn-label');
        let postcardHtmlEditorErrorMsg = $(`.${selectedMessageType} .screen-3 .html-editor .error-msg`);

        if (frontHtmlContent === '' || backtHtmlContent === '') {
          isValid = false;
          if (frontHtmlContent === '' && backtHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in both ${frontHtmlBtnLabel} and ${backHtmlBtnLabel} fields.`).addClass('show');
          } else if (frontHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the ${frontHtmlBtnLabel} field.`).addClass('show');
          } else {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the ${backHtmlBtnLabel} field.`).addClass('show');
          }
        } else { 
          postcardHtmlEditorErrorMsg.removeClass('show');
        }
      }
      if(selectedMessageType === 'Trifold' && selectedCardInsertType === 'singleSide'){
        let singleSideTemplate = validateInputField($(`.${selectedMessageType} .screen-3 .singleSideTemplate`));
        if(!singleSideTemplate){
          isValid = false;
        }
      } else {
        let frontTemplateValid = validateInputField($(`.${selectedMessageType} .screen-3 .frontTemplate`));
        let backTemplateValid = validateInputField($(`.${selectedMessageType} .screen-3 .backTemplate`));
        if(!frontTemplateValid || !backTemplateValid){
          isValid = false;
        }
      }
    }
    return isValid;
  }

  function validatePDFFile(pdfFile, selectedMessageType) {
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
            const pdfDimensions = selectedMessageType === 'SelfMailer' ? `${(width / 72)}x${(height / 72)}` : `${(width / 72).toFixed(2)}x${(height / 72).toFixed(2)}`;
            const selectedPDFDimension = $(`.${selectedMessageType} .pdf-size input[name="${selectedMessageType}-pdf-size"]:checked`).data('dimentions');
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
    let selectedMessageType = $('input[name="msgType"]:checked').val().replace(/\s+/g, '');
    let isCartInsertEnabled = $('#card-insert').prop('checked');
    selectedMessageType = isCartInsertEnabled && selectedMessageType === 'SelfMailer' ? 'Trifold'  : selectedMessageType;
    let selectedCreationType = $('input[name=\'createType\']:checked').val().replace(/\s+/g, '');
    let selectedCardInsertType;
    let isTrifoldEnabled = selectedMessageType === 'Trifold';
    if(isCartInsertEnabled){
      selectedCardInsertType = $('input[name="cardType"]:checked').val();
    }
    if ($(`.${selectedMessageType} .screen-1`).css('display') === 'block') {
      const description = $(`.${selectedMessageType} .${selectedCreationType} .description`).val();
      const mailingClass = $(`.${selectedMessageType} .${selectedCreationType} .mailing-class`).val();
      const frontHtmlContent = $(`.${selectedMessageType} .screen-1 .html-editor-front`).val();
      const backHtmlContent = $(`.${selectedMessageType} .screen-1 .html-editor-back`).val();
      
      const size = $(`.${selectedMessageType} .html-size .radio-input:checked`).val();
      const isExpressDelivery = $(`.${selectedMessageType} .${selectedCreationType} .express-delivery-input`).is(':checked');

      previewPayload.screen = 'html';
      previewPayload.description = description;
      previewPayload.sendDate = getFormattedDate();
      previewPayload.mailingClass = mailingClass;
      previewPayload.frontHtmlContent = frontHtmlContent;
      previewPayload.backHtmlContent = backHtmlContent;
      previewPayload.size = size;
      if(isCartInsertEnabled && selectedCardInsertType === 'doubleSide'){
        const cardfrontHtmlContent = $(`.${selectedMessageType} .html-editor-front-card-insert`).val().trim();
        const cardbacktHtmlContent = $(`.${selectedMessageType} .html-editor-back-card-insert`).val().trim();
        const cardInsertSize = $(`.${selectedMessageType} .html-card-size .radio-input:checked`).val();
        
        previewPayload.cardfrontHtmlContent = cardfrontHtmlContent;
        previewPayload.cardbacktHtmlContent = cardbacktHtmlContent;
        previewPayload.cardInsertSize = cardInsertSize;
        
      }else if(isCartInsertEnabled && selectedCardInsertType === 'singleSide'){
        const cardfrontHtmlContent = $(`.${selectedMessageType} .html-editor-front-card-insert`).val().trim();
        const cardInsertSize = $(`.${selectedMessageType} .html-card-size .radio-input:checked`).val();
        previewPayload.cardfrontHtmlContent = cardfrontHtmlContent;
        previewPayload.cardInsertSize = cardInsertSize;
      }
      else{
        previewPayload.isExpressDelivery = isExpressDelivery;
      }
    } else if ($(`.${selectedMessageType} .screen-2`).css('display') === 'block') {
      const description = $(`.${selectedMessageType} .${selectedCreationType} .description`).val();;
      const mailingClass = $(`.${selectedMessageType} .${selectedCreationType} .mailing-class`).val();
      const size = $(`.${selectedMessageType} .pdf-size .radio-input:checked`).val();

      previewPayload.screen = 'pdf';
      previewPayload.description = description;
      previewPayload.sendDate = getFormattedDate();
      previewPayload.mailingClass = mailingClass;
      previewPayload.size = size;

      if(isTrifoldEnabled) {
        const pdfLink = $(`.${selectedMessageType} .${selectedCreationType} .pdfLink`).val();
        const pdfCardSize = $(`.${selectedMessageType} .pdf-card-size .radio-input:checked`).val();
        const frontHtmlContent = $(`.${selectedMessageType} .screen-2 .html-editor-front`).val();
        const backHtmlContent = $(`.${selectedMessageType} .screen-2 .html-editor-back`).val();

        previewPayload.pdfLink = pdfLink;
        previewPayload.pdfCardSize = pdfCardSize;
        previewPayload.frontHtmlContent = frontHtmlContent;
        previewPayload.backHtmlContent = backHtmlContent;
      } else {
        const isExpressDelivery = $(`.${selectedMessageType} .${selectedCreationType} .express-delivery-input`).is(':checked');
        const pdfInput = $(`.${selectedMessageType} .${selectedCreationType} .pdf-upload`)[0];
        const pdfFile = pdfInput.files[0] ;
        previewPayload.isExpressDelivery = isExpressDelivery;
        previewPayload.pdf = pdfFile;
        previewPayload.pdfName = pdfFile.name;
      }
    } else if ($(`.${selectedMessageType} .screen-3`).css('display') === 'block') {
      const description = $(`.${selectedMessageType} .${selectedCreationType} .description`).val();

      const size = $(`.${selectedMessageType} .existingTemplate-size .radio-input:checked`).val();
      const isExpressDelivery = $(`.${selectedMessageType} .${selectedCreationType} .express-delivery-input`).is(':checked');
      const mailingClass = $(`.${selectedMessageType} .${selectedCreationType} .mailing-class`).val();

      if (isTrifoldEnabled && selectedCardInsertType === 'singleSide') {
        const  singleSideTemplateId = $(`.${selectedMessageType} .${selectedCreationType} .singleSideTemplate`) ?.attr('data-id');
        const singleSideTemplateName = $(`.${selectedMessageType} .${selectedCreationType} .frontTemplate`).val();
        previewPayload.singleSideTemplateId = singleSideTemplateId;
        previewPayload.singleSideTemplateName = singleSideTemplateName;
      } else {
        const frontTemplateId = $(`.${selectedMessageType} .${selectedCreationType} .frontTemplate`) ?.attr('data-id');
        const backTemplateId = $(`.${selectedMessageType} .${selectedCreationType} .backTemplate`)?.attr('data-id');
        const frontTemplateName = $(`.${selectedMessageType} .${selectedCreationType} .frontTemplate`).val();
        const backTemplateName = $(`.${selectedMessageType} .${selectedCreationType} .backTemplate`).val();
        previewPayload.frontTemplateId = frontTemplateId;
        previewPayload.backTemplateId = backTemplateId;
        previewPayload.frontTemplateName = frontTemplateName;
        previewPayload.backTemplateName = backTemplateName;
      }

      if(isTrifoldEnabled) {
        const frontHtmlContent = $(`.${selectedMessageType} .screen-3 .html-editor-front`).val();
        const backHtmlContent = $(`.${selectedMessageType} .screen-3 .html-editor-back`).val();
        const templateCardSize = $(`.${selectedMessageType} .Template-card-size .radio-input:checked`).val();
        previewPayload.frontHtmlContent = frontHtmlContent;
        previewPayload.backHtmlContent = backHtmlContent;
        previewPayload.templateCardSize = templateCardSize;
      }

      previewPayload.screen = 'existing-template';
      previewPayload.description = description;
      previewPayload.sendDate = getFormattedDate();
      previewPayload.size = size;
      previewPayload.mailingClass = mailingClass;
      previewPayload.isExpressDelivery = isExpressDelivery;
    }
  }

  function getFormattedDate() {
    let now = new Date();
    const sendDate = now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(now.getDate()).padStart(2, '0');
    let istOffset = 5.5 * 60 * 60 * 1000;
    let istTime = new Date(now.getTime() + istOffset);

    let formattedDate = sendDate;
    let formattedTime = istTime.toISOString().split('T')[1];

    return `${formattedDate}T${formattedTime}`;
  }

  async function createMessage() {
    let messageType = $('input[name=\'msgType\']:checked').val();
    const baseUrl = 'https://api.postgrid.com/print-mail/v1/';
    let isCartInsertEnabled = $('#card-insert').prop('checked');
    let selectedMessageType = $('input[name="msgType"]:checked').val().replace(/\s+/g, '');
    selectedMessageType = isCartInsertEnabled && selectedMessageType === 'SelfMailer' ? 'Trifold'  : selectedMessageType;
    let isTrifoldEnabled = selectedMessageType === 'Trifold';
    const selectedCardInsertType = $('input[name="cardType"]:checked').val();
    const url = selectedMessageType === 'SelfMailer' || selectedMessageType === 'Trifold' ? baseUrl + 'self_mailers' : baseUrl + 'postcards';
    
    let data;
    let headers = {
      'x-api-key': previewPayload.liveApiKeyEnabled ? previewPayload.live_api_key : previewPayload.test_api_key,
    };

    if(previewPayload.screen === 'pdf'){
      data = new FormData();
      data.append('to', toContact);
      data.append('from', fromContact.id || '');
      data.append('description', previewPayload.description);
      data.append('size',previewPayload.size);
      
      if(isTrifoldEnabled|| !previewPayload.isExpressDelivery) {
        data.append('mailingClass', previewPayload.mailingClass);
      }

      if(isTrifoldEnabled) {
        data.append('adhesiveInsert[size]',previewPayload.pdfCardSize);
        let pdfLinkKey = selectedCardInsertType === 'doubleSide' ? 'adhesiveInsert[singleSided][pdf]' : 'adhesiveInsert[doubleSided][pdf]';
        data.append(pdfLinkKey,previewPayload.pdfLink);
        data.append('insideHTML', previewPayload.frontHtmlContent);
        data.append('outsideHTML', previewPayload.backHtmlContent);
      } else {
        data.append('express', previewPayload.isExpressDelivery);
        data.append('pdf', previewPayload.pdf);
      } 
    } else if (previewPayload.screen === 'html') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      data = new URLSearchParams({
        'to': toContact,
        'from': fromContact.id || '',
        'size': previewPayload.size,
        'sendDate': previewPayload.sendDate,
        'express': previewPayload.isExpressDelivery,
        'description': previewPayload.description,
        'mergeVariables[language]': 'english',
        'metadata[company]': 'PostGrid'
      });
      if(messageType === 'Postcards'){
        data.append('frontHTML', previewPayload.frontHtmlContent);
        data.append('backHTML', previewPayload.backHtmlContent);
      } else if(messageType === 'Self Mailer'){
        data.append('insideHTML', previewPayload.frontHtmlContent);
        data.append('outsideHTML', previewPayload.backHtmlContent);
      }
      else if(selectedMessageType === 'Trifold'){
        data.append('insideHTML', previewPayload.frontHtmlContent);
        data.append('outsideHTML', previewPayload.backHtmlContent);
        data.delete('express');
        if(selectedCardInsertType === 'doubleSide'){
          data.append('adhesiveInsert[size]', previewPayload.cardInsertSize);
          data.append('adhesiveInsert[doubleSided][outsideHTML]', previewPayload.cardbacktHtmlContent);
          data.append('adhesiveInsert[doubleSided][insideHTML]',  previewPayload.cardfrontHtmlContent);
        }else{
          data.append('adhesiveInsert[size]', previewPayload.cardInsertSize);
          data.append('adhesiveInsert[singleSided][html]', previewPayload.cardfrontHtmlContent);
        }
      }
      if (!previewPayload.isExpressDelivery) {
        data.append('mailingClass', previewPayload.mailingClass);
      }
    } else if(previewPayload.screen === 'existing-template') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      data = new URLSearchParams({
        'to': toContact,
        'from': fromContact.id || '',
        size: previewPayload.size,
        sendDate: previewPayload.sendDate,
        description: previewPayload.description,
        'express': previewPayload.isExpressDelivery,
      });
      if(messageType === 'Postcards'){
        data.append('frontTemplate', previewPayload.frontTemplateId);
        data.append('backTemplate', previewPayload.backTemplateId);
      } else if(messageType === 'Self Mailer'){
        if(isTrifoldEnabled) {
          if(selectedCardInsertType === 'singleSide') {
            data.append('adhesiveInsert[singleSided][template]', previewPayload.singleSideTemplateId);
          } else if(selectedCardInsertType === 'doubleSide') {
            data.append('adhesiveInsert[doubleSided][insideTemplate]', previewPayload.frontTemplateId);
            data.append('adhesiveInsert[doubleSided][outsideTemplate]', previewPayload.backTemplateId);
          }
          data.append('adhesiveInsert[size]', previewPayload.templateCardSize);
          data.append('insideHTML', previewPayload.frontHtmlContent);
          data.append('outsideHTML', previewPayload.backHtmlContent);
          data.delete('express');
        }else {
          data.append('insideTemplate', previewPayload.frontTemplateId);
          data.append('outsideTemplate', previewPayload.backTemplateId);
        }
      }
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

      if(previewPayload.liveApiKeyEnabled) {
        let msgType = selectedMessageType === 'SelfMailer' ? 'self_mailers' : 'postcards';
        deleteMailItem(msgType, result.id);
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  async function fetchMessageDetails(messageId) {
    let selectedMessageType = $('input[name="msgType"]:checked').val().replace(/\s+/g, '');
    const urlMessageType = selectedMessageType === 'SelfMailer' ? 'self_mailers' : 'postcards';
    const apiUrl = `https://api.postgrid.com/print-mail/v1/${urlMessageType}/${messageId}`;
    const apiKey = previewPayload.liveApiKeyEnabled ? previewPayload.live_api_key : previewPayload.test_api_key;

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
      throw error;
    }
  }

  async function showPdfPreview(messageId, retryOnce = false, isRetry = false, startTime = Date.now()) {
    try {
      if (!isRetry) {
        $('#pdf-preview').attr('src', '');
        $('#pdf-preview-container').hide();
        $('.preview-message').text('If you want to view the template preview, click the \'Show Preview\' button.').show();
      }
  
      $('.retry-btn-wrap .loader').addClass('show');
      $('.retry-preview-btn').hide();
      const messageDetails = await fetchMessageDetails(messageId);
      const pdfUrl = messageDetails.url;
  
      if (pdfUrl) {
        previewPayload.previewURL = pdfUrl;
        $('.preview-message').text('If you want to view the template preview, click the \'Show Preview\' button.');
        $('.retry-preview-btn, .preview-message').css('display', 'inline-block');
        $('.retry-preview-btn').text('Show Preview');
        $('.retry-btn-wrap .loader').removeClass('show');
  
        $('.retry-preview-btn').off('click').on('click', function () {
          $('#pdf-preview').attr('src', pdfUrl + '#toolbar=0&navpanes=0');
          $('#pdf-preview-container').show();
          $('.retry-preview-btn, .preview-message').hide();
        });
      } else  {
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime >= 60000 || retryOnce) {
          $('.retry-btn-wrap .loader').removeClass('show');
          $('.preview-message').text('Failed to load the preview after several attempts. To try again, click the retry button.').show();
          $('.retry-preview-btn').text('Retry').show();
          return;
        }

        $('#pdf-preview-container, .retry-preview-btn').hide();
        $('.preview-message').show();
        $('.retry-btn-wrap .loader').addClass('show');
  
        setTimeout(() => {
          showPdfPreview(messageId, false, true, startTime);
        }, 2000);
      }
    } catch {
      $('#pdf-preview-container, .retry-preview-btn').hide();
      $('.preview-message').text('An error occurred while loading the preview.').show();
    }
  }  

  async function getPreviewURL () {
    try {
      const messageResponse = await createMessage();
      const messageId = messageResponse.id;
      previewPayload.messageId = messageId;

      setTimeout(async function() {
        connection.trigger('nextStep');
        await showPdfPreview(messageId);
      }, 2000);

    } catch {
      $('.preview-container .retry-preview-btn').addClass('show');
      $('#pdf-preview-container').css('display','none');
      $('.pdf-preview-error-msg').text('Failed to fetch preview.');
    }
  }

  function createContact () {
    const url = 'https://api.postgrid.com/print-mail/v1/contacts';

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
    formData.append('country', 'US');
    formData.append('countryCode', 'US');
    formData.append('description', 'Kevin Smith\'s contact information');
    formData.append('metadata[friend]', 'no');
    formData.append('skipVerification', 'false');
    formData.append('forceVerifiedStatus', 'false');

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': previewPayload.liveApiKeyEnabled ? previewPayload.live_api_key : previewPayload.test_api_key
      },
      body: formData
    })
      .then(response => response.json())
      .then(data => {
        toContact = data.id;
      })
      .catch(error => {
        throw error;
      });
  }

  function fetchContacts(searchQuery) {
    $.ajax({
      url: 'https://api.postgrid.com/print-mail/v1/contacts',
      method: 'GET',
      data: searchQuery ? { search: searchQuery, limit: 10 } : { limit: 10 },
      headers: {
        'x-api-key': previewPayload.liveApiKeyEnabled ? previewPayload.live_api_key : previewPayload.test_api_key
      },
      success: function (response) {
        $('#dropdown-options').empty();
        response.data.forEach(function (contact) {
          $('#dropdown-options').append(
            $('<div>').text(contact.firstName ? contact.firstName : contact.companyName).data('contact', contact)
          );
        });

        if (response.data.length > 0) {
          $('#dropdown-options').show();
        } else {
          $('#dropdown-options').hide();
        }
      },
      error: function (error) {
        throw error;
      }
    });
  }

  function deleteMailItem(messageType, mailItemId) {
    const url = `https://api.postgrid.com/print-mail/v1/${messageType}/${mailItemId}`;
  
    fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': previewPayload.live_api_key
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to delete ${messageType}`);
        }
        return response.json();
      });
  } 

  function isValidPdfUrl(inputElement) {
    inputElement.siblings('.error-msg').text('The input value is missing.');
    if(validateInputField(inputElement)) {
      const url = inputElement.val().trim();
      var pdfRegex = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,6}(\/[^\s]*)?\.pdf$/i;
      if (pdfRegex.test(url)) {
        return true;
      } else {
        inputElement.addClass('error');
        inputElement.siblings('.error-msg').text('Please enter a valid PDF URL.').addClass('show');
        return false;
      }
    }
  }

  function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  function validateToContact() {
    let isValid = true;
    let selectedMessageType = $('input[name="msgType"]:checked').val().replace(/\s+/g, '');
    let fromContactElement = $('.contact-dropdown-container #search-contact');

    if(selectedMessageType === 'SelfMailer' && !validateInputField(fromContactElement)) {
      isValid = false;
    } else {
      fromContactElement.removeClass('error');
      fromContactElement.siblings('.error-msg').removeClass('show');
    }
    previewPayload.fromContact = fromContact;
    resetToContactMappingErrors();
    let requiredFields = ['#addressLine1', '#firstName', '#companyName', '#city', '#provinceOrState', '#countryCode'];
    let isAnyFieldEmpty = false;

    requiredFields.forEach(selector => {
      let value = $(selector).val();
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

  function resetToContactMappingErrors() {
    $('.mapping-fields-group select').css('border', '');
    $('.error-message-contactMapping').text('').hide();
  }

  async function fetchTemplates(searchQuery = '') {
    const requestOptions = {
      method: 'GET',
      headers: { 'x-api-key': previewPayload.liveApiKeyEnabled ? previewPayload.live_api_key : previewPayload.test_api_key },
      redirect: 'follow'
    };

    try {
      const response = await fetch(`https://api.postgrid.com/print-mail/v1/templates?limit=10&search=${encodeURIComponent(searchQuery)}`, requestOptions);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      const dataJson = await response.json();
      const data = dataJson.data;

      const sortedData = data.sort((a, b) => {
        const descriptionA = a.description ? a.description.toString().toLowerCase() : '';
        const descriptionB = b.description ? b.description.toString().toLowerCase() : '';
        return descriptionA.localeCompare(descriptionB);
      });
      let isCartInsertEnabled = $('#card-insert').prop('checked');
      let selectedCardInsertType;
      if(isCartInsertEnabled){
        selectedCardInsertType = $('input[name="cardType"]:checked').val();
      }
      if (selectedCardInsertType === 'singleSide') {
        populateDropdown('singleSideTemplate', sortedData);
      } else {
        populateDropdown('frontTemplate', sortedData);
        populateDropdown('backTemplate', sortedData);
      }
    } catch (error) {
      throw error;
    }
  }

  function populateDropdown(templateName, templates) {
    let isCartInsertEnabled = $('#card-insert').prop('checked');
    let selectedMessageType = $('input[name="msgType"]:checked').val().replace(/\s+/g, '');
    selectedMessageType = isCartInsertEnabled && selectedMessageType === 'SelfMailer' ? 'Trifold'  : selectedMessageType;
    let selectedCreationType = $('input[name=\'createType\']:checked').val().replace(/\s+/g, '');
    const $templateInput = $(`.${selectedMessageType} .${selectedCreationType} .${templateName}`);
    const $list = $(`.${selectedMessageType} .${selectedCreationType} .${templateName}List`);
    $list.empty();

    templates.forEach(template => {
      const $listItem = $('<li>')
        .text(template.description || 'No description')
        .attr('data-id', template.id)
        .addClass('dropdown-item')
        .on('click', function () {
          $templateInput.val(template.description || 'No description');  // Set input value
          $templateInput.attr('data-id', template.id);
          $list.hide();
        });
      $list.append($listItem);
    });
  }

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
        break;
      }
    });
  }

  async function validateApiKey(apiKey, inputSelector, errorSelector) {
    if (!apiKey) {
      return true;
    }
  
    const url = 'https://api.postgrid.com/print-mail/v1/contacts?limit=1';
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'x-api-key': apiKey }
      });
  
      if (!response.ok) {
        $(inputSelector).css('border', '1px solid red');
        $(errorSelector).text(`Invalid API key: ${apiKey}`).show();
        return false;
      }
    } catch (error) {
      throw error;
    }
    return true;
  }
  
  async function authenticateApiKeys() {
    const testApiKey = $('#test-api-key').val().trim();
    const liveApiKey = $('#live-api-key').val().trim();
  
    const isTestKeyValid = await validateApiKey(testApiKey, '#test-api-key', '#test-api-key-error');
    const isLiveKeyValid = await validateApiKey(liveApiKey, '#live-api-key', '#live-api-key-error');
  
    return isTestKeyValid && isLiveKeyValid;
  }

  $('.toggle-password').on('click', toggleApiKeyVisibility);
  $('input.api-key').on('input', hideError);

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

    connection.trigger('updateButton', {
      button: 'next',
      enabled: true
    });
  });

  $('.preview-container .retry-preview-btn').click(async function() {
    await showPdfPreview(previewPayload.messageId, true, true);
  });

  $('.express-delivery-input').on('click', function() {
    var isChecked = $(this).prop('checked');
    var mailingClass = $(this).closest('.spacer').find('.mailing-class');
    
    if (isChecked) {
      mailingClass.prop('disabled', true);
    } else {
      mailingClass.prop('disabled', false);
    }
  });

  $('#search-contact').on('input', debounce(function () {
    const searchQuery = $(this).val();
    if (searchQuery.length > 2) {
      fetchContacts(searchQuery);
    } else {
      $('#dropdown-options').empty().hide();
    }
  }, 300));  

  $('#dropdown-options').on('click', 'div', function () {
    const contact = $(this).data('contact');
    var contactValue = contact.firstName ? contact.firstName : contact.companyName;
    $('#search-contact').val(contactValue);
    $('#dropdown-options').hide();
    fromContact.id = contact.id;
    fromContact.name = contactValue;
  });

  $('#search-contact').on('focus', function () {
    const searchQuery = $(this).val().trim();
    if ($('#dropdown-options').is(':hidden')) {
      if (searchQuery === '' && $('#dropdown-options div').length === 0) {
        fetchContacts();
      } else {
        $('#dropdown-options').show();
      }
    }
  });

  $('.mapping-fields-group #firstName, .mapping-fields-group #companyName').change(function () {
    var isFirstName = $(this).attr('id') === 'firstName';
    var targetLabel = isFirstName 
      ? $('.mapping-fields-group label[for="companyName"]') 
      : $('.mapping-fields-group label[for="firstName"]');
  
    if ($(this).val() !== 'Select') {
      targetLabel.text(targetLabel.text().replace(' *', ''));
    } else {
      if (!targetLabel.text().includes('*')) {
        targetLabel.text(targetLabel.text() + ' *');
      }
    }  
  });

  $('.mapping-fields-group select').on('click', function () {
    resetToContactMappingErrors();
  });

  $('#frontTemplateInput, #backTemplateInput, #selfMailer-insideTemplateInput, #selfMailer-outsideTemplateInput').on('focus', function () {
    $(this).closest('.template-dropdown-wrap').next('.dropdown-options').show();
  });

  $('#frontTemplateInput, #backTemplateInput, #selfMailer-insideTemplateInput, #selfMailer-outsideTemplateInput').on('input', debounce(function () {
    fetchTemplates($(this).val().trim());
  }, 300));

  $(document).ready(function () {
    const $liveModeToggle = $('.test-to-live-switch input');
    const $errorMessage = $('#liveModeError');
  
    if ($liveModeToggle.length > 0) {
      $('.test-to-live-switch')
        .on('mouseenter', function () {
          if ($liveModeToggle.prop('disabled')) {
            $errorMessage.show();
          }
        })
        .on('mouseleave', function () {
          $errorMessage.hide();
        });
  
      $liveModeToggle.on('change', function () {
        previewPayload.liveApiKeyEnabled = $(this).is(':checked');
      });
    }
  
    $('input, textarea, select').on('input change', function () {
      $(this).removeClass('error-field').next('.error-message').remove();
    });
  
    const today = new Date().toISOString().split('T')[0];
    $('#sendDate3').val(today).attr('min', today);
    
    $(document).on('click', function (event) {
      const isClickInsideDropdown = $(event.target).is('#dropdown-options, #search-contact');
      const isClickInsideFront = $(event.target).closest('#frontTemplateList, #frontTemplateInput').length > 0;
      const isClickInsideBack = $(event.target).closest('#backTemplateList, #backTemplateInput').length > 0;
      const isClickInsideFrontSelfMailer = $(event.target).closest('#selfMailer-insideTemplateList, #selfMailer-insideTemplateInput').length > 0;
      const isClickInsideBackSelfMailer = $(event.target).closest('#selfMailer-outsideTemplateList, #selfMailer-outsideTemplateInput').length > 0;
      if (!isClickInsideDropdown) {
        $('#dropdown-options').hide();
      }
      if (!isClickInsideFront) {
        $('#frontTemplateList').hide();
      }
      if (!isClickInsideBack) {
        $('#backTemplateList').hide();
      }
      if(!isClickInsideFrontSelfMailer){
        $('#selfMailer-insideTemplateList').hide();
      }
      if(!isClickInsideBackSelfMailer){
        $('#selfMailer-outsideTemplateList').hide();
      }
    });
  });
});
