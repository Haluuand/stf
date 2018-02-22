var r = require('rethinkdb')
var util = require('util')

var db = require('./')
var wireutil = require('../wire/util')

var dbapi = Object.create(null)

dbapi.DuplicateSecondaryIndexError = function DuplicateSecondaryIndexError() {
  Error.call(this)
  this.name = 'DuplicateSecondaryIndexError'
  Error.captureStackTrace(this, DuplicateSecondaryIndexError)
}

util.inherits(dbapi.DuplicateSecondaryIndexError, Error)

dbapi.close = function(options) {
  return db.close(options)
}

dbapi.saveUserAfterLogin = function(user) {
  return db.run(r.table('users').get(user.email).update({
      name: user.name
    , ip: user.ip
    , lastLoggedInAt: r.now()
    }))
    .then(function(stats) {
      if (stats.skipped) {
        return db.run(r.table('users').insert({
          email: user.email
        , name: user.name
        , ip: user.ip
        , group: wireutil.makePrivateChannel()
        , lastLoggedInAt: r.now()
        , createdAt: r.now()
        , forwards: []
        , settings: {}
        }))
      }
      return stats
    })
}

dbapi.loadUser = function(email) {
  return db.run(r.table('users').get(email))
}

// @chenhao loadUserList
dbapi.loadUserList = function(){
  return db.run(r.table('users'))
}

// @chenhao setUserTag
dbapi.setUserTags = function(email,tags){
  return db.run(r.table('users').get(email).update({
    tags: tags
  }))
}

// @chenhao loadProviderList
dbapi.loadServerList = function(){
  return db.run(r.table('providers'))
}

// @chenhao
dbapi.setServerTags = function(name,note,tags){
  return db.run(r.table('providers').get(name).update({
    note: note||'',
    tags: tags||''
  }))
}

// @huangye
dbapi.loadServerTags = function(name){
  return db.run(r.table('providers').get(name))
}

dbapi.updateUserSettings = function(email, changes) {
  return db.run(r.table('users').get(email).update({
    settings: changes
  }))
}

dbapi.resetUserSettings = function(email) {
  return db.run(r.table('users').get(email).update({
    settings: r.literal({})
  }))
}

dbapi.insertUserAdbKey = function(email, key) {
  return db.run(r.table('users').get(email).update({
    adbKeys: r.row('adbKeys').default([]).append({
      title: key.title
    , fingerprint: key.fingerprint
    })
  }))
}

dbapi.deleteUserAdbKey = function(email, fingerprint) {
  return db.run(r.table('users').get(email).update({
    adbKeys: r.row('adbKeys').default([]).filter(function(key) {
      return key('fingerprint').ne(fingerprint)
    })
  }))
}

dbapi.lookupUsersByAdbKey = function(fingerprint) {
  return db.run(r.table('users').getAll(fingerprint, {
    index: 'adbKeys'
  }))
}

dbapi.lookupUserByAdbFingerprint = function(fingerprint) {
  return db.run(r.table('users').getAll(fingerprint, {
      index: 'adbKeys'
    })
    .pluck('email', 'name', 'group'))
    .then(function(cursor) {
      return cursor.toArray()
    })
    .then(function(groups) {
      switch (groups.length) {
        case 1:
          return groups[0]
        case 0:
          return null
        default:
          throw new Error('Found multiple users for same ADB fingerprint')
      }
    })
}

dbapi.lookupUserByVncAuthResponse = function(response, serial) {
  return db.run(r.table('vncauth').getAll([response, serial], {
      index: 'responsePerDevice'
    })
    .eqJoin('userId', r.table('users'))('right')
    .pluck('email', 'name', 'group'))
    .then(function(cursor) {
      return cursor.toArray()
    })
    .then(function(groups) {
      switch (groups.length) {
        case 1:
          return groups[0]
        case 0:
          return null
        default:
          throw new Error('Found multiple users with the same VNC response')
      }
    })
}

dbapi.loadUserDevices = function(email) {
  return db.run(r.table('devices').getAll(email, {
    index: 'owner'
  }))
}

dbapi.saveDeviceLog = function(serial, entry) {
  return db.run(r.table('logs').insert({
      serial: serial
    , timestamp: r.epochTime(entry.timestamp)
    , priority: entry.priority
    , tag: entry.tag
    , pid: entry.pid
    , message: entry.message
    }
  , {
      durability: 'soft'
    }))
}

