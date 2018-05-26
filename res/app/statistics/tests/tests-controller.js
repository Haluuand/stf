require('d3');
module.exports = function UserStatCtrl(
  $scope,
  DeviceService,
  ControlService,
  socket,
  $http
) {
  $scope.tracker = DeviceService.trackAll($scope)
  $scope.control = ControlService.create($scope.tracker.devices, '*ALL')

  $scope.devices = [];

  // @chenhao 从前端存储中过去用户之前设置的参数
  var cached_params = sessionStorage.getItem('STAT_TEST_PARAMS');
  var start_time = (new Date(new Date().setHours(0,0,0,0))).getTime();
  var end_time = new Date().getTime();
  if (cached_params){
    var data = JSON.parse(cached_params);
    start_time = data['start_time'];
    end_time = data['end_time'];
  }

  $scope.start_time = new Date(start_time);
  $scope.end_time = new Date(end_time);
  $scope.format = "yyyy/MM/dd";
  $scope.altInputFormats = ['yyyy/M!/d!'];
  $scope.options = {
    showWeeks: false
  };

  $scope.getStatData = function(params){
    $scope.request_loading = true;
    //@chenhao 缓存每次请求的参数
    sessionStorage.setItem('STAT_TEST_PARAMS', JSON.stringify(params));
    $http({
      method:'post',
      url:'/api/v1/stat/test/',
      data: params
    }).success(function(response){
      var labels = response['labels']
      var dataset = response['dataset']
      $scope.request_loading = false;
      var panel = 'bar_chart_user';
      $scope.drawBarChart(labels,dataset,panel)
    })
  };

  var default_params = {
    'start_time': start_time,
    'end_time': end_time
  }
  // 获取默认的数据
  $scope.getStatData(default_params)

  // 根据条件查询统计图的信息
  $scope.submitQuery = function(){
    // 检查开始时间和结束时间的输入
    var start_time = $scope.start_time
    var end_time = $scope.end_time

    // 检查开始时间和结束时间
    if (start_time>end_time){
      alert('开始时间不能大于结束时间')
      return
    }

    var params = {
      'start_time': (new Date(start_time.setHours(0,0,0,0))).getTime(),
      'end_time': (new Date(end_time.setHours(23,59,59,59))).getTime()
    }

    // 获取统计图的数据
    $scope.getStatData(params)
  };

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

  // 初始化画布
  var width = 540
  var height = 540

  // 定义默认颜色
  var colors = d3.range(100).map(d3.scale.category20())

  $scope.drawBarChart = function(lables,dataset,panel){
    // 定义图表的间距
    var margin = {top: 30, right: 100, bottom: 30, left: 100}
    var w = 600 - margin.left - margin.right
    var h = Math.max(400,dataset.length*20) - margin.top - margin.bottom;

    // 定义x轴和y轴
    var y = d3.scale.ordinal()
      .rangeRoundBands([0,h],0.2,0);

    // console.log('label',lables)
    y.domain(lables.map(function(d) { return d; }));

    var x = d3.scale.linear()
      .range([0,w]);
    x.domain([0, d3.max(dataset, function(d) { return d; })]);

    var formatPercent = d3.format(".0");
    var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .tickFormat(formatPercent)

    var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")

    d3.select('#'+panel).select('svg').remove()
    var svg = d3.select("#"+panel).append("svg")
      .attr("width", w + margin.left + margin.right)
      .attr("height", h + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0, " + h + ")")
      .call(xAxis);

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis);

    svg.selectAll(".bar")
      .data(dataset)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("y", function(d,i) {
        return  y(lables[i])
      })
      .attr("height", y.rangeBand())
      .attr("x", function(d) { return 0; })
      .attr("width", function(d) { return x(d); })
      .attr("fill", function(d,i) { return colors[i]; })

    svg.selectAll(".text")
      .data(dataset)
      .enter()
      .append("text")
      .attr("class","text")
      .attr("x",function(d){
        return x(d)+5
      })
      .attr("y",function(d,i){
        return y(lables[i])+y.rangeBand()/2+5
      })
      .text(function(d){return d.toFixed(2)})

    svg.append('text').attr('x',w+10).attr('y',h+5).text('单位(小时)')
    svg.append('text').attr('x',-20).attr('y',-10).text('设备名')
  }
}
