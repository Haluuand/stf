var oboe = require('oboe')

module.exports = function HistoryCtrl(
  $scope,
  $http
) {

  // 获取所有的测试类型
  $http.get('/api/v1/testing/types/')
    .then(function(response) {
      console.log(response)
      $scope.types = response['data']['types']
    })

  // 读取当前用户所有历史的测试记录
  var default_params = {
    'start_time': 0,
    'end_time': new Date().getTime(),
    'test_type':''
  }
  // 获取默认数据
  $scope.getHistoryList(default_params)

  $scope.start_time = new Date();
  $scope.end_time = new Date();
  $scope.format = "yyyy/MM/dd";
  $scope.altInputFormats = ['yyyy/M!/d!'];
  $scope.options = {
    showWeeks: false
  };

  // 根据条件查询统计图的信息
  $scope.submitQuery = function(){
    // 检查开始时间和结束时间的输入
    var stat_time = $scope.stat_time
    var end_time = $scope.end_time
    var test_type = $scope.test_type

    // 检查开始时间和结束时间
    if (stat_time>end_time){
      alert('开始时间不能大于结束时间')
      return
    }

    // 检查测试类型
    if (!test_type){
      alert('请选择测试类型')
      return
    }

    var params = {
      'start_time': stat_time.getTime(),
      'end_time': end_time.getTime(),
      'test_type': test_type
    }

    // 查询历史数据
    $scope.getHistoryList(params)
  };

  // 获取历史数据
  $scope.getHistoryList = function(params){
    // 发送请求，按照过滤条件查询
    $http({
      method:'post',
      url:'/api/v1/testings/Notrun',
      data: params
    }).success(function(response){
      var testings = response['testings']
      $scope.columns = testings
      $scope.sort='sort'
    })
  }

  $scope.popup1 = {
    opened: false
  };
  $scope.open1 = function () {
    $scope.popup1.opened = true;
  };

  $scope.popup2 = {
    opened: false
  };
  $scope.open2 = function () {
    $scope.popup2.opened = true;
  };
}
