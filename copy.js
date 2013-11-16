module.exports = function copy(spec) {

  if (typeof spec !== 'object' || spec === null) {
    return spec
  }

  var spec2 = (Array.isArray(spec)) ? [] : {}

  var names = Object.keys(spec)
  for (var i = 0; i < names.length; i++) {
    var n = names[i]
    spec2[n] = copy(spec[n])
  }

  return spec2
}