dbapi.saveDeviceInitialState = function(serial, device) {
  var data = {
    present: false
  , presenceChangedAt: r.now()
  , provider: device.provider
  , owner: null
  , status: device.status
  , statusChangedAt: r.now()
  , ready: false
  , reverseForwards: []
  , remoteConnect: false
  , remoteConnectUrl: null
  , usage: null
  }
  var provider_name = device.provider.name
  //@chenhao 存储provider的信息
  db.run(r.table('providers').get(provider_name))
    .then(function(stats) {
        if (!stats){
          return db.run(r.table('providers').insert({'name':provider_name,'time':r.now()}))
        }
    })

  return db.run(r.table('devices').get(serial).update(data))
    .then(function(stats) {
      if (stats.skipped) {
        data.serial = serial
        data.createdAt = r.now()
        return db.run(r.table('devices').insert(data))
      }
      return stats
    })
}

dbapi.setDeviceConnectUrl = function(serial, url) {
  return db.run(r.table('devices').get(serial).update({
    remoteConnectUrl: url
  , remoteConnect: true
  }))
}

dbapi.unsetDeviceConnectUrl = function(serial) {
  return db.run(r.table('devices').get(serial).update({
    remoteConnectUrl: null
  , remoteConnect: false
  }))
}

dbapi.saveDeviceStatus = function(serial, status) {
  return db.run(r.table('devices').get(serial).update({
    status: status
  , statusChangedAt: r.now()
  }))
}

dbapi.setDeviceOwner = function(serial, owner) {
  db.run(r.table('devices').get(serial)).then(function (device) {
    var manufacturer = device ? device.manufacturer : ''
    var model = device ? device.model : ''
    var version = device ? device.version : ''
    var provider = device ? device.provider.name : ''

    // save start time
    db.run(r.table('records').insert({
      name: owner['name']
      , group: owner['group']
      , email: owner['email']
      , serial: serial
      , start: r.now()
      , end: ''
      , status: 1
      , manufacturer: manufacturer
      , model:        model
      , version:      version
      , provider:     provider
    }))
  })

  return db.run(r.table('devices').get(serial).update({
    owner: owner
  }))
}

dbapi.unsetDeviceOwner = function(serial) {
  // for normal stop save end time
  db.run(r.table('devices').get(serial)).then(function(device){
    var owner = device.owner

    db.run(r.table('records').filter({
      'name':owner.name
      ,'group':owner.group
      ,'serial':device.serial
      ,'status': 1
    }).update(
      {
        'end': r.now()
        ,'status': 2
      }
    ))
  })

  return db.run(r.table('devices').get(serial).update({
    owner: null
  }))
}

dbapi.setDevicePresent = function(serial) {
  return db.run(r.table('devices').get(serial).update({
    present: true
  , presenceChangedAt: r.now()
  }))
}

dbapi.setDeviceAbsent = function(serial) {
  //for abnormal stop save end time
  db.run(r.table('devices').get(serial)).then(function(device) {
    var owner = device.owner
    if (owner == null){
      return
    }
    db.run(r.table('records').filter({
      'name':owner.name
      ,'group':owner.group
      ,'serial':device.serial
      ,'status': 1
    }).update(
      {
        'end': r.now()
        ,'status': 2
        // ,'manufacturer':device.manufacturer  @HY 2017-07-27 to work around the problem of empty manufacture value,
        //                                                     save device info when use device
        //,'model':device.model
        //,'version':device.version
        //,'provider':device.provider.name
      }))
  });

  return db.run(r.table('devices').get(serial).update({
    present: false
  , presenceChangedAt: r.now()
  }))
}

dbapi.setDeviceUsage = function(serial, usage) {
  return db.run(r.table('devices').get(serial).update({
    usage: usage
  , usageChangedAt: r.now()
  }))
}

dbapi.unsetDeviceUsage = function(serial) {
  return db.run(r.table('devices').get(serial).update({
    usage: null
  , usageChangedAt: r.now()
  }))
}

dbapi.setDeviceAirplaneMode = function(serial, enabled) {
  return db.run(r.table('devices').get(serial).update({
    airplaneMode: enabled
  }))
}

dbapi.setDeviceBattery = function(serial, battery) {
  return db.run(r.table('devices').get(serial).update({
      battery: {
        status: battery.status
      , health: battery.health
      , source: battery.source
      , level: battery.level
      , scale: battery.scale
      , temp: battery.temp
      , voltage: battery.voltage
      }
    }
  , {
      durability: 'soft'
    }))
}

dbapi.setDeviceBrowser = function(serial, browser) {
  return db.run(r.table('devices').get(serial).update({
    browser: {
      selected: browser.selected
    , apps: browser.apps
    }
  }))
}

