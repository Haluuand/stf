var syrup = require('stf-syrup')

var Promise = require('bluebird')

var logger = require('../../../util/logger')
var wireutil = require('../../../wire/util')
var srv = require('../../../util/srv')
require('../../../util/lifecycle')
var zmqutil = require('../../../util/zmqutil')

module.exports = syrup.serial()
  .define(function(options) {
    var log = logger.createLogger('device:support:pub')

    // Input
    var pub = zmqutil.socket('pub')

    return Promise.map(options.endpoints.gtfSub, function(endpoint) {
        return srv.resolve(endpoint).then(function(records) {
          return srv.attempt(records, function(record) {
            log.info('Pub message to "%s"', record.url)
            pub.connect(record.url)
            return Promise.resolve(true)
          })
        })
      })
      .return(pub)
  })
