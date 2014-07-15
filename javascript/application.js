$(function(){
  // Import namespaced code
  var BusStopMap         = works.ignition.BusStopMap;
  var BusStopRepository  = works.ignition.BusStopRepository;
  var BusStopCoordinator = works.ignition.BusStopCoordinator;

  // Initialize Map
  var bus_stop_repository  = new BusStopRepository('http://digitaslbi-id-test.herokuapp.com');
  var bus_stop_map         = new BusStopMap($('.js-bus-stop-map')[0]);
  var bus_stop_coordinator = new BusStopCoordinator(bus_stop_map, bus_stop_repository);

  // Hook jquery plugin into map
  $('.js-geocode').geocode(function(location){ bus_stop_map.move(location); });
});
