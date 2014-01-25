Q        = require 'kew'
config   = require '../app/config'

# -----------------------------------------------------------------------------
# Setup
# -----------------------------------------------------------------------------

config.use 'testing'
global.DEBUG = true

# Load controllers
database = require '../app/controllers/query'
connect  = require '../app/controllers/connect'

# Connect to databases
connect.init()

module.exports = (done) ->

  database.connected
    .then ->
      database.query('user').del()
    .then ->
      done()
    .fail (err) ->
      console.log 'Error: Setup', err
