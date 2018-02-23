var _ = require('lodash')
var Promise = require('bluebird')

var dbapi = require('../../../db/api')
var logger = require('../../../util/logger')
var datautil = require('../../../util/datautil')
var authutil = require('../../../util/authutil')

var log = logger.createLogger('api:controllers:devices')

module.exports = {
  getDevices: getDevices
, getDeviceBySerial: getDeviceBySerial
, getDeviceByInventoryID: getDeviceByInventoryID
}

function getDevices(req, res) {
  var fields = req.swagger.params.fields.value

  dbapi.loadDevices()
    .then(function(cursor) {

      return Promise.promisify(cursor.toArray, cursor)()
        .then(function(list) {
          var deviceList = []

          dbapi.loadServerList()
            .then(function(cursor) {
            return Promise.promisify(cursor.toArray, cursor)()
            .then(function (providers) {

              var providersMaps = {}
              for (var i = 0; i < providers.length; i++) {
                providersMaps[providers[i].name] = providers[i] || null
              }

              // filtered by Authorization Rules
              list.forEach(function (device) {
                var providerName = device.provider.name || ''
                var needFilterOut = authutil.filterByAuthorizationRules(device, req.user, providersMaps[providerName])

                if (needFilterOut) {
                  return false
                } else {
                  datautil.normalize(device, req.user)
                  var responseDevice = device

                  if (fields) {
                    responseDevice = _.pick(device, fields.split(','))
                  }
                  deviceList.push(responseDevice)
                }
              })

              res.json({
                success: true
                , devices: deviceList
              })

            })
          })

        })
      })
    .catch(function(err) {
      log.error('Failed to load device list: ', err.stack)
      res.status(500).json({
        success: false
      })
    })
}

function getDeviceBySerial(req, res) {
  var serial = req.swagger.params.serial.value
  var fields = req.swagger.params.fields.value

  dbapi.loadDevice(serial)
    .then(function(device) {
      if (!device) {
        return res.status(404).json({
          success: false
        , description: 'Device not found'
        })
      }

      datautil.normalize(device, req.user)
      var responseDevice = device

      if (fields) {
        responseDevice = _.pick(device, fields.split(','))
      }

      res.json({
        success: true
      , device: responseDevice
      })
    })
    .catch(function(err) {
      log.error('Failed to load device "%s": ', req.params.serial, err.stack)
      res.status(500).json({
        success: false
      })
    })
}

function getDeviceByInventoryID(req, res) {
  var inventoryID = req.swagger.params.inventoryID.value
  var fields = req.swagger.params.fields.value

  inventoryID = inventoryID.replace(/\s+/g, '')
  dbapi.loadDeviceByInventoryID(inventoryID)
    .then(function(cursor) {
       return Promise.promisify(cursor.toArray, cursor)() 
          .then(function(device) {
            if (!device) {
              return res.status(404).json({
                success: false
                , description: 'Device not found'
              })
            }

            log.info(device)
            datautil.normalize(device, req.user)

            var responseDevice = device
            if (fields) {
              responseDevice = _.pick(device, fields.split(','))
            }
            log.info(responseDevice)
            res.json({
              'success': true
              , 'device': responseDevice
            })
          })
    })
    .catch(function(err) {
      log.error('Failed to load device "%s": ', req.params.inventoryID, err.stack)
      res.status(500).json({
        success: false
      })
    })
}
