var Promise = require('bluebird')
var syrup = require('stf-syrup')

var logger = require('../../../util/logger')
var wire = require('../../../wire')
var wireutil = require('../../../wire/util')

const GTF_MSG_REQ_START_TCPDUMP = 'request_start_capture_packet'
const GTF_MSG_REQ_STOP_TCPDUMP = 'request_stop_capture_packet'
const GTF_MSG_RESP_START_TCPDUMP = 'resp_start_capture_packet'
const GTF_MSG_RESP_STOP_TCPDUMP = 'resp_stop_capture_packet'
const DEFAULT_TIMEOUT = 900000 // default timeout: 15min
const DELAY_TO_RUN = 2000  // delay time for rate limiter
const SUCCESS = 'success'

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
    var timeout = DEFAULT_TIMEOUT
    var timerForceStop = null
    var timerStartTcpdump = null
    var timerStopTcpdump = null
    var reply = wireutil.reply(options.serial)

    function forceStop(id) {
      log.info('tcpdump timeout, force-stop the tcpdump command on device')
      gtfPub.send([serial, `{"serial": "${serial}", "action":"${GTF_MSG_REQ_STOP_TCPDUMP}"}`])
    }

    function handleResponse(testID, channel) {
        function messageListener(resolve, reject) {
          return function(msg, data) {
            var respData = {}
            try {
              respData = JSON.parse(data)
            }
            catch (err) {
              reject({status: 'fail', error: 'the response received from GTF agent is malformed'})
              log.error('Failed to parse data "%s" which was received from GTF agent: ', data, err.stack)
              return
            }

            switch(respData.action) {
              case GTF_MSG_RESP_START_TCPDUMP:
                  log.info('received msg: ', GTF_MSG_RESP_START_TCPDUMP, respData)
                  break
              case GTF_MSG_RESP_STOP_TCPDUMP:
                  log.info('received msg: ', GTF_MSG_RESP_STOP_TCPDUMP, respData)
                  break
            }

            if(respData.hasOwnProperty('testID') && respData.testID === testID) {
              if(respData.hasOwnProperty('status') && respData.status === SUCCESS) {
                resolve(respData)
              }
              else {
                reject(respData)
              }
            }
            return
          }
      } // messageListener

      var listener = null
      return new Promise(function(resolve, reject) {
          listener = messageListener(resolve, reject)
          gtfSub.on('message', listener) // gtfSub.on
        })
        .finally(function() {
          gtfSub.removeListener('message', listener)
        })
    }

    router.on(wire.StartTcpdumpMessage, function(channel, message) {
      var reply = wireutil.reply(options.serial)

      timeout = message.timeout || DEFAULT_TIMEOUT // default timeout: 15min
      var id = message.id || 'testID'

      function handler() {
        log.info(`Send message to start tcpdump on device ${serial}`)
        gtfPub.send([serial, `{"serial":"${serial}", "testID":"${id}", "action":"${GTF_MSG_REQ_START_TCPDUMP}"}`])
        var mockResponse = {action: GTF_MSG_RESP_START_TCPDUMP, testID: id, serial: serial, status: 'started', error: ''}
        push.send([
          channel
        , reply.okay('success', mockResponse)
        ])
        return handleResponse(id, channel)
              .timeout(timeout)
              .then(function(response) {
                  timerForceStop = setTimeout(forceStop, timeout)
                  push.send([
                    channel
                  , reply.okay('success', response)
                  ])
              })
              .error(function(response) {
                  push.send([
                    channel
                  , reply.fail('fail', response)
                  ])
              })
              .finally(function() {
              })
      }

      clearTimeout(timerStartTcpdump)
      timerStartTcpdump = setTimeout(handler, DELAY_TO_RUN)
    })


    router.on(wire.StopTcpdumpMessage, function(channel, message) {
      var reply = wireutil.reply(options.serial)
      var id = message.id || 'testID'

      var handler = function() {
        log.info(`Send message to stop tcpdump on device ${serial}`)
        gtfPub.send([serial, `{"serial": "${serial}", "testID":"${id}", "action":"${GTF_MSG_REQ_STOP_TCPDUMP}"}`])

        var mockResponse = {action: GTF_MSG_RESP_STOP_TCPDUMP, serial: serial, testID: id, status: 'stopped', url: 'http://www.mock.com', error: ''}
        push.send([
          channel
        , reply.okay('success', mockResponse)
        ])
        return handleResponse(id, channel)
              .timeout(timeout)
              .then(function(response) {
                  clearTimeout(timerForceStop)
                  push.send([
                    channel
                  , reply.okay('success', response)
                  ])
              })
              .error(function(response) {
                  push.send([
                    channel
                  , reply.fail('fail', response)
                  ])
              })
              .finally(function() {
              })
      }

      clearTimeout(timerStopTcpdump)
      timerStopTcpdump = setTimeout(handler, DELAY_TO_RUN)
  })
})
