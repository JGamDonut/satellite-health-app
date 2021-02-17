// Satellite Health App
//--------------------------------------------------------------------
function SatelliteHealthApp(options) {

  var self = Object.create(this);

  // private variables
  // configuration defaults
  var _config = {
    inputElement: null,
    dataPreviewElement: null,
    outputElement: null,
    statusElement: null,
    colorsClass: {
      normal: '',
      good: '',
      warning: '',
      danger: '',
    }
  };

  var _satelliteProperties = [
    'timestamp',
    'satellite-id',
    'red-high-limit',
    'yellow-high-limit',
    'yellow-low-limit',
    'red-low-limit',
    'raw-value',
    'component'
  ];

  var _overrideConfig = options || _config;
  var _inputData = [];
  var _satellites = [];
  var _satellitesBelowRedLowLimit = [];
  var _satellitesAboveRedHighLimit = [];




  // private functions | helper functions
  //========================================================================================

  // extend configuration by combining default setting with custom settings
  var _extendConfig = function () {
    for (var key in _overrideConfig) {
      if (_overrideConfig.hasOwnProperty(key)) {
        _config[key] = _overrideConfig[key];
      }
    }
  };

  // extend configuration by combining default setting with custom settings
  var _setInputData = function (data) {
    _inputData = data;   
  };

  // format raw data to separate objects
  var _formatData = function (str) {
    var formattedData = [];
    // break data at carriage return and insert into an array
    var arr = str.replace(/\r/g, "").split(/\n/);
    // format arr into array of objects
    for (var x = 0; x < arr.length; x++) {
      var values = arr[x].split('|');
      var obj = {};    
      for (var i = 0; i < values.length; i++) {
        // check if values exist
        if (_satelliteProperties[i] && values[i]) {
          obj[_satelliteProperties[i]] = values[i];
        }
      }
      formattedData.push(obj);
    }
    return formattedData;
  };




  // private functions | for collecting input data
  //========================================================================================

  // handler for input on change
  var  _onInputChange = async function (event) {
    var files = Array.from(event.target.files);
    if (files.length > 0 && _validateFile(files[0])) {
      var response = await _loadData(files[0]);
      _onDataReady(response);
      _setStatus('success', files[0]);
    } else {
      _setStatus('failed', files[0]);
    }
  };
  
  var _validateFile = function (file) {
    return (file.type === 'text/plain');
  };
  
  var _loadData = function (file) {
    return new Promise(resolve => {
      let reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      return reader.readAsText(file);
    });
  };
  
  var _setStatus = function (success, file) {
    if (success === 'success') {
      _config.statusElement.textContent = `${file.name}, ${file.size}KB.`;
    } else {
      _config.statusElement.textContent = `${file.name}: Not a valid file type. Update your selection.`;
    }
  };
  
  var _onDataReady = function (data) {
    var formattedData = _formatData( data );
    _setInputData(formattedData);
    _displaySatelliteIncomingData(data);
    _sortSatellites(formattedData);
    _processHealthData();
    _displaySatelliteAlertData();
  };
  
  var _displaySatelliteIncomingData = function (data) {
    _config.dataPreviewElement.textContent = data;
  };
  
  var _removeDuplicates = function (ids) {
    return ids.filter((id, index) => ids.indexOf(id) === index );
  };
  
  // set all satellites in data
  var _sortSatellites = function (data) {
    var idKey = 'satellite-id';
    var groups = _removeDuplicates(data.map((d) => d[idKey]));
    for (var x = 0; x < groups.length; x++) {
      _satellites.push( data.filter( (item) => item[idKey] === groups[x]) );
    }
  };
  
  var _processHealthData = function () {
    // check if satellites exist, if so proceed
    if (_satellites.length > 0) {
      _getBelowRedLowLimit();
      _getAboveRedHighLimit();
    }
  };
  
  var _displaySatelliteAlertData = function () {
    var satellites = [];
    if (_satellitesAboveRedHighLimit.length > 0) {
      satellites.push(_formattedDisplayObject(_satellitesAboveRedHighLimit[0], 'RED HIGH'));
    }
    if (_satellitesBelowRedLowLimit.length > 0) {
      satellites.push(_formattedDisplayObject(_satellitesBelowRedLowLimit[0], 'RED LOW'));
    }
    _config.outputElement.innerHTML = JSON.stringify(satellites, null, 4);
  };
  
  // format output data for display
  var _formattedDisplayObject = function (sat, severity) {
    return {
      'satelliteId': `${sat['satellite-id']}`,
      'severity': severity,
      'component': `${sat['component']}`,
      'timestamp': `${sat['timestamp']}`,
    };
  };
  
  // If satellite has three battery voltage readings < the red low limit within a five minute interval
  var _getBelowRedLowLimit = function () {
    _satellitesBelowRedLowLimit = _isTestLimit({
      component: 'BATT',
      limit: 'red-low-limit',
      level: 'low'
    })
  };
  
  // If satellite has thermostat readings > the red high limit within a five minute interval
  var _getAboveRedHighLimit = function () {
    _satellitesAboveRedHighLimit = _isTestLimit({
      component: 'TSTAT',
      limit: 'red-high-limit',
      level: 'high'
    })
  };
  
  // test satellite properties against properties
  var _isTestLimit = function (obj) {
    var servereComponent = [];
    for (var x = 0; x < _satellites.length; x++) {
      var components = _satellites[x].filter( (prop) => prop['component'] === obj.component );
      if (components.length > 2) {
        if (obj.level === 'high') {
          servereComponent = components.filter( (comp) => parseInt(comp['raw-value']) > parseInt(comp[obj.limit]) );
        }
        if (obj.level === 'low') {
          servereComponent = components.filter( (comp) => parseInt(comp['raw-value']) < parseInt(comp[obj.limit]) );
        }
        if (servereComponent.length > 0) {
          return servereComponent;
        }
      }
    }
  };




  // private functions | for Data
  //========================================================================================

  // listeners
  var _addListeners = function (src) {
    _config.inputElement.addEventListener('change', _onInputChange, false);
  };




  // private functions | setting the stage
  //========================================================================================

  // sets up the module
  var _setStage = function () {
    _addListeners();
  }




  // public functions
  //========================================================================================

  // accept configurations for module
  self.init = function () {
    _extendConfig();
    _setStage();
  };

  return self;
};









// Listener event ot wait until browser is fully load and ready
// similar to jquery: $(document.ready()) 
document.addEventListener('DOMContentLoaded', function() {
  // init the entire app
  const init = () => {
    // instantiate new SatelliteHealthApp Object
    // and set module configuration
    const satelliteHealthApp = new SatelliteHealthApp({
      inputElement: document.querySelector('#js-input-upload'),
      dataPreviewElement: document.querySelector('#js-data-preview'),
      outputElement: document.querySelector('#js-output'),
      statusElement: document.querySelector('#js-file-info'),
      colorsClass: {
        normal: 'colors-base',
        good: 'colors-good',
        warning: 'colors-warning',
        danger: 'colors-danger',
      }
    });
    // start the app
    satelliteHealthApp.init();
  };
  
  init();
});