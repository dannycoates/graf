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

# license

BSD
