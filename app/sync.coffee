express = require "express"
http    = require "http"
Q       = require "q"
Auth    = require "./auth"
User    = require "./storage"

# Easy way to disable logging if needed
Log = (args...) =>
  # return
  args.unshift('(Sync)')
  console?.log?(args...)

# Start server
init = ->
  port = process.env.PORT || 5000

  app = express()
  server = app.listen(port)
  io = require('socket.io').listen(server)

  # Serve up static files in the public folder
  app.configure ->
    app.use express.static(__dirname + '/public')

  # Socket.IO settings
  io.configure ->
    # Hide messages
    io.set "log level", 1
    # Configure for Heroku
    # io.set "transports", ["xhr-polling"]
    # io.set "polling duration", 10

  # Fired when user connects to server
  io.sockets.on 'connection', (socket) ->
    # Create a new Sync instance
    new Sync(socket)

# Does all the useful stuff
class Sync

  @init: init

  # Store user data
  user: no

  # Socket.IO events
  events:
    'disconnect': 'logout'
    'login': 'login'
    'fetch': 'fetch'
    'sync': 'sync'
    'create': 'create'
    'update': 'update'
    'destroy': 'destroy'

  constructor: (@socket) ->
    Log "-- A user has connected to the server --"
    # Bind socket.io events
    for event, fn of @events
      @on event, @[fn]


  # ------------------
  # Utility Functions
  # ------------------

  # Return model
  find: (className, id) =>
    data = @user.data(className)
    if !data
      data = @user.data(className, {})
    data?[id]

  # Update attributes
  set: (className, id, data) =>
    model = @find className, id
    for key, value of data
      model[key] = value
    @user.save(className)
    model

  # Replace model
  replace: (className, id, data) =>
    @user.data(className)[id] = data
    @user.save(className)

  # Convert data object into spine array
  getArray: (className) =>
    models = []
    data = @user.data(className)
    return [] unless data
    # Return all live items
    for id, model of data
      if not model.deleted
        models.push model
    models


  # -------------------
  # Timestamp functions
  # -------------------

  # Return timestamp for an item or attribute
  getTime: (className, id, attr) =>
    if attr?
      @user.data("Time")?[className]?[id]?[attr]
    else
      @user.data("Time")?[className]?[id]

  # Set timestamp for an attribute
  setTime: (className, id, attr, time) =>
    # Makes sure the entry exists
    if not @user.data("Time")
      @user.data("Time", {})
    if not (className of @user.data("Time"))
      @user.data("Time")[className] = {}
    if not (id of @user.data("Time")[className])
      @user.data("Time")[className][id] = {}

    if attr is "all"
      for attr of @user.data("Time")[className][id]
        @user.data("Time")[className][id][attr] = time
    else
      @user.data("Time")[className][id][attr] = time
    @user.save("Time")


  # -----------------
  # Socket.IO Comands
  # -----------------

  # Emit event
  emit: (name, data) =>
    @socket.broadcast.to(@user.name).emit(name, data)

  # Bind event to function
  on: (event, fn) =>
    @socket.on event, (args...) =>
      return unless @user or event is "login"
      fn(args...)


  # --------------
  # General Events
  # --------------

  # Temp function to handle usernames and rooms
  login: (username) =>

    deferred = Q.defer()

    Q.fcall( ->
      User.usernameExists username
    ).then( (exists) ->
      if exists
        User.getByName username
      else
        # Add user to database if they don't already exist
        User.add username, "email-#{Date.now()}", "password"
    ).then( (user) =>
      # Set user
      @user = user
      # Move user to their own room
      @socket.join(@user.username)
      Log "#{ @user.username } has logged in"
      deferred.resolve @user
    )

    return deferred.promise

  logout: =>
    Log "#{ @user.username } has logged out"
    Log "-- Releasing connection --"

  # Return all models in database
  fetch: (className, fn) =>
    # Create model in data
    if not @user.data(className) then @user.data(className, {})
    fn @getArray(className)


  # ---------------
  # Realtime Events
  # ---------------

  # Create a new model
  create: (data, fn) =>
    [className, model] = data
    return unless className in ["List", "Task"]
    # Generate new id
    id = @user.index(className)
    @user.incrIndex className
    model.id = id
    # Add item to server
    group = @user.data(className)
    if !group
      group = @user.data(className, {})
    group[id] = model
    @user.save(className)
    Log "Created item: #{ model.name }"
    # Return new ID
    if fn? then fn(id)
    # Broadcast event to connected clients
    @emit 'create', [className, model]

  # Update existing model
  update: (data) =>
    [className, changes] = data
    return unless className in ["List", "Task"]
    # Update model
    id = changes.id
    model = @set className, id, changes
    Log "Updated item: #{ model.name }"
    # Broadcast event to connected clients
    @emit 'update', [className, model]

  # Delete existing model
  destroy: (data) =>
    [className, id] = data
    return unless className in ["List", "Task"]
    # Replace task with deleted template
    @replace className, id,
      id: id
      deleted: yes
    Log "Destroyed item #{ id }"
    @emit 'destroy', [className, id]


  # -----------
  # Sync Events
  # -----------

  # Sync
  sync: (queue, fn) =>
    Log "Running sync"
    for event in queue
      [type, [className, model], timestamp] = event
      switch type
        when "create"
          @create [className, model]
        when "update"
          @update [className, model]
        when "destroy"
          @destroy [className, model]
    fn [@getArray("Task"), @getArray("List")] if fn

module?.exports = Sync
