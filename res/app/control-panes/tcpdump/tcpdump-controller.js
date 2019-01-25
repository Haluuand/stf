module.exports = function TcpdumpCtrl(
  $scope,
  DeviceService,
  ControlService,
  $http,
  $filter
) {
  var serial = $scope.device.serial
  var mockData = [{ id: 'ASDFASDC23', 
                   user: 'Huang Ye', 
                   model: 'Pro 7',
                   startTime: '2019-01-23 20:01:02:230',
                   endTime: '2019-01-23 20:02:25:832',
                   status: 'finished',
                   url: 'http://www.google.com' 
                 }]
  $scope.records = mockData

  $scope.startTcpdump = function(){
    console.log('+++ startTcdpump')
    $scope.control.stopTcpdump();
    return $scope.control.startTcpdump(serial)
  }

  $scope.stopTcpdump = function(){
    console.log('+++ stopTcdpump')
    return $scope.control.stopTcpdump(serial)
  }

  /*
    return $scope.control.shell(command)
      .progressed(function(result) {
        $scope.result = result
        $scope.data = result.data.join('')
        $scope.$digest()
      })
      .then(function(result) {
        $scope.result = result
        $scope.data = result.data.join('')
        $scope.$digest()
      })
  */
};