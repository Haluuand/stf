var r = require('rethinkdb')

module.exports = {
  users: {
    primaryKey: 'email'
  , indexes: {
      adbKeys: {
        indexFunction: function(user) {
          return user('adbKeys')('fingerprint')
        }
      , options: {
          multi: true
        }
      }
    }
  }
, accessTokens: {
    primaryKey: 'id'
  , indexes: {
      email: null
    }
  }
, vncauth: {
    primaryKey: 'password'
  , indexes: {
      response: null
    , responsePerDevice: {
        indexFunction: function(row) {
          return [row('response'), row('deviceId')]
        }
      }
    }
  }
, devices: {
    primaryKey: 'serial'
  , indexes: {
      owner: {
        indexFunction: function(device) {
          return r.branch(
            device('present')
          , device('owner')('email')
          , r.literal()
          )
        }
      }
    , present: null
    , providerChannel: {
        indexFunction: function(device) {
          return device('provider')('channel')
        }
      }
    }
  }
, logs: {
    primaryKey: 'id'
  }
, testing:{
    primaryKey: 'id',
    indexes: {
      name: null
      ,status: null
      ,start: null
    }
  }
, reports:{
    primaryKey: 'id'
  , indexes: { // @hy 2017-05-31 add index to improve performance of fectching reports
      test: null
      ,time: null
    }
  }
, testcases: {  // @hy 2017-05-21 add compound index for table testcase
    primaryKey: 'id'
    , indexes: {
      template: {
        indexFunction: function (row) {
          return [row('group'), row('scenario')]
        }
        , options: {
          multi: false
        }
      }
    }
  }
, records:{
    primaryKey: 'id'
    , indexes: {
      user: null
      ,device: null
    }
  }
, providers:{
    primaryKey: 'name'
    , indexes: {
       time: null
    }
  }
, remoteTasks:{
    primaryKey: 'id'
    , indexes: {
       serial: null
       , email: null
    }
  },
}
