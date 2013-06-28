module.exports = function (Node) {
	function noop() {}
	function identity(x, cb) { cb(null, x) }

	function Graph(error) {
		this.nodes = {}
		this.cb = noop
		this.error = error || noop
		this.onError = done.bind(this)
		this.onData = done.bind(this, null)
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
			fn = makeGraph(spec)
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
			this.error(err)
			this.disconnect()
		}
		this.cb(err, result)
		this.cb = noop
	}

	function wrap(fn) {
		return function wrapper() {
			var cb = arguments[arguments.length - 1]
			try {
				var result = fn.apply(
					null,
					Array.prototype.slice.call(arguments, 0, arguments.length - 1)
				)
				cb(null, result)
			}
			catch (e) {
				cb(e)
			}
		}
	}

	function start(spec) {
		var graph = new Graph(spec.error)

		for (var i = 0; i < spec.input.length; i++) {
			graph.add(spec.input[i], { fn: identity, input: [i] })
		}
		var names = Object.keys(spec.nodes)
		for (var i = 0; i < names.length; i++) {
			var n = names[i]
			graph.add(n, spec.nodes[n])
		}
		graph.connect()

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

		for (var i = 0; i < argLength; i++) {
			graph.node(spec.input[i]).execute(i, arguments[i + 1])
		}
	}

	function makeGraph(spec) {
		spec.input = spec.input || []
		spec.nodes = spec.nodes || {}
		return start.bind(null, spec)
	}

	return makeGraph
}
