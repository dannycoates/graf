module.exports = function (inherits, EventEmitter) {

	function Node(name, fn, input, graph) {
		EventEmitter.call(this)
		this.name = name
		this.fn = fn
		this.graph = graph
		this.onData = null

		// fn argument values
		this.args = []
		// map predecessor node names to fn argument indices 'foo':[0,1]
		this.argDeps = {}
		// number of arguments that have received a value
		this.argsReceived = 0
		// poplulate the keys for this.argDeps
		for (var i = 0; i < input.length; i++) {
			var n = input[i]
			this.argDeps[n] = this.argDeps[n] || []
			this.argDeps[n].push(i)
		}
		// the last arg must always be a callback(err, ...) function
		this.args[input.length] = callback.bind(this)
	}
	inherits(Node, EventEmitter)

	Node.prototype.connect = function () {
		var names = Object.keys(this.argDeps)
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
		var names = Object.keys(this.argDeps)
		for (var i = 0; i < names.length; i++) {
			var node = this.graph.node(names[i])
			if (node) {
				node.removeListener('data', this.onData)
			}
		}
	}

	Node.prototype.execute = function (arg, data) {
		var indices = this.argDeps[arg]
		for (var i = 0; i < indices.length; i++) {
			this.argsReceived++
			this.args[indices[i]] = data
		}
		if (this.argsReceived === this.args.length - 1) {
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
