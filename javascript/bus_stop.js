// Namespace code to avoid conflicts
if ("undefined" == typeof works) { var works = {}; }
if (!works.ignition) { works.ignition = {}; }

(function(scope){

  // Facade classes to hide Google API to gain flexibility
  scope.Bound = (function(){
    return function(ne,sw){
      this.ne = ne;
      this.sw = sw;
    };
  })();

  // Factory method for Bound class
  scope.Bound.build = function(googleBound){
    return new scope.Bound(
      scope.Location.build(googleBound.getNorthEast()),
      scope.Location.build(googleBound.getSouthWest())
    );
  };

  scope.Location = (function(){
    return function(lat, lng){
      this.lat = lat;
      this.lng = lng;
    };
  })();
  scope.Location.build = function(googleLatLng){
    return new works.ignition.Location(
      googleLatLng.lat(), googleLatLng.lng()
    );
  };

  // Domain concepts
  scope.BusStop = (function(){
    return function(opts){
      // Public interface
      this.id   = opts.id;
      this.lat  = opts.lat;
      this.lng  = opts.lng;
      this.name = opts.name;
    };
  })();

  scope.BusStopMap = (function(){

    var Location = scope.Location;

    return function(element){
      // Private
      var that = this;
      var mapOptions = {
        center: new google.maps.LatLng(51.521, -0.071),
        zoom: 15,
        streetViewControl: false
      };

      var map = new google.maps.Map(element, mapOptions);

      var stops = {};

      var stopSelectedCallbacks = [];
      var triggerStopSelected = function(stop){
        for(var i=0; i < stopSelectedCallbacks.length; i++){ stopSelectedCallbacks[i](stop); }
      };

      var googleLatLng = function(location){
        return new google.maps.LatLng(location.lat, location.lng);
      };

      // Public interface
      this.addStop = function(stop){
        if(stops[stop.id]){ return; }

        var latlng = googleLatLng(stop);
        var marker = new google.maps.Marker({ position: latlng, map: map, title: stop.name, clickable: true });
        google.maps.event.addListener(marker, 'click', function(){ triggerStopSelected(stop); });
        stops[stop.id] = marker;
      };

      this.addStops = function(stops){
        for(var i=0; i < stops.length; i++){ that.addStop(stops[i]); }
      };

      var infowindow = new google.maps.InfoWindow();
      this.displayStopInfo = function(stop, html_string){
        var marker = stops[stop.id];
        if(!marker){ return; }

        infowindow.setContent(html_string);
        infowindow.open(map, marker);
      };

      this.move = function(location){
        map.setCenter(googleLatLng(location));
      };

      this.bounds = function(){ return scope.Bound.build(map.getBounds()); };

      this.onBoundsChanged = function(cb){ google.maps.event.addListener(map, 'bounds_changed', cb); };

      this.onStopSelected  = function(cb){ stopSelectedCallbacks.push(cb); };

    };

  })();

  scope.BusStopRepository = (function(){

    var BusStop = scope.BusStop;

    return function(domain){

      var all_url = function(bounds){
        return domain + '/bus-stops?northEast=' +
                        bounds.ne.lat + ',' + bounds.ne.lng +
                        '&southWest=' +
                        bounds.sw.lat + ',' + bounds.sw.lng;
      };

      var stop_url = function(stop){ return domain + '/bus-stops/' + stop.id; };

      var load_stops = function(data){
        var stops   = data.markers;
        var results = [];
        for(var i=0; i < stops.length; i++){
          results.push(new BusStop(stops[i]));
        }
        return results;
      };

      // Pubic interface
      this.allWithin = function(bounds, callback){
        $.ajax({
          dataType: "jsonp",
          url: all_url(bounds)
        }).done(function(data){
          var stops = load_stops(data);
          callback(stops);
        });
      };

      this.timesFor = function(stop, callback){
        $.ajax({
          dataType: "jsonp",
          url: stop_url(stop)
        }).done(function(data){
          callback(data.arrivals);
        });
      };
    };

  })();

  scope.BusStopTemplate = {
    render: function(stop, arrivals){
      var string = '';
      string += "<h2>"+stop.name+"</h2>";
      string += "<table>";

      for(var i=0; i<arrivals.length; i++){
        var arrival = arrivals[i];
        string += "<tr><td><b>" + arrival.destination   + "</b></td>" +
                         "<td>" + arrival.scheduledTime + "</td>" +
                         "<td>" + arrival.estimatedWait + "</td></tr>";
      }

      string += "</table>";

      return string;
    }
  };

  scope.BusStopCoordinator = (function(){

    return function(map, repository){


      var showStopInfo = function(stop){
        repository.timesFor(stop, function(arrivals){
          var template = scope.BusStopTemplate.render(stop,arrivals);
          map.displayStopInfo(stop, template);
        });
      };

      var updateShownQueue = [];
      var updateShownStops = function(){
        updateShownQueue = [map.bounds()]; // poor mans fixed length queue
        workUpdateShownQueue();
      };

      var working = false;
      var workUpdateShownQueue = function(){
        if(working){ return; }

        working = true;
        var bounds = updateShownQueue.pop();
        repository.allWithin(bounds, function(stops){
          map.addStops(stops);

          working = false;
          if(updateShownQueue.length !== 0){ workUpdateShownQueue(); }
        });
      };

      var registerEvents = function(){
        map.onBoundsChanged(updateShownStops);
        map.onStopSelected(showStopInfo);
      };
      registerEvents();
    };

  })();

})(works.ignition);
