module.exports = function RomCtrl(
  $scope,
  $http,
  $filter
) {
  $scope.rom = {
    romlist: []
  }

  // 是否显示日志
  $scope.show_win = true

  $scope.logs = []

  var model = $scope.device ? $scope.device.model : ''

  $scope.refreshRom = function refreshRom(rom) {

      var command = "am instrument -w -r -e debug false -e class com.qihoo.caes.FlashPhone#testOTAUpgrade"
        + " -e Loop 1 -e nickname " + " '" + model + "' " + " -e url " + rom.ftpDownload + " com.qihoo.test/android.support.test.runner.AndroidJUnitRunner&"

      // 初始化刷机消息
      var time = $filter('date')(new Date(),'yyyy-MM-dd HH:mm:ss')
      $scope.logs.push({'msg':command,'time':time})
      $scope.show_win = true

      console.log(command)
      var oneHour = 3600*1000  // timeout for rom refresh is one hour
      $scope.control.shell(command, oneHour)
      .progressed(function(result) {
        console.log(result)

        //@hy TODO 数据格式和上面定义的$scope.logs 一致
        var log = result['lastData']
        var time = $filter('date')(new Date(),'yyyy-MM-dd HH:mm:ss')
        if (log){
          $scope.logs.push({'msg':log, 'time':time})
        }
      })
       .then(function(result) {
         console.log(result)
        var log = result['lastData']
        var time = $filter('date')(new Date(),'yyyy-MM-dd HH:mm:ss')
        if (log){
          $scope.logs.push({'msg':log,'time':time})
        }
      })
  }

  // 隐藏刷机窗口
  $scope.hideLogWin = function () {
    $scope.show_win = false
  }

  // Get rom list for specific model
  var getRomList = function(params) {
    $http.get('/api/v1/rom/?model=' + escape(params.model))
      .then(function (response) {
        console.log(response)
        $scope.rom.romlist = response['data']['romlist'] || []
      })
  }

  getRomList({model:model})

}
