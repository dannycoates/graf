var inherits = require('util').inherits
var EventEmitter = require('events').EventEmitter
var Node = require('./node')(inherits, EventEmitter)

module.exports = require('./graph')(Node)

