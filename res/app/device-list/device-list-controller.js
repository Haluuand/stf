var QueryParser = require('./util/query-parser')

module.exports = function DeviceListCtrl(
  $scope
, DeviceService
, DeviceColumnService
, GroupService
, ControlService
, SettingsService
, $location
) {
  $scope.tracker = DeviceService.trackAll($scope)
  $scope.control = ControlService.create($scope.tracker.devices, '*ALL')

  $scope.columnDefinitions = DeviceColumnService

  var defaultColumns = [
    {
      name: 'state'
    , selected: true
    }
  , {
      name: 'model'
    , selected: false  // @hy, 2017-05-09: true ==> false
    }
  , {
      name: 'name'
    , selected: true
    }

  // @HY 2017-06-23 add nickname and rom status into device list
  , {
      name: 'nickname'
    , selected: false
    }
  , {
      name: 'romStatus'
    , selected: true
    }

  , {
      name: 'serial'
    , selected: true   // @hy, 2017-05-09: false ==> true
    }
  , {
      name: 'operator'
    , selected: false  // @hy, 2017-05-09: true ==> false
    }
  , {
      name: 'releasedAt'
    , selected: false  // @hy, 2017-05-09: true ==> false
    }
  , {
      name: 'version'
    , selected: true
    }
  , {
      name: 'network'
    , selected: false
    }
  , {
      name: 'display'
    , selected: true  // @hy, 2017-05-09: false ==> true
    }
  , {
      name: 'manufacturer'
    , selected: true  // @hy, 2017-05-09: false ==> true
    }
  , {
      name: 'sdk'
    , selected: true  // @hy, 2017-05-09: false ==> true
    }
  , {
      name: 'abi'
    , selected: false
    }
    , {               // @hy, 2017-12-10: added to fulfill requirement from GG
      name: 'cpuPlatform'
    , selected: false
    }
  , {
      name: 'browser'
    , selected: false
    }
  , {
      name: 'phone'
    , selected: false
    }
  , {
      name: 'imei'
    , selected: false
    }
  , {
      name: 'imsi'
    , selected: false
    }
  , {
      name: 'iccid'
    , selected: false
    }
  , {
      name: 'batteryHealth'
    , selected: false
    }
  , {
      name: 'batterySource'
    , selected: false
    }
  , {
      name: 'batteryStatus'
    , selected: false
    }
  , {
      name: 'batteryLevel'
    , selected: false
    }
  , {
      name: 'batteryTemp'
    , selected: false
    }
  , {
      name: 'provider'
    , selected: false
    }
    ,{
      name: 'presenceChangedAt'
      ,selected: true
    }
    ,{
      name: 'inventoryID'
      ,selected: false
    }
  , {
      name: 'notes'
    , selected: true
    }
  , {
      name: 'owner'
    , selected: true
    }
    /*, {
      name: 'listOfflineDevices'
      , selected: false
    }*/
  ]

  $scope.columns = defaultColumns

  SettingsService.bind($scope, {
    target: 'columns'
  , source: 'deviceListColumns'
  })

  var defaultSort = {
    fixed: [
      {
        name: 'state'
        , order: 'asc'
      }
    ]
    , user: [
      {
        name: 'name'
        , order: 'asc'
      }
    ]
  }

  $scope.sort = defaultSort

  SettingsService.bind($scope, {
    target: 'sort'
  , source: 'deviceListSort'
  })

  $scope.filter = []

  $scope.activeTabs = {
    icons: false   // @hy, 2017-05-09: adjust default view to details view, there is no useful info in icon view
  , details: true
  }

  SettingsService.bind($scope, {
    target: 'activeTabs'
  , source: 'deviceListActiveTabs'
  })

  $scope.toggle = function(device) {
    if (device.using) {
      $scope.kick(device)
    } else {
      $location.path('/control/' + device.serial)
    }
  }

  $scope.invite = function(device) {
    return GroupService.invite(device).then(function() {
      $scope.$digest()
    })
  }

  $scope.applyFilter = function(query) {
    $scope.filter = QueryParser.parse(query)
  }

  $scope.search = {
    deviceFilter: '',
    focusElement: false
  }

  $scope.focusSearch = function() {
    if (!$scope.basicMode) {
      $scope.search.focusElement = true
    }
  }

  $scope.reset = function() {
    $scope.search.deviceFilter = ''
    $scope.filter = []
    $scope.sort = defaultSort
    $scope.columns = defaultColumns
  }
}
