module.exports = function (inherits, EventEmitter) {

	function Node(name, fn, input, after, graph) {
		EventEmitter.call(this)
		this.name = name
		this.fn = fn
		this.graph = graph
		this.onData = null
		this.args = [] // fn argument values
		this.nodes = {} // node names to argument indices foo:[0,1]

		// poplulate the keys for this.nodes
		var n
		for (var i = 0; i < input.length; i++) {
			n = input[i]
			this.nodes[n] = this.nodes[n] || []
			this.nodes[n].push(i)
		}
		for (var i = 0; i < after.length; i++) {
			n = after[i]
			this.nodes[n] = this.nodes[n] || []
		}
		this.remaining = Object.keys(this.nodes).length
		this.args[input.length] = callback.bind(this)
	}
	inherits(Node, EventEmitter)

	Node.prototype.connect = function () {
		var names = Object.keys(this.nodes)
		for (var i = 0; i < names.length; i++) {
			var node = this.graph.node(names[i])
			if (node) {
				this.onData = this.execute.bind(this, node.name)
				node.once('data', this.onData)
			}
		}
		if (names.length === 0) {
			this.run(this.args) // functions with no arguments can run right now
		}
	}

	Node.prototype.disconnect = function () {
		var names = Object.keys(this.nodes)
		for (var i = 0; i < names.length; i++) {
			var node = this.graph.node(names[i])
			if (node) {
				node.removeListener('data', this.onData)
			}
		}
	}

	Node.prototype.execute = function (arg, data) {
		var indices = this.nodes[arg]
		for (var i = 0; i < indices.length; i++) {
			this.args[indices[i]] = data
		}
		if (!(--this.remaining)) {
			this.run(this.args)
		}
	}

	Node.prototype.run = function (input) {
		this.fn.apply(null, input)
	}

	function callback(err, data) {
		if (err) return this.emit('error', err)
		this.emit('data', data)
	}

	return Node
}