dbapi.setDeviceConnectivity = function(serial, connectivity) {
  return db.run(r.table('devices').get(serial).update({
    network: {
      connected: connectivity.connected
    , type: connectivity.type
    , subtype: connectivity.subtype
    , failover: !!connectivity.failover
    , roaming: !!connectivity.roaming
    }
  }))
}

dbapi.setDevicePhoneState = function(serial, state) {
  return db.run(r.table('devices').get(serial).update({
    network: {
      state: state.state
    , manual: state.manual
    , operator: state.operator
    }
  }))
}

dbapi.setDeviceRotation = function(serial, rotation) {
  return db.run(r.table('devices').get(serial).update({
    display: {
      rotation: rotation
    }
  }))
}

dbapi.setDeviceNote = function(serial, note) {
  return db.run(r.table('devices').get(serial).update({
    notes: note
  }))
}

dbapi.setDeviceReverseForwards = function(serial, forwards) {
  return db.run(r.table('devices').get(serial).update({
    reverseForwards: forwards
  }))
}

dbapi.setDeviceReady = function(serial, channel) {
  return db.run(r.table('devices').get(serial).update({
    channel: channel
  , ready: true
  , owner: null
  , reverseForwards: []
  }))
}

dbapi.saveDeviceIdentity = function(serial, identity) {
  return db.run(r.table('devices').get(serial).update({
    platform: identity.platform
  , manufacturer: identity.manufacturer
  , operator: identity.operator
  , model: identity.model
  , version: identity.version
  , abi: identity.abi
  , sdk: identity.sdk
  , display: identity.display
  , phone: identity.phone
  , product: identity.product
  , cpuPlatform: identity.cpuPlatform  // @HY 2017-12-10  add cpu platform into DB to fulfill requirement from GG
    , brand: identity.brand            // @HY 2017-12-10  add cpu platform into DB to fulfill requirement from GG
  , openGLESVersion: identity.openGLESVersion
  }))
}

dbapi.loadDevices = function() {
  return db.run(r.table('devices'))
}

dbapi.loadPresentDevices = function() {
  return db.run(r.table('devices').getAll(true, {
    index: 'present'
  }))
}

dbapi.loadDevice = function(serial) {
  return db.run(r.table('devices').get(serial))
}

dbapi.loadDeviceByInventoryID = function (id) {
  return db.run(r.table('devices').filter({'inventoryID':id}))
}

dbapi.saveUserAccessToken = function(email, token) {
  return db.run(r.table('accessTokens').insert({
    email: email
  , id: token.id
  , title: token.title
  , jwt: token.jwt
  }))
}

dbapi.removeUserAccessToken = function(email, title) {
  return db.run(r.table('accessTokens').getAll(email, {
    index: 'email'
  }).filter({title: title}).delete())
}

dbapi.loadAccessTokens = function(email) {
  return db.run(r.table('accessTokens').getAll(email, {
    index: 'email'
  }))
}

dbapi.loadAccessToken = function(id) {
  return db.run(r.table('accessTokens').get(id))
}

dbapi.updateLogcatLink = function(test) {
  return db.run(r.table('testing').get(test.id).update({
     logcat: test.logcat
  }))
}

//@chenhao 存储测试的输出结果
dbapi.saveTest = function(serial, test){
  // 添加测试的记录
  if (test.status == 'Testing'){
    db.run(r.table('records').insert({
       'test_id':test.id
      ,'serial':serial
      , start : r.now()
      , end : ''
      ,'status': 1}))
  }else{
    db.run(r.table('devices').get(serial)).then(function(device){
      db.run(r.table('records').filter({
        'test_id':test.id
        ,'serial':serial
        ,'status': 1
      }).update(
        {
          'end': r.now()
          ,'status': 2
          ,'manufacturer':device.manufacturer
          ,'model':device.model
          ,'version':device.version
          ,'provider':device.provider.name
          ,'test':test.name
        }
      ))
    })
  }

  return db.run(r.table('testing').get(test.id).update({
     end: test.endTime
    , status: test.status
  }))
    .then(function(stats) {
      if (stats.replaced === 0 && stats.unchanged === 0) {
        return db.run(r.table('testing').insert({
          id: test.id
          ,group: test.groupId
          , name: test.name
          , scenario: test.scenario
          , user: test.user
          , serial: serial
          , start: test.startTime
          , end: test.endTime
          , status: test.status
          , package: test.package
          , commands: test.commands
          , pid: test.pid||"undefined"
          , model: test.model
          , manufacturer: test.manufacturer
          , version: test.version
          , display: test.display
          , logcat:  test.logcat || ""
        }))
      }
      return stats
    })
}

