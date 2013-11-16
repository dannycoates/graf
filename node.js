module.exports = function(inherits, EventEmitter) {

  function Node(name, fn, graph, options) {
    EventEmitter.call(this)
    this.name = name
    this.fn = fn
    this.graph = graph
    this.onData = null
    this.args = [] // fn argument values
    this.nodes = {} // node names to argument indices foo:[0,1]
    this.pre = options.pre
    this.post = options.post
    options.input = options.input || []
    options.after = options.after || []

    // poplulate the keys for this.nodes
    var n
    for (var i = 0; i < options.input.length; i++) {
      n = options.input[i]
      this.nodes[n] = this.nodes[n] || []
      this.nodes[n].push(i)
    }
    for (var i = 0; i < options.after.length; i++) {
      n = options.after[i]
      this.nodes[n] = this.nodes[n] || []
    }
    this.remaining = Object.keys(this.nodes)
      .length
    this.args[options.input.length] = callback.bind(this)
  }
  inherits(Node, EventEmitter)

  // Wire up the input for this node to
  // the corresponding nodes in the graph
  Node.prototype.connect = function() {
    var names = Object.keys(this.nodes)
    for (var i = 0; i < names.length; i++) {
      var node = this.graph.node(names[i])
      if (node) {
        this.onData = this.execute.bind(this, node.name)
        node.once('data', this.onData)
      }
    }
    return (names.length === 0)
  }

  // Remove all listeners to input nodes
  Node.prototype.disconnect = function() {
    var names = Object.keys(this.nodes)
    for (var i = 0; i < names.length; i++) {
      var node = this.graph.node(names[i])
      if (node && this.onData) {
        node.removeListener('data', this.onData)
      }
    }
  }

  // Accept an input value from another node
  // and `run` if all inputs have been received.
  // Called by the input node's 'data' event
  Node.prototype.execute = function(arg, data) {
    var indices = this.nodes[arg]
    for (var i = 0; i < indices.length; i++) {
      this.args[indices[i]] = data
    }
    if (!(--this.remaining)) {
      this.run()
    }
  }

  Node.prototype.run = function() {
    if (this.pre) {
      this.pre(this.args.slice(0, this.args.length - 1))
    }
    this.fn.apply(null, this.args)
  }

  function callback(err, data) {
    if (this.post) {
      this.post(err, data)
    }
    if (err) return this.emit('error', err)
    this.emit('data', data)
  }

  return Node
}