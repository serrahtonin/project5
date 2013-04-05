;(function($) {
	
	var MobileMap = function(obj, options) {
	
		var $t = $(obj);
		
		var t = {
			callback: {
				newMarker: function(marker, lat, lng) {},	
			},
			db: new localStorageDB("MapIndex", localStorage),
			bounds: new google.maps.LatLngBounds(),
			editIndex: false,
			geocoder: new google.maps.Geocoder(),
			map: false,
			mapOptions: {
				zoom: 15,
				center: new google.maps.LatLng(0, 0), 
				mapTypeId: google.maps.MapTypeId.ROADMAP, 
				scrollwheel: false
			},
			markers: [],
			ui: {
				map: $t
			}
		}
		
		if(!options) {
			var options = {};
		}
		
		t = $.extend(true, t, options);
		
		t.init = function(options) {
			
			if(options) {
				t.mapOptions = $.extend(true, t.mapOptions, options);	
			}
			
			t.map = new google.maps.Map(t.ui.map.get(0), t.mapOptions);
			
			// t.db.dropTable('markers');
			
			if(!t.db.tableExists('markers')) {			
			    t.db.createTable("markers", ["name", "address", "response", "street", "city", "state", "zipcode", "lat", "lng"]);
			    t.db.commit();
			}
			
			t.db.query('markers', function(row) {
				t.newMarker(row.lat, row.lng);
			});
			
			return t.map;
		}
		
		t.home = function() {
			google.maps.event.trigger(t.map, 'resize');
			t.map.setZoom(t.mapOptions.zoom);
			t.map.fitBounds(t.bounds);
			
			$('a[href="#home"]').click();	
		}
		
		t.newMarker = function(lat, lng) {
			var latLng = new google.maps.LatLng(lat, lng);
		
			marker = new google.maps.Marker({
				map: t.map,
				position: latLng 
			});
			
			t.callback.newMarker(marker, lat, lng, t.markers.length);
			
			t.markers.push(marker);
			t.bounds.extend(latLng);
			t.map.fitBounds(t.bounds);
			
			return marker;
		}
		
		t.updateMarker = function(marker, lat, lng) {
			marker.setPosition(new google.maps.LatLng(lat, lng));
		}
		
		t.editMarker = function(location, callback) {
			
			t.geocode(location.address, function(response) {
				if(response.success) {
					
					var lat = response.results[0].geometry.location.lat();
					var lng = response.results[0].geometry.location.lng();
					var hasLatLng = t.hasLatLng(lat, lng);
					
					if(hasLatLng) {
						alert('\''+$.trim(location.address)+'\' is already a location on the map');	
					}
					else {						
						t.updateMarker(t.markers[t.editIndex], lat, lng);
									
						t.db.update("markers", {ID: t.editIndex+1}, function() {
							var row = {
								name: location.name,
								address: location.address,
								street: location.street,
								city: location.city,
								state: location.state,
								zipcode: location.zipcode,
								response: response,
								lat: lat,
								lng: lng
							}
							
						console.log(row);
						
							return row;
						});
						
						t.db.commit();
						
						if(typeof callback == "function") {
							callback(response, location);
						}
					}
				}
				else {
					alert('\''+$.trim(location.address)+'\' is an invalid location');
				}
			});
		}
		
		t.addMarker = function(location, save, callback) {
			
			if(typeof save == "undefined") {
				var save = true;
			}
			
			if(typeof save == "function") {
				callback = save;
				save = true;
			}
			
			t.geocode(location.address, function(response) {
				if(response.success) {
					
					var lat = response.results[0].geometry.location.lat();
					var lng = response.results[0].geometry.location.lng();
					var hasLatLng = t.hasLatLng(lat, lng);
					var marker = false;
					
					if(hasLatLng) {
						alert('\''+$.trim(location.address)+'\' is already a location on the map');	
					}
					else {						
						t.newMarker(lat, lng);
						
						if(typeof callback == "function") {
							callback(response, location, save);
						}
					}
					
					if(save && !hasLatLng) {
						t.db.insert("markers", {
							name: location.name,
							address: location.address,
							street: location.street,
							city: location.city,
							state: location.state,
							zipcode: location.zipcode,
							response: response,
							lat: lat,
							lng: lng
						});
						
						t.db.commit();
					}
				}
				else {
					alert('\''+$.trim(location.address)+'\' is an invalid location');
				}
			});
		}
		
		t.hasLatLng = function(lat, lng) {
			var _return = false;
			
			t.db.query('markers', function(row) {
				if(row.lat == lat && row.lng == lng) {
					_return = true;	
				}
			});
			
			return _return;
		}
		
		t.geocode = function(location, callback) {
			if(typeof callback != "function") {
				callback = function() {};
			}
			
			t.geocoder.geocode({'address': location}, function(results, status) {
				
				var response = {
					success: status == google.maps.GeocoderStatus.OK ? true : false,
					status: status,
					results: results
				}
				
				callback(response);
			});
		}
		
		t.init();
		
		return t;
	}
	
	$.fn.MobileMap = function(options) {
		return new MobileMap($(this), options);
	}	
	
})(jQuery);