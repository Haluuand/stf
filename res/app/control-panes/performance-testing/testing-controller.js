module.exports = function RomCtrl(
  $scope,
  $http,
  $filter
) {
// 实现思路
  var cpu_message = [];
  var memory_message = [];
  var record_timer;
  var input_timer;
  // 存储消息S产生消息
  $scope.startRecord = function(){
    $scope.stopRecord();
    record_timer = setInterval(function(){
      var time = new Date();
      var cpu_value = Math.floor(Math.random()*10);
      var memory_value = Math.floor(Math.random()*10);
      if (cpu_message.length >=20){
        cpu_message.shift()
      }
      if (memory_message.length >=20){
        memory_message.shift()
      }
      cpu_message.push({'time':time.setMilliseconds(0), 'value':cpu_value});
      memory_message.push({'time':time.setMilliseconds(0), 'value':memory_value});
    },1000);
    // 动态取数据，渲染对应的图
    input_timer = setInterval(function(){
      renderChart('cpu',cpu_message)
      renderChart('memory',memory_message)
    },1000);
  }
  // 停止产生消息
  $scope.stopRecord = function(){
    clearInterval(record_timer);
    clearInterval(input_timer);
  }
  // 渲染图表
  function renderChart(chart_id, dataset){
    console.log(chart_id,dataset);
    var svg = d3.select('#'+chart_id);
    var xScale = d3.time.scale()
      .domain([d3.min(dataset,function(d){return d.time}),d3.max(dataset,function(d){return d.time})])
      .range([0,w]);
    var yScale = d3.scale.linear()
      .domain([0,15])
      .range([h,0]);
    // 设置x，y轴的刻度信息
    var xAxis = d3.svg.axis()
      .scale(xScale)
      .orient('bottom')
      .ticks(d3.time.seconds,1)
      .tickSize(-h,0,0)
      .tickFormat(d3.time.format('%M:%S'));
    var yAxis = d3.svg.axis()
      .scale(yScale)
      .orient('left')
      .tickSize(-w,0,0);
    // 绘制x轴，y轴到页面
    if (dataset.length == 20){
      svg.select('.x').call(xAxis);
      svg.select('.y').call(yAxis);
    }
    // 按照时间绘制
    var line = d3.svg.line()
      .x(function(d){return xScale(d.time)})
      .y(function(d){return yScale(d.value)});
    var path = svg.select('.line_path')
      .attr("d", line(dataset));
    d3.select('#'+chart_id).select('.min_label_value').text(d3.min(dataset,function(d){return d.value}));
    d3.select('#'+chart_id).select('.max_label_value').text(d3.max(dataset,function(d){return d.value}));
    d3.select('#'+chart_id).select('.avg_label_value').text(d3.sum(dataset,function(d){return d.value})/dataset.length);
  }
  var w = 660;
  var h = 240;
  var margin = {
    'top': 60,
    'right': 100,
    'bottom':60,
    'left': 100
  };
  // 初始化图表
  function initChart(chart_id){
    var init_dataset = [];
    // 默认显示最近1分钟的情况
    var init_end = new Date().setMilliseconds(0);
    var init_start  = new Date(new Date(init_end).getTime() - 20*1000);
    // 初始化svg，x轴，y轴的信息
    var svg = d3.select('#'+chart_id)
      .append('svg')
      .attr('width',w+margin.left+margin.right)
      .attr('height',h+margin.top+margin.bottom);
    var xScale = d3.time.scale()
      .domain([init_start,init_end])
      .range([0,w]);
    var yScale = d3.scale.linear()
      .domain([0,15])
      .range([h,0]);
    // 设置x，y轴的刻度信息
    var xAxis = d3.svg.axis()
      .scale(xScale)
      .orient('bottom')
      .ticks(d3.time.seconds,1)
      .tickSize(-h,0,0)
      .tickFormat(d3.time.format('%M:%S'));
    var yAxis = d3.svg.axis()
      .scale(yScale)
      .orient('left')
      .tickSize(-w,0,0);
    svg.append('g')
      .attr('class','y axis')
      .attr('transform','translate('+margin.left+','+margin.top+')')
      .call(yAxis);
    // 绘制x轴，y轴到页面
    svg.append('g')
      .attr('class','x axis')
      .attr('transform','translate('+margin.left+','+(h+margin.top)+')')
      .call(xAxis);
    // 按照时间绘制
    var line = d3.svg.line()
      .x(function(d){return xScale(d.time)})
      .y(function(d){return yScale(d.value)});
    var path = svg.append('path')
      .datum(init_dataset)
      .attr('class','line_path')
      .attr("d", line)
      .attr('stroke','red')
      .attr('stroke-width',1)
      .attr('fill','none')
      .attr('transform','translate('+margin.left+','+margin.top+')');
    // 设置min，max，avg
    var min_label = svg.append('g')
      .attr('class','min_label').attr('transform','translate('+margin.left+','+margin.top/2+')');
    min_label.append('text').text('Min：').attr('fill','#fff').attr('x',margin.left);
    min_label.append('text')
      .attr('class','min_label_value')
      .attr('fill','red')
      .attr('x',margin.left+50)
      .text(d3.min(init_dataset,function(d){return d.value}));
    var max_label = svg.append('g')
      .attr('class','max_label').attr('transform','translate('+(margin.left+100)+','+margin.top/2+')');
    max_label.append('text').text('Max：').attr('fill','#fff').attr('x',margin.left+100);
    max_label.append('text')
      .attr('class','max_label_value')
      .attr('fill','green')
      .attr('x',margin.left+150)
      .text(d3.min(init_dataset,function(d){return d.value}));
    var avg_label = svg.append('g')
      .attr('class','avg_label').attr('transform','translate('+(margin.left+200)+','+margin.top/2+')');
    avg_label.append('text').text('Avg：').attr('fill','#fff').attr('x',margin.left+200);
    avg_label.append('text')
      .attr('class','avg_label_value')
      .attr('fill','green')
      .attr('x',margin.left+250)
      .text(d3.sum(init_dataset,function(d){return d.value})/init_dataset.length);
  }
  initChart('cpu');
  initChart('memory');
};
