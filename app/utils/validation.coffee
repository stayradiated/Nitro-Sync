# Hold all the definitions
definitions = {}

# Recursively inherit defintions
mergeKeys = (a, b) ->

  details = keys: {}

  if a.keys
    details.keys[k] = v for k, v of a.keys

  if b.keys
    details.keys[k] = v for k, v of b.keys when not a.keys[k]?

  if b.inherit
    details.keys = mergeKeys details, definitions[b.inherit].details

  return details.keys

# Get a definition
getDef = (name) ->
  def = definitions[name]
  if not def then return checkType(name)
  return def.fn

# Check an object is of a native type
check = (obj, type) ->
  return typeof obj is type

# Curried version of `check`
checkType = (type) ->
  return (obj) -> return typeof obj is type

# Create a new type definition
define = (name, type, details) ->

  if definitions[name]
    throw new Error('Definition already defined: ' + name)

  # Create definition
  def = definitions[name] =
    name: name
    type: type
    details: details

  # Get function to check type of object
  typeCheck = getDef(type)

  # Simplest definition
  if not details
    return def.fn = getDef(type)

  # Checking function
  if check details, 'function'
    return def.fn = (obj) ->
      return false unless typeCheck(obj)
      return details(obj)

  # Check object/array props
  prop = details.prop
  if prop then prop = getDef(prop)

  # Checking object/array keys
  if details.keys
    for key, value of details.keys
      details.keys[key] = getDef(value)

  keys = details.keys

  # Inheriting properties from other definitions
  inherit = null
  # if typeof details.inherit is 'function'
  #   inherit = (obj) ->
  #     return definitions[details.inherit(obj)](obj)
  if typeof details.inherit is 'string'
    keys = mergeKeys def.details, definitions[details.inherit].details

  # Creating definition
  return def.fn = (obj) ->
    return false unless typeCheck obj

    if inherit then return false unless inherit(obj)

    for own key, value of obj

      if prop
        return false unless prop(value)
      else if keys
        return false unless details.other or keys[key]
        return false unless keys[key](value)

    return true

defineFn = (name, args...) ->
  return (input) ->
    for arg, i in input
      return false unless check arg, args[i]
    return true


# -----------------------------------------------------------------------------
# Useful Definitions
# -----------------------------------------------------------------------------

# Preserve the native object type
define '*object', 'object'

# Add array type
define 'array', 'object', Array.isArray

# Override the native object type to exclude arrays
define 'object', '*object', (obj) -> not Array.isArray(obj)


# -----------------------------------------------------------------------------
# Exports
# -----------------------------------------------------------------------------

module.exports =
  define: define
  defineFn: defineFn
