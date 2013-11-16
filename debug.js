var copy = require('./copy')

  function noop() {}

  function preDebug(log, fn) {
    fn = fn || noop
    return function(input) {
      this._started = Date.now()
      log.info(
        'graf %s node %s CALLING with %j at %d',
        this.graph.id,
        this.name,
        input.slice(0, input.length),
        this._started
      )
      return fn.call(this, input)
    }
  }

  function postDebug(log, fn) {
    fn = fn || noop
    return function(err, data) {
      var timing = Date.now() - this._started
      log.info(
        'graf %s node %s %s with %j in %d ms',
        this.graph.id,
        this.name,
        err ? 'FAILED' : 'SUCCEEDED',
        err || data,
        timing
      )
      return fn.call(this, err, data)
    }
  }

  function graphPre(log, fn) {
    fn = fn || noop
    return function(input) {
      this._started = Date.now()
      log.info(
        'graf %s STARTING with %j at %d',
        this.id,
        input,
        this._started
      )
      return fn.call(this, input)
    }
  }

  function graphPost(log, fn) {
    fn = fn || noop
    return function(err, data) {
      var timing = Date.now() - this._started
      log.info(
        'graf %s %s with %j in %d ms',
        this.id,
        err ? 'FAILED' : 'SUCCEEDED',
        err || data,
        timing
      )
      return fn.call(this, err, data)
    }
  }

module.exports = function(log, spec) {
  var s = copy(spec)

  s.pre = graphPre(log, s.pre)
  s.post = graphPost(log, s.post)

  var names = Object.keys(s.nodes)
  for (var i = 0; i < names.length; i++) {
    var n = s.nodes[names[i]]
    n.pre = preDebug(log, n.pre)
    n.post = postDebug(log, n.post)
  }

  return s
}