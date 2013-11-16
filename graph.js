module.exports = function(crypto, Domain, Node) {
  function noop() {}

  function identity(x, cb) {
    cb(null, x)
  }

  function Graph(spec) {
    this.id = crypto.pseudoRandomBytes(4)
      .toString('hex')
    this.nodes = {}
    this.post = spec.post
    this.cb = noop
    this.error = spec.error || noop
    this.onError = done.bind(this)
    this.onData = done.bind(this, null)
    this.domain = Domain.create()
    this.domain.on('error', this.onError)
  }

  // creates a new Node and adds it to the graph
  Graph.prototype.add = function(name, spec) {
    var fn = null
    if (spec.fn) {
      fn = this.domain.bind(spec.fn)
    } else if (spec.syncFn) {
      fn = wrap(spec.syncFn)
    } else if (spec.nodes) {
      fn = makeGraph(spec)
    }
    this.nodes[name] = new Node(name, fn, this, spec)
    return this
  }

  Graph.prototype.connect = function() {
    var ready = []
    var names = Object.keys(this.nodes)
    for (var i = 0; i < names.length; i++) {
      var n = this.nodes[names[i]]
      n.once('error', this.onError)
      if (n.connect()) ready.push(n)
    }
    for (i = 0; i < ready.length; i++) {
      ready[i].run()
    }
  }

  Graph.prototype.disconnect = function() {
    var names = Object.keys(this.nodes)
    for (var i = 0; i < names.length; i++) {
      var n = this.nodes[names[i]]
      n.removeListener('error', this.onError)
      n.disconnect()
    }
  }

  Graph.prototype.node = function(name) {
    return this.nodes[name]
  }

  function done(err, result) {
    if (err) {
      this.error(err)
      this.disconnect()
    }
    if (this.post) {
      this.post(err, result)
    }
    this.cb(err, result)
    this.cb = noop
  }

  // wraps a synchronous function appending a callback argument
  function wrap(fn) {
    return function wrapper() {
      var cb = arguments[arguments.length - 1]
      try {
        var result = fn.apply(
          null,
          Array.prototype.slice.call(arguments, 0, arguments.length - 1)
        )
        cb(null, result)
      } catch (e) {
        cb(e)
      }
    }
  }

  // This is the function returned by `makeGraph`.
  // `spec` is bound, therefore the arguments at call
  // time are used as the values for `spec.input`.
  function start(spec) {
    var graph = new Graph(spec)

    // create nodes for the input
    for (var i = 0; i < spec.input.length; i++) {
      graph.add(spec.input[i], {
        fn: identity,
        input: [i]
      })
    }
    // create nodes
    var names = Object.keys(spec.nodes)
    for (var i = 0; i < names.length; i++) {
      var n = names[i]
      graph.add(n, spec.nodes[n])
    }

    // connect the `cb` argument to the `spec.output` node
    var cb = arguments[arguments.length - 1]
    var argLength = arguments.length - 1
    if (typeof cb === 'function') {
      argLength--
      graph.cb = cb
      var outputNode = graph.node(spec.output)
      if (outputNode) {
        outputNode.once('data', graph.onData)
      }
    }

    if (spec.pre) {
      spec.pre.call(graph, Array.prototype.slice.call(arguments, 1, argLength + 1))
    }
    // wire up the events
    graph.connect()

    // send arguments to the input nodes to kick off execution
    for (var i = 0; i < argLength; i++) {
      graph.node(spec.input[i])
        .execute(i, arguments[i + 1])
    }
  }

  // Construct a graph function from the given spec.
  // The arguments of the returned function will
  // correspond to `spec.input` followed by
  // a `callback` function expecting a signature
  // of `(err, result)`.
  // Each call to the graph function constructs a new
  // Graph and begins execution.
  function makeGraph(spec) {
    spec.input = spec.input || []
    spec.nodes = spec.nodes || {}
    return start.bind(null, spec)
  }

  return makeGraph
}