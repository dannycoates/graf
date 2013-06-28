module.exports = function (inherits, EventEmitter) {

	var asyncNoop = wrap(function noop() {})
	var identity = function (x) { return x }

	function Slayer(name, fn, input, parent) {
		EventEmitter.call(this)
		this.name = name || '__root__'
		this.fn = fn || asyncNoop
		this.parent = parent || this
		this.children = {}
		this.input = input || []
		this.output = ''

		// map fn argument index to argument values
		this.args = []
		// map dependant node names to fn argument indices 'foo':[0,1]
		this.argDeps = {}
		// number of arguments that have received a value
		this.argsReceived = 0
		// poplulate the keys for this.args and this.argDeps
		for (var i = 0; i < this.input.length; i++) {
			var n = this.input[i]
			this.argDeps[n] = this.argDeps[n] || []
			this.argDeps[n].push(i)
		}
		// the last arg must always be a callback(err, ...) function
		this.args[this.input.length] = callback.bind(this)
	}
	inherits(Slayer, EventEmitter)

	function go() {
		var cb = arguments[arguments.length - 1]
		if (typeof cb === 'function') {
			var outputNode = this.node(this.output)
			if (outputNode) {
				outputNode.once('data', cb.bind(this, null))
			}
			//TODO a global err handler
		}
		for (var i = 0; i < arguments.length - 1; i++) {
			var name = this.input[i]
			var node = this.node(name)
			execute.call(node, name, arguments[i])
		}
	}

	function makeRoot(name, def) {
		var root = new Slayer(name, asyncNoop, def.input)

		for (var i = 0; i < def.input.length; i++) {
			var name = def.input[i]
			root.buildSync(name, identity, [''])
		}
		root.output = def.output
		root.fn = go.bind(root)
		return root
	}

	Slayer.graph = function (name, def) {
		//TODO: option shifting
		var root = makeRoot(name, def)
		var dnodes = def.nodes
		var nodeNames = Object.keys(dnodes)
		for (var i = 0; i < nodeNames.length; i++) {
			var name = nodeNames[i]
			var dnode = dnodes[name]
			if (dnode.fn) {
				root.build(name, dnode.fn, dnode.input)
			}
			else if (dnode.syncFn) {
				root.buildSync(name, dnode.syncFn, dnode.input)
			}
			else if (dnode.nodes) {
				root.build(name, Slayer.graph('_' + name, dnode), dnode.input)
			}
		}

		return function () {
			this.run(Array.prototype.slice.call(arguments))
		}.bind(root)
	}

	Slayer.prototype._build = function (name, fn, input) {
		var n = new Slayer(name, fn, input, this)
		this.children[name] = n
		return n
	}

	Slayer.prototype.build = function (name, fn, input) {
		return this.parent._build(name, fn, input)
	}

	Slayer.prototype.buildSync = function (name, fn, input) {
		return this.build(name, wrap(fn), input)
	}

	Slayer.prototype.node = function (name) {
		return this.children[name]
	}

	Slayer.prototype.connect = function () {
		var argDepNames = Object.keys(this.argDeps)
		for (var i = 0; i < argDepNames.length; i++) {
			var depName = argDepNames[i]
			var node = this.parent.node(depName)
			if (node) {
				node.once('data', execute.bind(this, depName))
			}
		}
		if (argDepNames.length === 0) {
			// functions with no arguments can run right now
			this.run(this.args)
		}
		return this
	}

	Slayer.prototype.run = function (input) {
		var childNames = Object.keys(this.children)
		for (var i = 0; i < childNames.length; i++) {
			this.children[childNames[i]].connect()
		}
		this.fn.apply(null, input)
	}

	Slayer.prototype.longName = function () {
		var name = ''
		if (this !== this.parent) {
			name = this.parent.longName() + ':' + this.name
		}
		else {
			name = this.name
		}
		return name
	}

	function callback(err, data) {
		if (err) return this.emit('error', err)
		this.emit('data', data)
	}

	function execute(arg, data) {
		var indices = this.argDeps[arg] || [0]
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

	return Slayer
}
