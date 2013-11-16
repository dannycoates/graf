var test = require('tap')
  .test
var debug = require('../debug')
var graf = require('..')

var spec = {
  input: ['x'],
  nodes: {
    red: {
      input: ['x'],
      syncFn: function(x) {
        return x.push('red')
      }
    },
    blue: {
      input: ['x'],
      fn: function(x, cb) {
        process.nextTick(
          function() {
            cb(null, x.push('blue'))
          }
        )
      }
    },
    green: {
      input: ['red', 'blue', 'x'],
      syncFn: function(red, blue, x) {
        return x
      }
    }
  },
  output: 'green'
}

test(
  "with 'after' red runs after blue",
  function(t) {
    spec.nodes.red.after = ['blue']
    graf(debug(console, spec))([], function(err, r) {
      t.equal(r[0], 'blue')
      t.end()
    })
  }
)

test(
  "without 'after' red runs first",
  function(t) {
    spec.nodes.red.after = null
    graf(debug(console, spec))([], function(err, r) {
      t.equal(r[0], 'red')
      t.end()
    })
  }
)