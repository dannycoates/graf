var crypto = require('crypto')
var inherits = require('util')
  .inherits
var EventEmitter = require('events')
  .EventEmitter
var Domain = require('domain')
var Node = require('./node')(inherits, EventEmitter)

module.exports = require('./graph')(crypto, Domain, Node)

/*
TODO
- multiple outputs with names. ouput: ['written', 'buffer']
- graph timeout
- node pre/post functions
*/