module.exports = function TcpdumpCtrl(
  $scope,
  DeviceService,
  ControlService,
  $http,
  $filter
) {
  function makeID() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890123456789";
     
    for (var i = 0; i < 8; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
     
    return text;
  }
   
  var serial = $scope.device.serial
  var mockData = [{ id: 'testID', 
                   user: 'Huang Ye', 
                   model: 'Pro 7',
                   startTime: '2019-01-23 20:01:02:230',
                   endTime: '2019-01-23 20:02:25:832',
                   status: 'finished',
                   url: 'http://www.google.com' 
                 }]
  $scope.records = mockData
  $scope.testID = ''

  $scope.startTcpdump = function(){
    console.log('+++ ++++ DEBUG startTcdpump')
    $scope.testID = makeID()
    return $scope.control.startTcpdump(serial, $scope.testID)
           .then(function(result) {
              var data = result.body
              console.log('++++ DEBUG startTcdpump after then', result)
              if(data.status === 'success') {
                var record = {}
                record.testID = data.testID
                record.action = data.action
                record.user = data.ownerEmail
                record.serial = data.serial
                record.startTime = new Date()
                record.status = data.status
                record.comments = data.error
                $scope.records.push(record)
                $scope.$digest()
              } 
              else {
                alert("Error: " + data.error)
              }
          })
  }

  $scope.stopTcpdump = function(){
    console.log('+++ DEBUG stopTcdpump', $scope.testID)
    if (typeof $scope.testID === 'undefined' ||  $scope.testID.length === 0) {
      return 
    }

    var data = {}
    return $scope.control.stopTcpdump(serial, $scope.testID)
           .then(function(result) {
             data  = result.body
             $scope.testID = ''
          })
          .catch(function(result) {
             data  = result.body
          })
          .finally(function() {
            console.log('++++ DEBUG stopTcpdump after then', data)
            $scope.records.forEach((record, i) => {
                if(record.testID === data.testID) {
                  $scope.records[i].url = data.url
                  $scope.records[i].action = data.action
                  $scope.records[i].finishTime = new Date()
                  $scope.records[i].status = data.status
                  $scope.records[i].comments = data.error
                  $scope.$digest()
                } 
            });
          })
  }
};