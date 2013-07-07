# graf

Run a bunch of async and sync functions in some kind of order.

# Example

```js
var graf = require('graf')
var crypto = require('crypto')

function a(x, y) { return x + y }
function add() {
	return Array.prototype.slice.call(arguments).reduce(a)
}

function m(x, y) { return x * y }
function multiply() {
	return Array.prototype.slice.call(arguments).reduce(m)
}

var g = graf(
	{
		input: ['a', 'b', 'x'],
		nodes: {
			sum: {
				input: ['a', 'b'],
				syncFn: add
			},
			multiply: {
				input: ['sum', 'sum', 'randomInt'],
				syncFn: multiply
			},
			randomBytes: {
				input: ['x'],
				fn: crypto.randomBytes
			},
			randomInt: {
				input: ['randomBytes'],
				syncFn: function (bytes) {
					return bytes.readUInt8(0)
				}
			},
			foo: {
				input: ['sum', 'randomInt'],
				syncFn: function (sum, int) {
					console.log("sum: %d int: %d", sum, int)
				}
			}
		},
		output: 'multiply'
	}
)

g(3, 2, 1, console.log)
```

Obviously not ready for prime time

# API

## graf(spec)

Given a spec, defined below, returns a function that will asynchronously
execute the spec and return the result or error to a callback function.

## spec

A graf is defined by an object called a spec. The spec defines the input,
nodes, and output of the graf.

### input

The `input` attribute defines the arguments for the graf function. The array maps
argument indices to argument names, just like a normal function signature. These
arguments can be used as input to the nodes of the graf.
For example:

```js
var spec = {
	input: ['x', 'y', 'z']
}

var g = graf(spec)

g(1, 2, 3)

// x = 1
// y = 2
// z = 3
```

### nodes

The `nodes` define the functions to call and their relationships to one another.
Each node has a `name` and a `fn` or `syncFn` function, and optionally `input`
and `after` attributes.

- input: node names whose values will be passed to `fn` or `syncFn`
- after: node names that must complete before this node, but that do not provide input
- fn: an async function that accepts a callback(err, ...)
- syncFn: a synchronous function

The `input` and `after` attributes define the order of execution. Each node will
wait until all of it's input and after nodes have completed before executing.

Any node that returns an error will prevent any unstarted nodes from executing
and the graf callback to return the error.

```js
var spec = {
	input: ['r', 'b'],
	nodes: {
		red: {
			input: ['r'],
			fn: computeRed
		},
		blue: {
			input: ['red', 'b'],
			fn: computeBlue
		},
		green: {
			after: ['blue'],
			fn: computeGreen
		}
	}
}

/*
Red will run first, followed by blue, then green.

Green has no input, so it could have run at the same time
as red if it didn't have an "after" set. "after" is useful
for manually ordering execution.
*/
```

### output

The `output` attribute defines which `node` will be used as the result of the
graf function and returned to the callback.

```js
var spec = {
	nodes: {
		red: {
			fn: function (cb) { cb(null, "red") }
		},
		blue: {
			input: ['red'],
			syncFn: function (red) { return "hello " + red }
		}
	},
	output: 'blue'
}

var g = graf(spec)

g(console.log)

// null "hello red"
```

# license

BSD
