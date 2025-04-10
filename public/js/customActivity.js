define([
  'postmonger',
], function (
  Postmonger
) {
  'use strict';
  var request = require([request]);
  var connection = new Postmonger.Session();
  var payload = {};
  var deData = {};
  var previewDEMapOptions = {};
  var authorization = {};
  let previewPayload = {
    isValid: true,
    templateEnvironment: '',
    envelopeEnvironment: '',
    contactEnvironment: '',
    liveApiKeyEnabled: false
  };
  var authToken, et_subdomain, authTSSD;
  let fromContact = {};
  let doesPayloadHasAPIKeys = true;
  let toContact = '';
  const POSTGRID_API_BASE_URL = 'https://api.postgrid.com/print-mail/v1/';
  let currentEnabledEnvironmenet = '';

  var steps = [
    { 'label': 'Connect Account', 'key': 'step1' },
    { 'label': 'Select Message type', 'key': 'step2' },
    { 'label': 'Create', 'key': 'step3' },
    { 'label': 'Map Fields', 'key': 'step4' },
    { 'label': 'Preview', 'key': 'step5' }
  ];

  $(window).ready(onRender);

  function onRender() {
    $('.activity-loader').addClass('show');
    connection.trigger('requestSchema');
    connection.trigger('requestTokens');
    connection.trigger('requestEndpoints');
    connection.trigger('ready');
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
    connection.trigger('ready');
  });

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
    doesPayloadHasAPIKeys = hasPostcardArguments;
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
        if(value === 'trifold'){
          value = 'selfmailer';
        }
        if (value === 'selfmailer') {
          $('#card-insert-container').addClass('visible');
          $('.card-insert-wrapper').addClass('visible');
        }
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
      case 'pdf' :
        var queryString = `.${postcardArguments.messageType.replace(/\s+/g, '')} .${postcardArguments.creationType.replace(/\s+/g, '')} .pdfLink`;
        $(queryString).val(value);
        break;
      case 'mailingClass':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '') + ' .mailing-class';
        $(queryString).val(value);
        break;
      case 'liveApiKeyEnabled':
        $('.test-to-live-switch input').prop('checked', value).trigger('change');
        const apiKeyEnabled = value ? 'Live' : 'Test';
        previewPayload.templateEnvironment = apiKeyEnabled;
        previewPayload.envelopeEnvironment = apiKeyEnabled;
        previewPayload.contactEnvironment = apiKeyEnabled;
        break;
      case 'cardInsertType':
        if(value){
          $('#card-insert').prop('checked', true);
          $('#card-insert-type').removeClass('hidden');
          $('input[name="cardType"][value=\'' + value + '\']').prop('checked', true);
        }
        break;
      case 'cardfrontHtmlContent':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '') + ' .html-editor-front-card-insert';
        $(queryString).val(value);
        break;
      case 'cardbackHtmlContent':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '') + ' .html-editor-back-card-insert';
        $(queryString).val(value);
        break;
      case 'cardSize':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '') + ' .cardSize';
        $(queryString).val(value);
        break;
      case 'pdfLinkInput':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '') + ' .pdfLink';
        $(queryString).val(value);
        break;
      case 'singleSideTemplateName':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' .singleSideTemplate';
        $(queryString).val(value);
        $(queryString).attr('data-id', postcardArguments.singleSideTemplateId);
        break;
      case 'extraServiceName':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' .extra-service';
        $(queryString).val(value);
        $(queryString).attr('data-id', postcardArguments.extraService);
        break;
      case 'envelopeTypeName':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' .envelope-type';
        $(queryString).val(value);
        $(queryString).attr('data-id', postcardArguments.envelopeType);
        break;
      case 'returnEnvelopeName':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' .returnEnvelope';
        $(queryString).val(value);
        $(queryString).attr('data-id', postcardArguments.returnEnvelope);
        break;
      case 'color':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' .color-input';
        $(queryString).prop('checked',value);
        break;
      case 'perforatedPage':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' .preforate-first-page-input';
        value = value === 1 ? true : false;
        $(queryString).prop('checked',value);
        break;
      case 'doubleSided':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' .double-sided-input';
        $(queryString).prop('checked',value);
        break;
      case 'addressPlacement':
        var queryString = '.' + postcardArguments.messageType.replace(/\s+/g, '') + ' .' + postcardArguments.creationType.replace(/\s+/g, '')+ ' .insert-blank-page-input';
        value = value === 'insert_blank_page' ? true : false;
        $(queryString).prop('checked',value);
        break;
      default:
        break;
      }
    });
    
    initializeHandler();
  }

  connection.on('requestedEndpoints', onGetEndpoints);
  function onGetEndpoints (endpoints) {
    et_subdomain = endpoints.restHost;        
    authTSSD = (endpoints.authTSSD).split('//')[1].split('.')[0];
  }

  connection.on('requestedTokens', async (tokens) => {
    await onGetTokens(tokens);
  });

  async function onGetTokens (tokens) {
    authToken = tokens.fuel2token;
    await fetchExternalKey('PostGrid_API_Credentials');
    await fetchExternalKey('Postgrid_Logging_Data');
  }

  var currentStep = steps[0].key;
  function onClickedNext() {
    switch (currentStep.key) {
    case 'step1':
      if (validateApiKeys()) {
        authenticateApiKeys().then((isAuthenticated) => {
          if (isAuthenticated) {
            handleApiKeyToggle();
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
        let selectedCreationType = $('input[name=\'createType\']:checked').val().replace(/\s+/g, '');

        if (selectedRadio.length > 0) {
          let selectedRadioValue = selectedRadio.val().replace(/\s+/g, '');
          selectedMessageType = isCartInsertEnabled && selectedRadioValue === 'selfmailer' ? 'trifold'  : selectedRadioValue;
          if(isCartInsertEnabled && selectedRadioValue === 'selfmailer') {
            selectedMessageType = 'trifold';
          } else if(isCartInsertEnabled && selectedRadioValue === 'Letters' ) {
            selectedMessageType = 'LettersCardInsert';
          }
        }

        if (isCartInsertEnabled) {
          $('.trifold .doubleSide, .trifold .singleSide').hide();
          let selectedCardType = $('input[name="cardType"]:checked').val();
          $(`.trifold .${selectedCardType}`).show();
        }

        let isHtml = $('#htmlId').is(':checked');

        if(isHtml){
          $(`.${selectedMessageType} .error-msg`).removeClass('show');
        }

        if(isCartInsertEnabled){
          let selectedCardInsertType = $('input[name="cardType"]:checked').val();
          if(selectedCardInsertType === 'singleSide'){
            $(`.${selectedMessageType} .html-editor .singleSided-hide`).hide();
            $('.html-btn-card-front').text('Card Insert');
          }else{
            $(`.${selectedMessageType} .html-editor .singleSided-hide`).show();
            $('.html-btn-card-front').text('Card Inside');
          }
        }

        let isPdf = $('#pdfId').is(':checked');
        let isExtTemp = $('#extTempId').is(':checked');

        currentEnabledEnvironmenet = previewPayload.liveApiKeyEnabled ? 'Live' : 'Test';
        if (isExtTemp) {
          if(previewPayload.templateEnvironment !== currentEnabledEnvironmenet) {
            $(`.${selectedMessageType} .${selectedCreationType} .frontTemplate`).val('');
            $(`.${selectedMessageType} .${selectedCreationType} .backTemplate`).val('');
          }
        }
        fetchTemplates();
        if(previewPayload.envelopeEnvironment !== currentEnabledEnvironmenet) {
          $(`.${selectedMessageType} .${selectedCreationType} .returnEnvelope`).val('');
          $(`.${selectedMessageType} .${selectedCreationType} .returnEnvelope`).attr('data-id', '');
        }
        fetchReturnEnvelope();

        if(previewPayload.contactEnvironment !== currentEnabledEnvironmenet) {
          $('.contact-dropdown-container #search-contact').val('');
        }
        fetchContacts();

        $(`.${selectedMessageType} > .screen-1`).toggle(isHtml);
        $(`.${selectedMessageType} > .screen-2`).toggle(isPdf);
        $(`.${selectedMessageType} > .screen-3`).toggle(isExtTemp);

        createContact();
        connection.trigger('nextStep');
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
          $('.error-message-contact-mapping').hide();
          $('.contact-dropdown-container input').removeClass('error');
          $('.contact-dropdown-container .error-msg').removeClass('show');
          $('.error-toast-wrap').removeClass('show');
          $('.error-toast-message').text('');
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
        visible: true
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
    let isCartInsertEnabled = $('#card-insert').prop('checked');
    let selectedCardInsertType;
    if(isCartInsertEnabled){
      selectedCardInsertType = $('input[name="cardType"]:checked').val();
      previewPayload.cardInsertType = selectedCardInsertType;
    } else {
      previewPayload.cardInsertType = null;
    }
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

    let selectedMessageType = $('input[name="msgType"]:checked').val();
    if(isCartInsertEnabled && selectedMessageType === 'selfmailer') {
      selectedMessageType = 'trifold';
    } else if(isCartInsertEnabled && selectedMessageType === 'Letters' ) {
      selectedMessageType = 'LettersCardInsert';
    }
    previewPayload.creationType = $('input[name=\'createType\']:checked').val();
    payload['arguments'].execute.inArguments[0]['internalPostcardJson'] = previewPayload;
    payload['arguments'].execute.inArguments[0]['MapDESchema']=MapDESchema;
    payload['arguments'].execute.inArguments[0]['previewDEMapOptions']=previewDEMapOptions;
    payload['metaData'].isConfigured = true;
    var postCardJson = {
      from: previewPayload.fromContact ? previewPayload.fromContact.id : '',
      express: previewPayload.isExpressDelivery,
      description: previewPayload.description,
    };
    if(previewPayload.messageType !== 'Letters') {
      postCardJson.size = previewPayload.size;
    }
    if(!previewPayload.isExpressDelivery) {
      postCardJson.mailingClass = previewPayload.mailingClass;
    }
    if(previewPayload.messageType === 'Postcards'){
      if(previewPayload.creationType === 'html-creation-type'){
        postCardJson.frontHTML = previewPayload.frontHtmlContent;
        postCardJson.backHTML = previewPayload.backHtmlContent;
      } else if(previewPayload.creationType === 'template-creation-type'){
        postCardJson.frontTemplate = previewPayload.frontTemplateId;
        postCardJson.backTemplate = previewPayload.backTemplateId;
      } else if(previewPayload.creationType === 'pdf-creation-type'){
        postCardJson.pdf = previewPayload.pdfLink;
      }
    } else if(previewPayload.messageType === 'selfmailer'){
      if(previewPayload.creationType === 'html-creation-type'){
        postCardJson.insideHTML = previewPayload.frontHtmlContent;
        postCardJson.outsideHTML = previewPayload.backHtmlContent;
      } else if(previewPayload.creationType === 'template-creation-type'){
        postCardJson.insideTemplate = previewPayload.frontTemplateId;
        postCardJson.outsideTemplate = previewPayload.backTemplateId;
      } else if(previewPayload.creationType === 'pdf-creation-type'){
        postCardJson.pdf = previewPayload.pdfLink;
      }
    } else if(previewPayload.messageType === 'trifold'){
      postCardJson.insideHTML = previewPayload.frontHtmlContent;
      postCardJson.outsideHTML = previewPayload.backHtmlContent;
      postCardJson.adhesiveInsert = postCardJson.adhesiveInsert || {}; 
      postCardJson.adhesiveInsert.size = previewPayload.cardInsertSize;  
      if(previewPayload.creationType === 'html-creation-type'){
        if(selectedCardInsertType === 'singleSide'){
          postCardJson.adhesiveInsert.singleSided = postCardJson.adhesiveInsert.singleSided || {};
          postCardJson.adhesiveInsert.singleSided.html = previewPayload.cardfrontHtmlContent;
        }
        else if(selectedCardInsertType === 'doubleSide'){
          postCardJson.adhesiveInsert.doubleSided = postCardJson.adhesiveInsert.doubleSided || {};
          postCardJson.adhesiveInsert.doubleSided.outsideHTML = previewPayload.cardbackHtmlContent;
          postCardJson.adhesiveInsert.doubleSided.insideHTML = previewPayload.cardfrontHtmlContent;;
        }
      }
      else if(previewPayload.creationType === 'pdf-creation-type'){
        postCardJson.adhesiveInsert.size = previewPayload.pdfCardSize;
        if(selectedCardInsertType === 'singleSide'){
          postCardJson.adhesiveInsert.singleSided = postCardJson.adhesiveInsert.singleSided || {};
          postCardJson.adhesiveInsert.singleSided.pdf = previewPayload.pdfLink;
        }
        else{
          postCardJson.adhesiveInsert.doubleSided = postCardJson.adhesiveInsert.doubleSided || {};
          postCardJson.adhesiveInsert.doubleSided.pdf = previewPayload.pdfLink;
        }
      }
    } else if(previewPayload.messageType === 'Letters'){
      if(previewPayload.extraService !== '' && previewPayload.extraService !== undefined && !previewPayload.isExpressDelivery) {
        postCardJson.extraService = previewPayload.extraService;
      }
      if(previewPayload.envelopeType !== '' && previewPayload.envelopeType !== undefined){
        postCardJson.envelopeType = previewPayload.envelopeType;
      }
      if(previewPayload.returnEnvelope !== '' && previewPayload.returnEnvelope !== undefined){
        postCardJson.returnEnvelope = previewPayload.returnEnvelope;
      }
      postCardJson.color = previewPayload.colorInput;
      postCardJson.doubleSided = previewPayload.doubleSidedInput;
      if (previewPayload.perforateFirstPageInput) {
        postCardJson.perforatedPage = 1;
      }
      if(previewPayload.insertBlankPageInput === true) {
        postCardJson.addressPlacement = 'insert_blank_page';
      } else {
        postCardJson.addressPlacement = 'top_first_page';
      }
      if(previewPayload.creationType === 'html-creation-type'){
        postCardJson.html = previewPayload.frontHtmlContent;
      } else if(previewPayload.creationType === 'template-creation-type'){
        postCardJson.template = previewPayload.frontTemplateId;
      } else if(previewPayload.creationType === 'pdf-creation-type'){
        postCardJson.pdf = previewPayload.pdfLink;
      }
    }
    payload['arguments'].execute.inArguments[0]['postcardJson'] = postCardJson;
    authorization['authToken'] = authToken;
    authorization['et_subdomain'] = et_subdomain;
    authorization['authTSSD'] = authTSSD;
    
    payload['arguments'].execute.inArguments[0]['authorization'] = authorization;
    connection.trigger('updateActivity', payload);
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
      if (this.id === 'letters') {
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
        let selectedMessageType = $('input[name="msgType"]:checked').val();
        if(selectedMessageType === 'selfmailer') {
          $('#extTempId').css('display','none');
          $('label[for="extTempId"]').css('display','none');
          $('#extTempId').prop('checked', false);
        }
      } else {
        $('#card-insert-type').addClass('hidden');
        $('#extTempId').css('display','block');
        $('label[for="extTempId"]').css('display','block');
      }
    });
  }

  function setDefaultValuesForPostCardCreation() {
    let isCartInsertEnabled = $('#card-insert').prop('checked');
    let selectedMessageType = $('input[name="msgType"]:checked').val().replace(/\s+/g, '');
    let selectedCreationType = $('input[name=\'createType\']:checked').val().replace(/\s+/g, '');
    if(isCartInsertEnabled && selectedMessageType === 'selfmailer') {
      selectedMessageType = 'trifold';
    } else if(isCartInsertEnabled && selectedMessageType === 'Letters' ) {
      selectedMessageType = 'LettersCardInsert';
    }
    $(`.${selectedMessageType} .html-editor .html-btn-front`).click(function () {
      $(`.${selectedMessageType} .html-editor .btn-light`).removeClass('show');
      $(`.${selectedMessageType} .html-editor .html-area`).removeClass('show');
      $(this).addClass('show');
      $(`.${selectedMessageType} .html-editor-front`).addClass('show');
    });
    $(`.${selectedMessageType} .html-editor .html-btn-back`).click(function () {  
      $(`.${selectedMessageType} .html-editor .btn-light`).removeClass('show');
      $(`.${selectedMessageType} .html-editor .html-area`).removeClass('show');
      $(this).addClass('show');
      $(`.${selectedMessageType} .html-editor-back`).addClass('show');
    });
    $(`.${selectedMessageType} .html-editor .html-btn-card-front`).click(function () {  
      $(`.${selectedMessageType} .html-editor .btn-light`).removeClass('show');
      $(`.${selectedMessageType} .html-editor .html-area`).removeClass('show');
      $(this).addClass('show');
      $(`.${selectedMessageType} .html-editor-front-card-insert`).addClass('show');
    });
    $(`.${selectedMessageType} .html-editor .html-btn-card-back`).click(function () {  
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
      $(`${containerSelector} .size-radio-label .radio-input`).first().prop('checked', true);
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
    if(isCartInsertEnabled && selectedMessageType === 'selfmailer') {
      selectedMessageType = 'trifold';
    } else if(isCartInsertEnabled && selectedMessageType === 'Letters' ) {
      selectedMessageType = 'LettersCardInsert';
    }
    if ($(`.${selectedMessageType} .screen-1`).css('display') === 'block') {
      let isDescriptionValid = validateInputField($(`.${selectedMessageType} .screen-1 .description`));
      
      if (!isDescriptionValid) {
        isValid = false;
      }
      let postcardHtmlEditorErrorMsg = $(`.${selectedMessageType} .html-editor .error-msg`);
      let isPostcardSizeSelected = $(`.${selectedMessageType} .html-size .radio-input:checked`).length;
      let frontHtmlContent = $(`.${selectedMessageType} .html-editor-front`).val().trim();
      let frontHtmlBtnLabel = $(`.${selectedMessageType} .html-editor-front`).data('btn-label');
      let backHtmlContent = $(`.${selectedMessageType} .html-editor-back`).val() === undefined ? undefined : $(`.${selectedMessageType} .html-editor-back`).val().trim();
      let backHtmlBtnLabel = $(`.${selectedMessageType} .html-editor-back`).val() === undefined ? undefined : $(`.${selectedMessageType} .html-editor-back`).data('btn-label');
      let cardfrontHtmlContent, cardfrontHtmlBtnLabel, cardbackHtmlContent, cardbackHtmlBtnLabel;

      if(isCartInsertEnabled && selectedCardInsertType === 'doubleSide') {
        cardfrontHtmlContent = $(`.${selectedMessageType} .html-editor-front-card-insert`).val().trim();
        cardfrontHtmlBtnLabel = $(`.${selectedMessageType} .html-editor-front-card-insert`).data('btn-label');
        cardbackHtmlContent = $(`.${selectedMessageType} .html-editor-back-card-insert`).val().trim();
        cardbackHtmlBtnLabel = $(`.${selectedMessageType} .html-editor-back-card-insert`).data('btn-label');  

        if (frontHtmlContent === '' || backHtmlContent === '' || cardfrontHtmlContent === '' || cardbackHtmlContent === '') {
          isValid = false;

          if (cardfrontHtmlContent === '' && cardbackHtmlContent === '' && frontHtmlContent === '' && backHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${frontHtmlBtnLabel}, ${backHtmlBtnLabel}, ${cardfrontHtmlBtnLabel}, ${cardbackHtmlBtnLabel}.`).addClass('show');
          } else {
            let missingFields = [];
            if (cardfrontHtmlContent === '') {missingFields.push(cardfrontHtmlBtnLabel);}
            if (cardbackHtmlContent === '') {missingFields.push(cardbackHtmlBtnLabel);}
            if (frontHtmlContent === '') {missingFields.push(frontHtmlBtnLabel);}
            if (backHtmlContent === '') {missingFields.push(backHtmlBtnLabel);}

            if (missingFields.length > 0) {
              postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${missingFields.join(', ')}.`).addClass('show');
            }
          }
        } else { 
          postcardHtmlEditorErrorMsg.removeClass('show');
        }        
      } else if(isCartInsertEnabled && selectedCardInsertType === 'singleSide') {
        cardfrontHtmlContent = $(`.${selectedMessageType} .html-editor-front-card-insert`).val().trim();
        cardfrontHtmlBtnLabel = $(`.${selectedMessageType} .html-editor-front-card-insert`).data('btn-label');

        if (frontHtmlContent === '' || backHtmlContent === '' || cardfrontHtmlContent === '') {
          isValid = false;
          if (frontHtmlContent === '' && backHtmlContent === '' && cardfrontHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${frontHtmlBtnLabel}, ${backHtmlBtnLabel}, ${cardfrontHtmlBtnLabel}.`).addClass('show');
          } else {
            let missingFields = [];
            if (frontHtmlContent === '') {missingFields.push(frontHtmlBtnLabel);}
            if (backHtmlContent === '') {missingFields.push(backHtmlBtnLabel);}
            if (cardfrontHtmlContent === '') {missingFields.push(cardfrontHtmlBtnLabel);}

            if (missingFields.length > 0) {
              postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${missingFields.join(', ')}.`).addClass('show');
            }
          }
        } else { 
          postcardHtmlEditorErrorMsg.removeClass('show');
        }
      } else if(selectedMessageType === 'Letters') { 
        if(frontHtmlContent === '') {
          isValid = false;
          postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${frontHtmlBtnLabel}.`).addClass('show');
        } else { 
          postcardHtmlEditorErrorMsg.removeClass('show');
        }
      } else{
        if (frontHtmlContent === '' || backHtmlContent === '') {
          isValid = false;
          if (frontHtmlContent === '' && backHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${frontHtmlBtnLabel}, ${backHtmlBtnLabel}.`).addClass('show');
          } else if (frontHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${frontHtmlBtnLabel}.`).addClass('show');
          } else {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${backHtmlBtnLabel}.`).addClass('show');
          }
        } else { 
          postcardHtmlEditorErrorMsg.removeClass('show');
        }
      }

      if(selectedMessageType !== 'Letters'){
        if (!(isPostcardSizeSelected > 0)) {
          $(`.${selectedMessageType} .html-size .error-msg`).addClass('show');
          isValid = false;
        } else {
          $(`.${selectedMessageType} .html-size .error-msg`).removeClass('show');
        }
      }
    };
    
    if ($(`.${selectedMessageType} .screen-2`).css('display') === 'block') {
      const pdfLinkElement = $(`.${selectedMessageType} .screen-2 .pdfLink`);
      let isDescriptionValid = validateInputField($(`.${selectedMessageType} .screen-2 .description`));
      pdfLinkElement.siblings('.error-msg').text('Please enter required field');
      let isPdfLinkValid = validateInputField(pdfLinkElement);
      
      if (!isDescriptionValid || !isPdfLinkValid) {
        isValid = false;
      }
  
      if (selectedMessageType === 'trifold') {
        let frontHtmlContent = $(`.${selectedMessageType} .screen-2 .html-editor-front`).val().trim();
        let frontHtmlBtnLabel = $(`.${selectedMessageType} .screen-2 .html-editor-front`).data('btn-label');
        let backHtmlContent = $(`.${selectedMessageType} .screen-2 .html-editor-back`).val().trim();
        let backHtmlBtnLabel = $(`.${selectedMessageType} .screen-2 .html-editor-back`).data('btn-label');
        let postcardHtmlEditorErrorMsg = $(`.${selectedMessageType} .screen-2 .html-editor .error-msg`);
  
        if (frontHtmlContent === '' || backHtmlContent === '') {
          isValid = false;
          if (frontHtmlContent === '' && backHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${frontHtmlBtnLabel}, ${backHtmlBtnLabel}.`).addClass('show');
          } else if (frontHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${frontHtmlBtnLabel}.`).addClass('show');
          } else {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${backHtmlBtnLabel}.`).addClass('show');
          }
        } else { 
          postcardHtmlEditorErrorMsg.removeClass('show');
        }
      }
    }

    if ($(`.${selectedMessageType} .screen-3`).css('display') === 'block'){
      let isDescriptionValid = validateInputField($(`.${selectedMessageType} .screen-3 .description`));
      if (!isDescriptionValid) {
        isValid = false;
      }
      if (selectedMessageType === 'trifold') {
        let frontHtmlContent = $(`.${selectedMessageType} .screen-3 .html-editor-front`).val().trim();
        let frontHtmlBtnLabel = $(`.${selectedMessageType} .screen-3 .html-editor-front`).data('btn-label');
        let backHtmlContent = $(`.${selectedMessageType} .screen-3 .html-editor-back`).val().trim();
        let backHtmlBtnLabel = $(`.${selectedMessageType} .screen-3 .html-editor-back`).data('btn-label');
        let postcardHtmlEditorErrorMsg = $(`.${selectedMessageType} .screen-3 .html-editor .error-msg`);

        if (frontHtmlContent === '' || backHtmlContent === '') {
          isValid = false;
          if (frontHtmlContent === '' && backHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${frontHtmlBtnLabel}, ${backHtmlBtnLabel}.`).addClass('show');
          } else if (frontHtmlContent === '') {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${frontHtmlBtnLabel}.`).addClass('show');
          } else {
            postcardHtmlEditorErrorMsg.text(`Please enter content in the following fields: ${backHtmlBtnLabel}.`).addClass('show');
          }
        } else { 
          postcardHtmlEditorErrorMsg.removeClass('show');
        }
      }
      if(selectedMessageType === 'trifold' && selectedCardInsertType === 'singleSide'){
        let singleSideTemplate = validateInputField($(`.${selectedMessageType} .screen-3 .singleSideTemplate`));
        if(!singleSideTemplate){
          isValid = false;
        }
      } else {
        let frontTemplateValid = validateInputField($(`.${selectedMessageType} .screen-3 .frontTemplate`));
        let backTemplateValid;
        if(selectedMessageType !== 'Letters' && selectedMessageType !== 'LettersCardInsert' ) {
          backTemplateValid = validateInputField($(`.${selectedMessageType} .screen-3 .backTemplate`));
        } else {
          backTemplateValid = true;
        }
        if(!frontTemplateValid || !backTemplateValid){
          isValid = false;
        }
      }
      if(selectedMessageType === 'LettersCardInsert'){
        let isHtmlInputValid = validateInputField($(`.${selectedMessageType} .screen-3 .html-editor-front`));
        if (!isHtmlInputValid) {
          isValid = false;
        }
      }
    }
    return isValid;
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
    if(isCartInsertEnabled && selectedMessageType === 'selfmailer') {
      selectedMessageType = 'trifold';
    } else if(isCartInsertEnabled && selectedMessageType === 'Letters' ) {
      selectedMessageType = 'LettersCardInsert';
    }
    let selectedCreationType = $('input[name=\'createType\']:checked').val().replace(/\s+/g, '');
    let selectedCardInsertType;
    let isTrifoldEnabled = selectedMessageType === 'trifold';
    if(isCartInsertEnabled){
      selectedCardInsertType = $('input[name="cardType"]:checked').val();
    }

    let extraService;
    let extraServiceName;
    let envelopeType;
    let envelopeTypeName;
    let returnEnvelope;
    let returnEnvelopeName;
    let colorInput;
    let perforateFirstPageInput;
    let doubleSidedInput;
    let insertBlankPageInput;

    if(selectedMessageType === 'Letters') {
      extraService = $(`.${selectedMessageType} .${selectedCreationType} .extra-service`).data('id');
      extraServiceName = $(`.${selectedMessageType} .${selectedCreationType} .extra-service`).val();
      envelopeType = $(`.${selectedMessageType} .${selectedCreationType} .envelope-type`).data('id');
      envelopeTypeName = $(`.${selectedMessageType} .${selectedCreationType} .envelope-type`).val();
      returnEnvelope = $(`.${selectedMessageType} .${selectedCreationType} .returnEnvelope`).data('id');
      returnEnvelopeName = $(`.${selectedMessageType} .${selectedCreationType} .returnEnvelope`).val();
      colorInput = $(`.${selectedMessageType} .${selectedCreationType} .color-input`).is(':checked');
      perforateFirstPageInput = $(`.${selectedMessageType} .${selectedCreationType} .preforate-first-page-input`).is(':checked');
      doubleSidedInput = $(`.${selectedMessageType} .${selectedCreationType} .double-sided-input`).is(':checked');
      insertBlankPageInput = $(`.${selectedMessageType} .${selectedCreationType} .insert-blank-page-input`).is(':checked');
      
      previewPayload.extraService = extraService;
      previewPayload.extraServiceName = extraServiceName;
      previewPayload.envelopeType = envelopeType;
      previewPayload.envelopeTypeName = envelopeTypeName;
      previewPayload.returnEnvelope = returnEnvelope;
      previewPayload.returnEnvelopeName = returnEnvelopeName;
      previewPayload.colorInput = colorInput;
      previewPayload.perforateFirstPageInput = perforateFirstPageInput;
      previewPayload.doubleSidedInput = doubleSidedInput;
      previewPayload.insertBlankPageInput = insertBlankPageInput;
    }

    if ($(`.${selectedMessageType} .screen-1`).css('display') === 'block') {
      const description = $(`.${selectedMessageType} .${selectedCreationType} .description`).val();
      const mailingClass = $(`.${selectedMessageType} .${selectedCreationType} .mailing-class`).val();
      const frontHtmlContent = $(`.${selectedMessageType} .screen-1 .html-editor-front`).val();
      const isExpressDelivery = $(`.${selectedMessageType} .${selectedCreationType} .express-delivery-input`).is(':checked');
      let backHtmlContent;
      let size;

      if(selectedMessageType !== 'Letters') {
        backHtmlContent = $(`.${selectedMessageType} .screen-1 .html-editor-back`).val();
        size = $(`.${selectedMessageType} .html-size .radio-input:checked`).val();
        previewPayload.backHtmlContent = backHtmlContent;
        previewPayload.size = size;
      }

      previewPayload.screen = 'html';
      previewPayload.description = description;
      previewPayload.mailingClass = mailingClass;
      previewPayload.frontHtmlContent = frontHtmlContent;

      if(isCartInsertEnabled && selectedCardInsertType === 'doubleSide'){
        const cardfrontHtmlContent = $(`.${selectedMessageType} .html-editor-front-card-insert`).val().trim();
        const cardbackHtmlContent = $(`.${selectedMessageType} .html-editor-back-card-insert`).val().trim();
        const cardInsertSize = $(`.${selectedMessageType} .html-card-size .radio-input:checked`).val();
        
        previewPayload.cardfrontHtmlContent = cardfrontHtmlContent;
        previewPayload.cardbackHtmlContent = cardbackHtmlContent;
        previewPayload.cardSize = cardInsertSize;
        
      }else if(isCartInsertEnabled && selectedCardInsertType === 'singleSide'){
        const cardfrontHtmlContent = $(`.${selectedMessageType} .html-editor-front-card-insert`).val().trim();
        const cardInsertSize = $(`.${selectedMessageType} .html-card-size .radio-input:checked`).val();
        previewPayload.cardfrontHtmlContent = cardfrontHtmlContent;
        previewPayload.cardSize = cardInsertSize;
      }else{
        previewPayload.isExpressDelivery = isExpressDelivery;
      }
    } else if ($(`.${selectedMessageType} .screen-2`).css('display') === 'block') {
      const description = $(`.${selectedMessageType} .${selectedCreationType} .description`).val();;
      const mailingClass = $(`.${selectedMessageType} .${selectedCreationType} .mailing-class`).val();

      previewPayload.screen = 'pdf';
      previewPayload.description = description;
      previewPayload.mailingClass = mailingClass;

      if(selectedMessageType !== 'Letters') {
        const size = $(`.${selectedMessageType} .pdf-size .radio-input:checked`).val();
        previewPayload.size = size;
      }

      if(isTrifoldEnabled) {
        const pdfLink = $(`.${selectedMessageType} .${selectedCreationType} .pdfLink`).val();
        const pdfCardSize = $(`.${selectedMessageType} .pdf-card-size .radio-input:checked`).val();
        const frontHtmlContent = $(`.${selectedMessageType} .screen-2 .html-editor-front`).val();
        const backHtmlContent = $(`.${selectedMessageType} .screen-2 .html-editor-back`).val();

        previewPayload.pdfLinkInput = pdfLink;
        previewPayload.cardSize = pdfCardSize;
        previewPayload.frontHtmlContent = frontHtmlContent;
        previewPayload.backHtmlContent = backHtmlContent;
      } else {
        const isExpressDelivery = $(`.${selectedMessageType} .${selectedCreationType} .express-delivery-input`).is(':checked');
        const pdfLink = $(`.${selectedMessageType} .screen-2 .pdfLink`).val().trim();
        previewPayload.isExpressDelivery = isExpressDelivery;
        previewPayload.pdf = pdfLink;
      }
    } else if ($(`.${selectedMessageType} .screen-3`).css('display') === 'block') {
      const description = $(`.${selectedMessageType} .${selectedCreationType} .description`).val();
      const isExpressDelivery = $(`.${selectedMessageType} .${selectedCreationType} .express-delivery-input`).is(':checked');
      const mailingClass = $(`.${selectedMessageType} .${selectedCreationType} .mailing-class`).val();

      if (isTrifoldEnabled && selectedCardInsertType === 'singleSide') {
        const  singleSideTemplateId = $(`.${selectedMessageType} .${selectedCreationType} .singleSideTemplate`) ?.attr('data-id');
        const singleSideTemplateName = $(`.${selectedMessageType} .${selectedCreationType} .singleSideTemplate`).val();
        previewPayload.singleSideTemplateId = singleSideTemplateId;
        previewPayload.singleSideTemplateName = singleSideTemplateName;
      } else {
        if(selectedMessageType !== 'Letters') {
          const backTemplateId = $(`.${selectedMessageType} .${selectedCreationType} .backTemplate`)?.attr('data-id');
          const backTemplateName = $(`.${selectedMessageType} .${selectedCreationType} .backTemplate`).val();
          previewPayload.backTemplateId = backTemplateId;
          previewPayload.backTemplateName = backTemplateName;
        }
        const frontTemplateId = $(`.${selectedMessageType} .${selectedCreationType} .frontTemplate`) ?.attr('data-id');
        const frontTemplateName = $(`.${selectedMessageType} .${selectedCreationType} .frontTemplate`).val();
        previewPayload.frontTemplateId = frontTemplateId;
        previewPayload.frontTemplateName = frontTemplateName;
      }

      if(isTrifoldEnabled) {
        const frontHtmlContent = $(`.${selectedMessageType} .screen-3 .html-editor-front`).val();
        const backHtmlContent = $(`.${selectedMessageType} .screen-3 .html-editor-back`).val();
        const templateCardSize = $(`.${selectedMessageType} .Template-card-size .radio-input:checked`).val();
        previewPayload.frontHtmlContent = frontHtmlContent;
        previewPayload.backHtmlContent = backHtmlContent;
        previewPayload.cardSize = templateCardSize;
      }

      if(selectedMessageType !== 'Letters') {
        const size = $(`.${selectedMessageType} .existingTemplate-size .radio-input:checked`).val();
        previewPayload.size = size;
      }

      previewPayload.screen = 'existing-template';
      previewPayload.description = description;
      previewPayload.mailingClass = mailingClass;
      previewPayload.isExpressDelivery = isExpressDelivery;
    }
  }

  async function createMessage() {
    let messageType = $('input[name=\'msgType\']:checked').val();
    const baseUrl = POSTGRID_API_BASE_URL;
    let isCartInsertEnabled = $('#card-insert').prop('checked');
    let selectedMessageType = $('input[name="msgType"]:checked').val().replace(/\s+/g, '');
    if(isCartInsertEnabled && selectedMessageType === 'selfmailer') {
      selectedMessageType = 'trifold';
    } else if(isCartInsertEnabled && selectedMessageType === 'Letters' ) {
      selectedMessageType = 'LettersCardInsert';
    }
    let isTrifoldEnabled = selectedMessageType === 'trifold';
    const selectedCardInsertType = $('input[name="cardType"]:checked').val();
    const url = selectedMessageType === 'selfmailer' || selectedMessageType === 'trifold' ? baseUrl + 'self_mailers' : baseUrl + selectedMessageType.toLowerCase();
    
    let apiKey = previewPayload.liveApiKeyEnabled ? previewPayload.live_api_key : previewPayload.test_api_key;

    let data;
    let headers = {
      'x-api-key': apiKey
    };

    if(previewPayload.screen === 'pdf'){
      data = new FormData();
      data.append('to', toContact);
      data.append('from', fromContact.id || '');
      data.append('description', previewPayload.description);

      if(selectedMessageType !== 'Letters') {
        data.append('size',previewPayload.size);
      }
      
      if(isTrifoldEnabled|| !previewPayload.isExpressDelivery) {
        data.append('mailingClass', previewPayload.mailingClass);
      }

      if(isTrifoldEnabled) {
        data.append('adhesiveInsert[size]',previewPayload.cardSize);
        let pdfLinkKey = selectedCardInsertType === 'doubleSide' ? 'adhesiveInsert[singleSided][pdf]' : 'adhesiveInsert[doubleSided][pdf]';
        data.append(pdfLinkKey,previewPayload.pdfLinkInput);
        data.append('insideHTML', previewPayload.frontHtmlContent);
        data.append('outsideHTML', previewPayload.backHtmlContent);
      } else {
        data.append('express', previewPayload.isExpressDelivery);
        data.append('pdf', previewPayload.pdf);
        setLetterPreviewPayload(data, previewPayload);
      } 
    } else if (previewPayload.screen === 'html') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      data = new URLSearchParams({
        'to': toContact,
        'from': fromContact.id || '',
        'express': previewPayload.isExpressDelivery,
        'description': previewPayload.description,
        'mergeVariables[language]': 'english',
        'metadata[company]': 'PostGrid'
      });

      if(messageType === 'Postcards'){
        data.append('frontHTML', previewPayload.frontHtmlContent);
        data.append('backHTML', previewPayload.backHtmlContent);
        data.append('size', previewPayload.size);
      } else if(messageType === 'selfmailer'){
        data.append('insideHTML', previewPayload.frontHtmlContent);
        data.append('outsideHTML', previewPayload.backHtmlContent);
        data.append('size', previewPayload.size);
      } else if(selectedMessageType === 'trifold'){
        data.append('insideHTML', previewPayload.frontHtmlContent);
        data.append('outsideHTML', previewPayload.backHtmlContent);
        data.append('size', previewPayload.size);
        data.delete('express');
        if(selectedCardInsertType === 'doubleSide'){
          data.append('adhesiveInsert[size]', previewPayload.cardSize);
          data.append('adhesiveInsert[doubleSided][outsideHTML]', previewPayload.cardbackHtmlContent);
          data.append('adhesiveInsert[doubleSided][insideHTML]',  previewPayload.cardfrontHtmlContent);
        }else{
          data.append('adhesiveInsert[size]', previewPayload.cardSize);
          data.append('adhesiveInsert[singleSided][html]', previewPayload.cardfrontHtmlContent);
        }
      } else if(selectedMessageType === 'Letters'){
        data.append('html', previewPayload.frontHtmlContent);
        setLetterPreviewPayload(data, previewPayload);
      }
      if (!previewPayload.isExpressDelivery) {
        data.append('mailingClass', previewPayload.mailingClass);
      }
    } else if(previewPayload.screen === 'existing-template') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      data = new URLSearchParams({
        'to': toContact,
        'from': fromContact.id || '',
        'description': previewPayload.description,
        'express': previewPayload.isExpressDelivery,
      });
      if(messageType === 'Postcards'){
        data.append('frontTemplate', previewPayload.frontTemplateId);
        data.append('backTemplate', previewPayload.backTemplateId);
        data.append('size', previewPayload.size);
      } else if(messageType === 'selfmailer'){
        data.append('size', previewPayload.size);
        if(isTrifoldEnabled) {
          if(selectedCardInsertType === 'singleSide') {
            data.append('adhesiveInsert[singleSided][template]', previewPayload.singleSideTemplateId);
          } else if(selectedCardInsertType === 'doubleSide') {
            data.append('adhesiveInsert[doubleSided][insideTemplate]', previewPayload.frontTemplateId);
            data.append('adhesiveInsert[doubleSided][outsideTemplate]', previewPayload.backTemplateId);
          }
          data.append('adhesiveInsert[size]', previewPayload.cardSize);
          data.append('insideHTML', previewPayload.frontHtmlContent);
          data.append('outsideHTML', previewPayload.backHtmlContent);
          data.delete('express');
        }else {
          data.append('insideTemplate', previewPayload.frontTemplateId);
          data.append('outsideTemplate', previewPayload.backTemplateId);
        }
      } else if(selectedMessageType === 'Letters'){
        data.append('template', previewPayload.frontTemplateId);
        setLetterPreviewPayload(data, previewPayload);
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
        throw new Error(`HTTP error! Status: ${response.status}, Type: ${errorResponse.error.type} Message: ${errorResponse.error.message}`);
      } else {
        $('.error-toast-wrap').removeClass('show');
        $('.error-toast-message').text('');
      }

      const result = await response.json();

      previewPayload.pdfLink = previewPayload.pdf;

      if(previewPayload.liveApiKeyEnabled) {
        let msgType = selectedMessageType === 'selfmailer' ? 'self_mailers' : selectedMessageType.toLowerCase();
        deleteMailItem(msgType, result.id);
      }
      return result;
    } catch (error) {
      $('.error-toast-message').text(`Error: ${JSON.stringify(error.message)}`);
      $('.error-toast-wrap').addClass('show');
      handleValidationFailure();
    }
  }

  function setLetterPreviewPayload(data, previewPayload) {
    if(previewPayload.extraService !== '' && previewPayload.extraService !== undefined && !previewPayload.isExpressDelivery) {
      data.append('extraService', previewPayload.extraService);
    }
    if(previewPayload.envelopeType !== '' && previewPayload.envelopeType !== undefined) {
      data.append('envelopeType', previewPayload.envelopeType);
    }
    if(previewPayload.returnEnvelope !== '' && previewPayload.returnEnvelope !== undefined) {
      data.append('returnEnvelope', previewPayload.returnEnvelope);
    }
    if (previewPayload.perforateFirstPageInput) {
      data.append('perforatedPage', 1);
    }
    data.append('color', previewPayload.colorInput);
    data.append('doubleSided', previewPayload.doubleSidedInput);
    if(previewPayload.insertBlankPageInput === true) {
      data.append('addressPlacement', 'insert_blank_page');
    } else {
      data.append('addressPlacement', 'top_first_page');
    }
  }

  async function fetchMessageDetails(messageId) {
    let selectedMessageType = $('input[name="msgType"]:checked').val().replace(/\s+/g, '');
    const urlMessageType = selectedMessageType === 'selfmailer' ? 'self_mailers' : selectedMessageType.toLowerCase();
    const apiUrl = `${POSTGRID_API_BASE_URL}${urlMessageType}/${messageId}`;
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
      const messageResponse =  await createMessage();
      const messageId = messageResponse.id;
      previewPayload.messageId = messageId;

      setTimeout(async function() {
        connection.trigger('nextStep');
        await showPdfPreview(messageId);
      }, 2000);

    } catch {
      handleValidationFailure();
      $('.preview-container .retry-preview-btn').addClass('show');
      $('#pdf-preview-container').css('display','none');
      $('.pdf-preview-error-msg').text('Failed to fetch preview.');
    }
  }

  function createContact () {
    const url = `${POSTGRID_API_BASE_URL}contacts`;

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
    previewPayload.contactEnvironment = previewPayload.liveApiKeyEnabled ? 'Live' : 'Test';
    $.ajax({
      url: `${POSTGRID_API_BASE_URL}contacts`,
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
    const url = `${POSTGRID_API_BASE_URL}${messageType}/${mailItemId}`;
  
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

    if(selectedMessageType === 'selfmailer' && !validateInputField(fromContactElement)) {
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
      $('.error-message-contact-mapping').text('Please fill all required fields.').css('color', 'red').show();
      isValid = false;
    }
    return isValid;
  }

  function resetToContactMappingErrors() {
    $('.mapping-fields-group select').css('border', '');
    $('.error-message-contact-mapping').text('').hide();
  }

  async function fetchTemplates(searchQuery = '') {
    const requestOptions = {
      method: 'GET',
      headers: { 'x-api-key': previewPayload.liveApiKeyEnabled ? previewPayload.live_api_key : previewPayload.test_api_key },
      redirect: 'follow'
    };

    previewPayload.templateEnvironment = previewPayload.liveApiKeyEnabled ? 'Live' : 'Test';

    try {
      const response = await fetch(`${POSTGRID_API_BASE_URL}templates?limit=10&search=${encodeURIComponent(searchQuery)}`, requestOptions);
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
      let selectedMessageType = $('input[name="msgType"]:checked').val().replace(/\s+/g, '');
      if(isCartInsertEnabled && selectedMessageType === 'selfmailer') {
        selectedMessageType = 'trifold';
      } else if(isCartInsertEnabled && selectedMessageType === 'Letters' ) {
        selectedMessageType = 'LettersCardInsert';
      }
      if (selectedCardInsertType === 'singleSide' && !selectedMessageType.toLowerCase().includes('letter')) {
        populateDropdown('singleSideTemplate', sortedData);
      } else {
        populateDropdown('frontTemplate', sortedData);
        populateDropdown('backTemplate', sortedData);
      }
    } catch (error) {
      throw error;
    }
  }

  async function fetchReturnEnvelope(searchQuery = '') {
    const requestOptions = {
      method: 'GET',
      headers: { 'x-api-key': previewPayload.liveApiKeyEnabled ? previewPayload.live_api_key : previewPayload.test_api_key },
      redirect: 'follow'
    };

    previewPayload.envelopeEnvironment = previewPayload.liveApiKeyEnabled ? 'Live' : 'Test';

    try {
      const response = await fetch(`${POSTGRID_API_BASE_URL}return_envelopes?limit=10&search=${encodeURIComponent(searchQuery)}`, requestOptions);
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
      populateDropdown('returnEnvelope', sortedData);
    } catch (error) {
      throw error;
    }
  }

  function populateDropdown(templateName, templates) {
    let isCartInsertEnabled = $('#card-insert').prop('checked');
    let selectedMessageType = $('input[name="msgType"]:checked').val().replace(/\s+/g, '');
    if(isCartInsertEnabled && selectedMessageType === 'selfmailer') {
      selectedMessageType = 'trifold';
    } else if(isCartInsertEnabled && selectedMessageType === 'Letters' ) {
      selectedMessageType = 'LettersCardInsert';
    }
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
          $templateInput.val(template.description || 'No description');
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
  
    const url = `${POSTGRID_API_BASE_URL}contacts?limit=1`;
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

  function fetchClientCredentials(){
    fetch('/client-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authTSSD: authTSSD,
        token: authToken,
        externalKey : previewPayload.credentialExternalKey
      })
    })
      .then(response => response.text())
      .then(xmlString => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
        const properties = xmlDoc.getElementsByTagName('Property');
    
        for (let i = 0; i < properties.length; i++) {
          const name = properties[i].getElementsByTagName('Name')[0].textContent;
          const value = properties[i].getElementsByTagName('Value')[0].textContent;
  
          if (name === 'Client_Id') {
            previewPayload.clientId = value;
          }
          else if (name === 'Client_Secret') {
            previewPayload.clientSecret = value;
          }
          else if (name === 'TestAPIKey') {
            if(!doesPayloadHasAPIKeys) {
              $('#test-api-key').val(value);
            }
          }
          else if (name === 'LiveAPIKey') {
            if(!doesPayloadHasAPIKeys) {
              $('#live-api-key').val(value);
            }
          }
          $('.loader-overlay').removeClass('show');
          $('.activity-loader').removeClass('show');
          $('body').css('overflow', '');
        }
      })
      .catch((error) => {
        throw error;
      });
  }

  async function fetchExternalKey(deName){
    fetch('/fetch-external-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authTSSD: authTSSD,
        token: authToken, 
        deName : deName
      })
    })
      .then(response => response.text())
      .then(xmlString => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
        const properties = xmlDoc.getElementsByTagName('CustomerKey');
        const externalKey = properties[0].textContent;
        if(deName === 'Postgrid_Logging_Data') {
          previewPayload.loggingExternalKey = externalKey;
        } else {
          previewPayload.credentialExternalKey = externalKey;
          fetchClientCredentials();
        }
      })
      .catch((error) => {
        throw error;
      });
  }

  $('.toggle-password').on('click', toggleApiKeyVisibility);
  $('input.api-key').on('input', hideError);

  $('.step2radioBTN').change(function () {
    var isSelfMailer = $('#self-mailer').is(':checked');
    if(isSelfMailer) {
      if($('#card-insert').is(':checked')) {
        $('#extTempId').css('display','none');
        $('label[for="extTempId"]').css('display','none');
        $('#extTempId').prop('checked', false);
      } else {
        $('#extTempId').css('display','block');
        $('label[for="extTempId"]').css('display','block');
      }
    } else {
      $('#extTempId').css('display','block');
      $('label[for="extTempId"]').css('display','block');
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
    var extraService = $(this).closest('.spacer').find('.extra-service');

    if (isChecked) {
      mailingClass.prop('disabled', true);
      extraService.prop('disabled', true).css('color','gray');
    } else {
      mailingClass.prop('disabled', false);
      let color = extraService.val() === 'Select Extra Service' ? 'gray' : 'black' ;
      extraService.prop('disabled', false).css('color',color);
    }
  });

  $('.extra-service-dropdown-wrap').click(function(){
    $(this).siblings('.extra-service-list').toggle();
  });

  $('.envelope-type-dropdown-wrap').click(function(){
    $(this).siblings('.envelope-type-list').toggle();
  });

  $('.dropdown-options .dropdown-item').click(function () {
    const selectedText = $(this).text();
    const selectedValue = $(this).attr('data-id');

    const $dropdown = $(this).closest('.mapping-dropdown');
    const $spacer = $(this).closest('.spacer');
  
    const $input = $dropdown.find('.input-field');
    const inputType = $input.hasClass('extra-service') ? 'extra-service' : 'envelope-type';
  
    $input.val(selectedText).attr('data-id', selectedValue);
  
    if (selectedValue === '') {
      $input.css('color', 'grey');
    } else {
      $input.css('color', 'black');
    }
  
    if (inputType === 'extra-service') {
      const $expressDelivery = $spacer.find('.express-delivery-input');
      if (selectedValue === '') {
        $expressDelivery.prop('disabled', false);
        $expressDelivery.siblings('span').css('color', 'black');
      } else {
        $expressDelivery.prop('disabled', true);
        $expressDelivery.siblings('span').css('color', 'gray');
      }
    }
  
    $dropdown.find('.dropdown-options').hide();
  });  

  $('#search-contact').on('input', debounce(function () {
    const searchQuery = $(this).val();
    if (searchQuery.length > 1) {
      fetchContacts(searchQuery);
    } else {
      $('#dropdown-options').empty().hide();
    }
    if ($(this).val().trim() === '') {
      $(this).blur();
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

  $('#front-template-input, #back-template-input, #selfMailer-insideTemplateInput, #selfMailer-outsideTemplateInput, #letter-template-input').on('focus', function () {
    $(this).closest('.template-dropdown-wrap').next('.dropdown-options').show();
  });

  $('#front-template-input, #back-template-input, #selfMailer-insideTemplateInput, #selfMailer-outsideTemplateInput, #letter-template-input').on('input', debounce(function () {
    fetchTemplates($(this).val().trim());
  }, 300));

  $(document).on('focus', '.template-input', function () {
    $(this).closest('.template-dropdown-wrap').next('.dropdown-options').show();
  });

  $(document).on('input', '.template-input', debounce(function () {
    fetchTemplates($(this).val().trim());
  }, 300));

  $(document).on('focus', '.return-envelope-input', function () {
    $(this).closest('.return-envelope-dropdown-wrap').next('.dropdown-options').show();
  });

  $(document).on('input', '.return-envelope-input', debounce(function () {
    if ($(this).val().trim() === '') {
      $(this).attr('data-id', '');
    }
    fetchReturnEnvelope($(this).val().trim());
  }, 300));

  $('.remove-error-toast').on('click',()=>{
    $('.error-toast-wrap').removeClass('show');
  });

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
      let isCartInsertEnabled = $('#card-insert').prop('checked');
      let selectedMessageType = $('input[name="msgType"]:checked').val().replace(/\s+/g, '');
      if(isCartInsertEnabled && selectedMessageType === 'selfmailer') {
        selectedMessageType = 'trifold';
      } else if(isCartInsertEnabled && selectedMessageType === 'Letters' ) {
        selectedMessageType = 'LettersCardInsert';
      }
      let selectedCreationType = $('input[name=\'createType\']:checked').val().replace(/\s+/g, '');
      const isClickInsideDropdown = $(event.target).is('#dropdown-options, #search-contact');
      const isClickInsideFront = $(event.target).closest('#frontTemplateList, #front-template-input, #letter-template-input, .template-input').length > 0;
      const isClickInsideBack = $(event.target).closest('#backTemplateList, #back-template-input').length > 0;
      const isClickInsideReturnEnvelope = $(event.target).closest('.returnEnvelopeList, .return-envelope-input.returnEnvelope').length > 0;
      const isClickInsideFrontSelfMailer = $(event.target).closest('#selfMailer-insideTemplateList, #selfMailer-insideTemplateInput').length > 0;
      const isClickInsideBackSelfMailer = $(event.target).closest('#selfMailer-outsideTemplateList, #selfMailer-outsideTemplateInput').length > 0;
      if (!isClickInsideDropdown) {
        $('#dropdown-options').hide();
      }
      if (!isClickInsideFront) {
        $(`.${selectedMessageType} .${selectedCreationType} #frontTemplateList`).hide();
      }
      if (!isClickInsideBack) {
        $(`.${selectedMessageType} .${selectedCreationType} #backTemplateList`).hide();
      }
      if (!isClickInsideReturnEnvelope) {
        $(`.${selectedMessageType} .${selectedCreationType} #returnEnvelopeList`).hide();
      }
      if(!isClickInsideFrontSelfMailer){
        $('#selfMailer-insideTemplateList').hide();
      }
      if(!isClickInsideBackSelfMailer){
        $('#selfMailer-outsideTemplateList').hide();
      }

      if (!$(event.target).closest('.extra-service-dropdown-wrap').length) {
        if($(`.${selectedMessageType} .${selectedCreationType} .extra-service-list`).css('display') === 'block') {
          $(`.${selectedMessageType} .${selectedCreationType} .extra-service-list`).css('display','none');
        }
      }
      if (!$(event.target).closest('.envelope-type-dropdown-wrap').length) {
        if($(`.${selectedMessageType} .${selectedCreationType} .envelope-type-list`).css('display') === 'block') {
          $(`.${selectedMessageType} .${selectedCreationType} .envelope-type-list`).css('display','none');
        }
      }
    });
  });
});