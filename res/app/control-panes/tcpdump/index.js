require('./tcpdump.css')

module.exports = angular.module('stf.tcpdump.testing', [])
  .run(['$templateCache', function($templateCache) {
    $templateCache.put('control-panes/tcpdump/tcpdump.pug',
      require('./tcpdump.pug')
    )
  }])
  // reverse-find the basename beginning with last slash but one
  .filter('basename', function() {
    return function(path) {
      var slashCnt = 0
      var i = path.length - 1
      for (; i >= 0; i--) {
         if (path[i] === '/')
           slashCnt++
        if (slashCnt === 2)
          break
      }
      var base = new String(path).substring(i + 1);
      return base
    }
  })
  .filter('unescape', function () {
    return function(str) {
      return decodeURI(str)
    }
  })
  .filter('isNotEmpty', function () {
    return function (str) {
      return str.length !== 0
    }
  })
  .controller('TcpdumpCtrl', require('./tcpdump-controller'))
