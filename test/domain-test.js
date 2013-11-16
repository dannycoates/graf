var test = require('tap')
  .test
var graf = require('..')

  function oopsLater() {
    setTimeout(
      function boom() {
        throw new Error('later')
      },
      10
    )
  }

  function oopsNow() {
    throw new Error('now')
  }

var spec = {
  input: ['a'],
  nodes: {
    red: {
      input: ['a'],
      fn: oopsLater
    },
    blue: {
      input: ['red'],
      syncFn: function(x) {
        return x
      }
    }
  },
  output: 'blue'
}

test(
  'a thrown error later is caught by the domain',
  function(t) {
    spec.nodes.red.input = ['a']
    spec.nodes.red.fn = oopsLater
    var g = graf(spec)

    g(
      'anything',
      function(err) {
        t.type(err, 'Error')
        t.end()
      }
    )
  }
)

test(
  'a zero input node is bound to the domain',
  function(t) {
    spec.nodes.red.input = []
    spec.nodes.red.fn = oopsLater
    var g = graf(spec)

    g(
      'nothing',
      function(err) {
        t.type(err, 'Error')
        t.end()
      }
    )
  }
)

test(
  'thrown sync errors in async function are not caught',
  function(t) {
    spec.nodes.red.input = ['a']
    spec.nodes.red.fn = oopsNow
    var g = graf(spec)
    try {
      g('x', t.fail)
      t.fail()
    } catch (e) {
      t.end()
    }
  }
)

test(
  'a syncFn thrown error `now` is caught',
  function(t) {
    spec.nodes.red.input = ['a']
    spec.nodes.red.fn = null
    spec.nodes.red.syncFn = oopsNow
    var g = graf(spec)

    g(
      'nothing',
      function(err) {
        t.type(err, 'Error')
        t.end()
      }
    )
  }
)

test(
  'a syncFn without input thrown error `now` is caught',
  function(t) {
    debugger;
    spec.nodes.red.input = []
    spec.nodes.red.fn = null
    spec.nodes.red.syncFn = oopsNow
    var g = graf(spec)

    g(
      'nothing',
      function(err) {
        t.type(err, 'Error')
        t.end()
      }
    )
  }
)