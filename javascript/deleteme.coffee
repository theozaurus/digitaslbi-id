# Namespace code to avoid conflicts
works = {}  if "undefined" is typeof works
works.ignition = {}  unless works.ignition
((scope) ->

  # Facade classes to hide Google API to gain flexibility
  scope.Bound = (->
    (ne, sw) ->
      @ne = ne
      @sw = sw
      return
  )()

  # Factory method for Bound class
  scope.Bound.build = (googleBound) ->
    new scope.Bound(scope.Location.build(googleBound.getNorthEast()), scope.Location.build(googleBound.getSouthWest()))

  scope.Location = (->
    (lat, lng) ->
      @lat = lat
      @lng = lng
      return
  )()
  scope.Location.build = (googleLatLng) ->
    new works.ignition.Location(googleLatLng.lat(), googleLatLng.lng())


  # Domain concepts
  scope.BusStop = (->
    (opts) ->

      # Public interface
      @id = opts.id
      @lat = opts.lat
      @lng = opts.lng
      @name = opts.name
      return
  )()
  scope.BusStopMap = (->
    Location = scope.Location
    (element) ->

      # Private
      that = this
      mapOptions =
        center: new google.maps.LatLng(51.521, -0.071)
        zoom: 15
        streetViewControl: false

      map = new google.maps.Map(element, mapOptions)
      stops = {}
      stopSelectedCallbacks = []
      triggerStopSelected = (stop) ->
        i = 0

        while i < stopSelectedCallbacks.length
          stopSelectedCallbacks[i] stop
          i++
        return

      googleLatLng = (location) ->
        new google.maps.LatLng(location.lat, location.lng)


      # Public interface
      @addStop = (stop) ->
        return  if stops[stop.id]
        latlng = googleLatLng(stop)
        marker = new google.maps.Marker(
          position: latlng
          map: map
          title: stop.name
          clickable: true
        )
        google.maps.event.addListener marker, "click", ->
          triggerStopSelected stop
          return

        stops[stop.id] = marker
        return

      @addStops = (stops) ->
        i = 0

        while i < stops.length
          that.addStop stops[i]
          i++
        return

      infowindow = new google.maps.InfoWindow()
      @displayStopInfo = (stop, html_string) ->
        marker = stops[stop.id]
        return  unless marker
        infowindow.setContent html_string
        infowindow.open map, marker
        return

      @move = (location) ->
        map.setCenter googleLatLng(location)
        return

      @bounds = ->
        scope.Bound.build map.getBounds()

      @onBoundsChanged = (cb) ->
        google.maps.event.addListener map, "bounds_changed", cb
        return

      @onStopSelected = (cb) ->
        stopSelectedCallbacks.push cb
        return

      return
  )()
  scope.BusStopRepository = (->
    BusStop = scope.BusStop
    (domain) ->
      all_url = (bounds) ->
        domain + "/bus-stops?northEast=" + bounds.ne.lat + "," + bounds.ne.lng + "&southWest=" + bounds.sw.lat + "," + bounds.sw.lng

      stop_url = (stop) ->
        domain + "/bus-stops/" + stop.id

      load_stops = (data) ->
        stops = data.markers
        results = []
        i = 0

        while i < stops.length
          results.push new BusStop(stops[i])
          i++
        results


      # Pubic interface
      @allWithin = (bounds, callback) ->
        $.ajax(
          dataType: "jsonp"
          url: all_url(bounds)
        ).done (data) ->
          stops = load_stops(data)
          callback stops
          return

        return

      @timesFor = (stop, callback) ->
        $.ajax(
          dataType: "jsonp"
          url: stop_url(stop)
        ).done (data) ->
          callback data.arrivals
          return

        return

      return
  )()
  scope.BusStopTemplate = render: (stop, arrivals) ->
    string = ""
    string += "<h2>" + stop.name + "</h2>"
    string += "<table>"
    i = 0

    while i < arrivals.length
      arrival = arrivals[i]
      string += "<tr><td><b>" + arrival.destination + "</b></td>" + "<td>" + arrival.scheduledTime + "</td>" + "<td>" + arrival.estimatedWait + "</td></tr>"
      i++
    string += "</table>"
    string

  scope.BusStopCoordinator = (->
    (map, repository) ->
      showStopInfo = (stop) ->
        repository.timesFor stop, (arrivals) ->
          template = scope.BusStopTemplate.render(stop, arrivals)
          map.displayStopInfo stop, template
          return

        return

      updateShownQueue = []
      updateShownStops = ->
        updateShownQueue = [map.bounds()] # poor mans fixed length queue
        workUpdateShownQueue()
        return

      working = false
      workUpdateShownQueue = ->
        return  if working
        working = true
        bounds = updateShownQueue.pop()
        repository.allWithin bounds, (stops) ->
          map.addStops stops
          working = false
          workUpdateShownQueue()  if updateShownQueue.length isnt 0
          return

        return

      registerEvents = ->
        map.onBoundsChanged updateShownStops
        map.onStopSelected showStopInfo
        return

      registerEvents()
      return
  )()
  return
) works.ignition
