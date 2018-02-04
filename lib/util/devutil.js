var util = require('util')

var split = require('split')
var Promise = require('bluebird')

var devutil = module.exports = Object.create(null)

var commands = Object.create(null)

function closedError(err) {
  return err.message.indexOf('closed') !== -1
}

devutil.ensureUnusedLocalSocket = function(adb, serial, sock) {
  return adb.openLocal(serial, sock)
    .then(function(conn) {
      conn.end()
      throw new Error(util.format('Local socket "%s" should be unused', sock))
    })
    .catch(closedError, function() {
      return Promise.resolve(sock)
    })
}

devutil.waitForLocalSocket = function(adb, serial, sock) {
  return adb.openLocal(serial, sock)
    .then(function(conn) {
      conn.sock = sock
      return conn
    })
    .catch(closedError, function() {
      return Promise.delay(100)
        .then(function() {
          return devutil.waitForLocalSocket(adb, serial, sock)
        })
    })
}

devutil.listPidsByComm = function(adb, serial, comm, bin) {
  var users = {
    shell: true,
    root:  true
  }

  return new Promise(function(resolve) {
    if ('ps' in commands) {
      resolve(commands)
    }
    else {
      adb.getProperties(serial)
        .then(function(properties) {
          var version = properties['ro.build.version.release']
          if (version.match(/^8\./) !== null) {
            commands.ps = 'ps -lef'
          }
          else {
            commands.ps = 'ps'
          }
          resolve(commands)
        })
    }
  })
    .then(function(commands) {
      return adb.shell(serial, [commands.ps])
        .then(function(out) {
          return new Promise(function(resolve) {
            var header = true
            var pids = []
            out.pipe(split())
              .on('data', function(chunk) {
                if (header) {
                  header = false
                }
                else {
                  var cols = chunk.toString().split(/\s+/)
                  if (cols.pop() === bin && users[cols[0]]) {
                    pids.push(Number(cols[1]))
                  }
                }
              })
              .on('end', function() {
                resolve(pids)
              })
          })
        })
    })
}
// @HY 2017-06-11 kill the last process which is displayed when issue "ps comm"
devutil.killLastProcByComm = function(adb, serial, comm, bin, mode) {

  return devutil.listPidsByComm(adb, serial, comm, bin, mode)
    .then(function(pids) {

      if (!pids.length) {
        return Promise.resolve()
      }
      return adb.shell(serial, ['kill', mode || -15].concat(pids.pop()))
        .then(function(out) {
          return new Promise(function(resolve) {
            out.on('end', resolve)
          })
        })
        .then(function() {
          return devutil.waitForProcsToDie(adb, serial, comm, bin)
        })
        .timeout(2000)
        .catch(function() {
          return devutil.killProcsByComm(adb, serial, comm, bin, -9)
        })
    })
}

devutil.waitForProcsToDie = function(adb, serial, comm, bin) {
  return devutil.listPidsByComm(adb, serial, comm, bin)
    .then(function(pids) {
      if (pids.length) {
        return Promise.delay(100)
          .then(function() {
            return devutil.waitForProcsToDie(adb, serial, comm, bin)
          })
      }
    })
}

devutil.killProcsByComm = function(adb, serial, comm, bin, mode) {
  return devutil.listPidsByComm(adb, serial, comm, bin, mode)
    .then(function(pids) {

      if (!pids.length) {
        return Promise.resolve()
      }
      return adb.shell(serial, ['kill', mode || -15].concat(pids))
        .then(function(out) {
          return new Promise(function(resolve) {
            out.on('end', resolve)
          })
        })
        .then(function() {
          return devutil.waitForProcsToDie(adb, serial, comm, bin)
        })
        .timeout(2000)
        .catch(function() {
          return devutil.killProcsByComm(adb, serial, comm, bin, -9)
        })
    })
}

// get window size (resolution)
devutil.getResolution = function(adb, serial) {
  return new Promise(function(resolve, reject) {
    adb.shell(serial, "wm size").timeout(2 * 1000)
      .then(function processAdbOutput(output) {
        var content = ""
        // var resolver = Promise.defer()
        function processData(data) {
          content += data
        }

        function errorListener(err) {
          reject(err)
        }

        function endListener() {
          var res = /Physical\s*size:\s*(\d+)x(\d+)/i.exec(content)
          if (res === null)
            reject("Can't find valid resolution rate")
          else {
            var retVal = {width: res[1], height: res[2]}
            resolve(retVal)  // get matched group
          }
        }

        output.on('data', processData)
        output.on('error', errorListener)
        output.on('end', endListener)

        return
        /*return resolver.promise.finally(function () {
          output.removeListener('data', processData)
          output.removeListener('error', errorListener)
          output.removeListener('end', endListener)
        })
        */
      })
  })
}

devutil.makeIdentity = function(serial, properties) {
  var model = properties['ro.product.model']
  var brand = properties['ro.product.brand']||''
  var manufacturer = properties['ro.product.manufacturer']
  var operator = properties['gsm.sim.operator.alpha'] ||
        properties['gsm.operator.alpha']
  var version = properties['ro.build.version.release']
  var sdk = properties['ro.build.version.sdk']
  var abi = properties['ro.product.cpu.abi']
  var product = properties['ro.product.name']
  var cpuPlatform = properties['ro.board.platform']  // @HY 2017-12-10, add cpuPlatform to fulfill requirement from GG
  var brand = properties['ro.product.brand']
  var openGLESVersion = properties['ro.opengles.version']

  openGLESVersion = parseInt(openGLESVersion, 10)
  if (isNaN(openGLESVersion)) {
    openGLESVersion = '0.0'
  }
  else {
    var openGLESVersionMajor = (openGLESVersion & 0xffff0000) >> 16
    var openGLESVersionMinor = (openGLESVersion & 0xffff)
    openGLESVersion = openGLESVersionMajor + '.' + openGLESVersionMinor
  }

  // Remove brand prefix for consistency
  if (model.substr(0, brand.length) === brand) {
    model = model.substr(brand.length)
  }

  // Remove manufacturer prefix for consistency
  if (model.substr(0, manufacturer.length) === manufacturer) {
    model = model.substr(manufacturer.length)
  }

  // Clean up remaining model name
  // model = model.replace(/[_ ]/g, '')
  return {
    serial: serial
  , platform: 'Android'
  , manufacturer: manufacturer.toUpperCase()
  , operator: operator || null
  , model: model
  , version: version
  , abi: abi
  , sdk: sdk
  , product: product
  , brand: brand
  , cpuPlatform: cpuPlatform
  , openGLESVersion: openGLESVersion
  }
}
