var Promise = require('bluebird')
var syrup = require('stf-syrup')

var logger = require('../../../util/logger')
var wire = require('../../../wire')
var wireutil = require('../../../wire/util')

module.exports = syrup.serial()
  .dependency(require('../support/adb'))
  .dependency(require('../support/router'))
  .dependency(require('../support/push'))
  .dependency(require('../support/sub'))
  .dependency(require('../support/gtf-sub'))
  .dependency(require('../support/gtf-pub'))
  .define(function(options, adb, router, push, sub, gtfSub, gtfPub) {
    var log = logger.createLogger('device:plugins:tcpdump')
    var serial = options.serial

    gtfSub.on('message', function(msg, data) {
      log.info("Receive message", msg.toString(), data.toString())
    })

    router.on(wire.StartTcpdumpMessage, function(channel, message) {
      var reply = wireutil.reply(options.serial)

      log.info(`Send message to start tcpdump on device ${serial}`)
      gtfPub.send([serial, `{"serial": "${serial}", "action":"request_start_capture_packet"}`])

    })

    router.on(wire.StopTcpdumpMessage, function(channel, message) {
      var reply = wireutil.reply(options.serial)

      log.info(`Send message to stop tcpdump on device ${serial}`)
      gtfPub.send([serial, `{"serial": "${serial}", "action":"request_stop_capture_packet"}`])
    })

  })
