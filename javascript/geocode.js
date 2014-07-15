if ("undefined" == typeof works) { var works = {}; }
if (!works.ignition) { works.ignition = {}; }

(function(scope){

  scope.Geocode = (function(){
    return function(){

      this.lookup = function(address, cb){
        $.ajax({
          url: "https://maps.googleapis.com/maps/api/geocode/json",
          data: { address: address + " london" }
        }).done(cb);
      };

    };
  }());

  $.fn.geocode = function(cb){
    var $this = $(this);

    var $input   = $this.find('.js-geocode-input');
    var $button  = $this.find('.js-geocode-button');
    var $results = $this.find('.js-geocode-results');
    var geocode  = new scope.Geocode();

    var selectAddress = function(address){
      return function(){ cb(address.geometry.location); clearResults(); };
    };

    var updateResults = function(data){
      clearResults();
      var addresses = data.results.slice(0,5);

      var $template = $("<ul>");
      for(var i=0; i < addresses.length; i++){
        var address = addresses[i];
        var $line = $("<li>"+address.formatted_address+"</li>").click(selectAddress(address));
        $template.append($line);
      }
      $template.append($("</ul>"));

      $results.html($template);
      $results.show();
    };

    var clearResults = function(){ $results.html(''); $results.hide(); };
    clearResults();

    $button.click(function(){ if($input.val() !== ''){geocode.lookup($input.val(), updateResults);} });

  };

}(works.ignition));
