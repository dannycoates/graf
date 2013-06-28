module.exports = function (Node) {
	function noop() {}
	var identity = function (x) { return x }

	function Graph(name, input, output) {
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
			this.node(this.input[i]).execute(i, arguments[i])
		}
	}

	Graph.prototype.add = function (name, spec) {
		var fn = null
		if (spec.fn) {
			fn = spec.fn
		}
		else if (spec.syncFn) {
			fn = wrap(spec.syncFn)
		}
		else if (spec.nodes) {
			fn = makeGraph(name, spec)
		}
		this.nodes[name] = new Node(name, fn, spec.input || [], this)
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

	function makeGraph(name, spec) {
		if (spec === undefined) {
			spec = name
			name = '__graph__'
		}
		var graph = new Graph(name, spec.input, spec.output)
		var names = Object.keys(spec.nodes)
		for (var i = 0; i < names.length; i++) {
			var n = names[i]
			graph.add(n, spec.nodes[n])
		}

		return start.bind(graph)
	}

	return makeGraph
}
