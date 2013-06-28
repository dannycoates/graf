module.exports = function (inherits, EventEmitter) {

	function noop() {}
	var asyncNoop = wrap(noop)
	var identity = function (x) { return x }

	function Graph(name, fn, input, output) {
		this.input = input || []
		this.output = output || ''
		this.nodes = {}
		this.cb = noop
		this.onError = done.bind(this)
		this.onData = done.bind(this, null)
	}

	function start() {
		var cb = arguments[arguments.length - 1]
		if (typeof cb === 'function') {
			this.cb = cb
			var outputNode = this.node(this.output)
			if (outputNode) {
				outputNode.once('data', this.onData)
			}
		}
		for (var i = 0; i < this.input.length; i++) {
			this.add(this.input[i], { syncFn: identity, input: [i] })
		}
		this.connect()
		for (var i = 0; i < arguments.length - 1; i++) {
			execute.call(this.node(this.input[i]), i, arguments[i])
		}
	}

	function makeGraph(name, spec) {
		//TODO: option shifting
		var root = new Graph(name, asyncNoop, spec.input, spec.output)
		var dnodes = spec.nodes
		var names = Object.keys(dnodes)
		for (var i = 0; i < names.length; i++) {
			var name = names[i]
			var dnode = dnodes[name]
			root.add(name, dnode)
		}

		return start.bind(root)
	}

	Graph.prototype.add = function (name, spec) {
		var fn = asyncNoop
		if (spec.fn) {
			fn = spec.fn
		}
		else if (spec.syncFn) {
			fn = wrap(spec.syncFn)
		}
		else if (spec.nodes) {
			fn = makeGraph(name, spec)
		}
		this.nodes[name] = new Node(name, fn, spec.input, this)
		return this
	}

	Graph.prototype.connect = function () {
		var names = Object.keys(this.nodes)
		for (var i = 0; i < names.length; i++) {
			var n = this.nodes[names[i]]
			n.connect()
			n.once('error', this.onError)
		}
	}

	Graph.prototype.disconnect = function () {
		var names = Object.keys(this.nodes)
		for (var i = 0; i < names.length; i++) {
			var n = this.nodes[names[i]]
			n.disconnect()
			n.removeListener('error', this.onError)
		}
	}

	Graph.prototype.node = function (name) {
		return this.nodes[name]
	}

	function done(err, result) {
		if (err) {
			this.disconnect()
		}
		this.cb(err, result)
		this.cb = noop
	}

	function Node(name, fn, input, graph) {
		EventEmitter.call(this)
		this.name = name
		this.fn = fn
		this.graph = graph
		this.input = input || []
		this.onData = noop

		// fn argument values
		this.args = []
		// map predecessor node names to fn argument indices 'foo':[0,1]
		this.argDeps = {}
		// number of arguments that have received a value
		this.argsReceived = 0
		// poplulate the keys for this.argDeps
		for (var i = 0; i < this.input.length; i++) {
			var n = this.input[i]
			this.argDeps[n] = this.argDeps[n] || []
			this.argDeps[n].push(i)
		}
		// the last arg must always be a callback(err, ...) function
		this.args[this.input.length] = callback.bind(this)
	}
	inherits(Node, EventEmitter)

	Node.prototype.connect = function () {
		var names = Object.keys(this.argDeps)
		for (var i = 0; i < names.length; i++) {
			var node = this.graph.node(names[i])
			if (node) {
				this.onData = execute.bind(this, node.name)
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

	Node.prototype.run = function (input) {
		this.fn.apply(null, input)
	}

	function callback(err, data) {
		if (err) return this.emit('error', err)
		this.emit('data', data)
	}

	function execute(arg, data) {
		var indices = this.argDeps[arg]
		for (var i = 0; i < indices.length; i++) {
			this.argsReceived++
			this.args[indices[i]] = data
		}
		if (this.argsReceived === this.args.length - 1) {
			this.run(this.args)
		}
	}

	function wrap(fn) {
		function wrapper() {
			var cb = arguments[arguments.length - 1]
			try {
				// TODO: check closure scope with wrapper.fn instead of fn
				var result = fn.apply(
					null,
					Array.prototype.slice.call(arguments, 0, arguments.length)
				)
				cb(null, result)
			}
			catch (e) {
				cb(e)
			}
		}
		wrapper.fn = fn
		return wrapper
	}

	return makeGraph
}
