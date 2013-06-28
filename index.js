var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter

module.exports = require('./slayer')(inherits, EventEmitter)