// 存储命令执行的结果
dbapi.saveReport = function(report){
  return db.run(r.table('reports').insert({
    id: report.id
    , test: report.test
    , message: report.message
    , time: report.time
  }))
}

//@hy 2017-05-17 save testcase info
dbapi.saveTestcase = function(testcase) {
  // return db.run(r.table('testcases').get(testcase.id).update({
  return db.run(r.table("testcases") // @hy 2017-05-21 for the template which has duplicate group and scenario, just update it
           .getAll([testcase.group, testcase.scenario], {index: "template"}).update({
      group: testcase.group
      ,scenario: testcase.scenario
      ,command: testcase.command
      ,changedAt: new Date().getTime()
  }))
    .then(function(stats) {
      if (stats.replaced === 0 && stats.unchanged === 0) {
        testcase.createdAt = new Date().getTime()
        testcase.changedAt = new Date().getTime()
        return db.run(r.table('testcases').insert(testcase))
      }
      return stats
    })
}

//@hy 2017-05-17 load case list
dbapi.loadTestcaseList = function(){
  return db.run(r.table('testcases').group('group'))
}

//@hy 2017-05-17 load specific case detail
dbapi.loadTestcaseDetail = function(id){
  return db.run(r.table('testcases').filter({id:id}))
}

// 获取测试记录
// TODO: @HY 2017-05-29 smell code, have to refactor
dbapi.loadTestingList = function(status, start, end, testType){
  var query_filter = r.row('start').ge(start).and(r.row('start').le(end))

  if (typeof(testType) != "undefined" && testType){
    if (status === 'Notrun'){
      return db.run(r.table('testing').orderBy(r.desc('start')).filter(
        r.row('status').ne('Testing'))
        .filter(query_filter)
        .filter({name:testType}))
    }else{
      return db.run(r.table('testing').orderBy(r.desc('start'))
        .filter({'status':status})
        .filter(query_filter)
        .filter({name:testType}))
    }
  } else {
    // 默认情况的查询
    if (status === 'Notrun') {
      return db.run(r.table('testing').orderBy(r.desc('start')).filter(
        r.row('status').ne('Testing'))
        .filter(query_filter))
    } else {
      return db.run(r.table('testing').orderBy(r.desc('start')).filter({'status':status}))
    }
  }
}

// 获取某个测试的进程的pid
dbapi.loadTestingDetails = function(id){
  return db.run(r.table('testing').filter({id:id}))
}

// 获取某次测试的报告详情
dbapi.loadTestingReport = function(id){
  return db.run(r.table('reports').getAll(id, {
    index: 'test'
  }).orderBy('time').limit(500))
}

dbapi.loadTestingPieStat = function(name, start, end, type){
  if (typeof(type) != "undefined" && type){
    var query_filter = r.row('start').gt(start).and(r.row('end').lt(end))
    return db.run(r.db('stf').table('testing').filter({'status':'Failed'})
             .filter(query_filter).filter({'name': type}).group(name))
  } else {
    return db.run(r.db('stf').table('testing').filter({'status':'Failed'}).group(name))
  }
}

dbapi.loadTestingBarStat = function(name, start, end, type){
  if (start==0){
    return db.run(r.db('stf').table('testing').group(name))
  }else{
    var query_filter = r.row('start').gt(start).and(r.row('end').lt(end))
    return db.run(r.db('stf').table('testing').filter(query_filter).group(name))
  }
}

dbapi.loadTestingTypes = function(){
  return db.run(r.db('stf').table('testing').distinct({'index':'name'}))
}

/* @chenhao add user-device records stat function*/
dbapi.loadUserDeviceStat = function(start, end, name){
    // query params 统计使用时间的长短，按照用户，或者按照设备机型，厂商
    var query_filter = r.row('start').gt(new Date(start)).and(r.row('end').lt(new Date(end))).and({'status':2})
    return db.run(r.db('stf').table('records').filter(query_filter).group(name))
}


dbapi.loadRecordsStat = function(start, end, type){
  // 判断type类型
  var group_filter = []
  if(type == '日'){
    group_filter = [r.row("end").year(),r.row("end").month(),r.row("end").day(),r.row("end").hours()]
  }else if (type == '月'){
    group_filter = [r.row("end").year(),r.row("end").month(),r.row("end").day()]
  }else if(type == '年'){
    group_filter = [r.row("end").year(),r.row("end").month()]
  }
  var query_filter = r.row('start').gt(new Date(start)).and(r.row('end').lt(new Date(end))).and({'status':2})
  return db.run(r.db('stf').table('records').filter(query_filter).group(group_filter))
}

module.exports = dbapi
