var MobileMap;
(function ($) {
    MobileMap = function (obj, options) {
        var n = $(obj);
        var t = {
            callback: {
                search: function (marker, lt, lg, circle, size) {},
                clearSearch: function () {},
                home: function () {},
                newMarker: function (marker, lt, lg) {},
            },
            db: new localStorageDB("MapIndex", localStorage),
            bounds: new google.maps.LatLngBounds(),
            editIndex: false,
            geocoder: new google.maps.Geocoder(),
            hasSearched: false,
            map: false,
            mapOptions: {
                zoom: 15,
                center: new google.maps.LatLng(0, 0),
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                scrollwheel: false
            },
            circles: [],
            markers: [],
            searchBounds: new google.maps.LatLngBounds(),
            ui: {
                map: n
            }
        };
        if (!options) {
            var options = {}
        };
        t = $.extend(true, t, options);
        t.init = function (lt) {
            if (lt) {
                t.mapOptions = $.extend(true, t.mapOptions, lt)
            };
            t.map = new google.maps.Map(t.ui.map.get(0), t.mapOptions);
            if (!t.db.tableExists('markers')) {
                t.db.createTable("markers", ["name", "address", "response", "street", "city", "state", "zipcode", "lat", "lng"]);
                t.db.commit()
            };
            t.db.query('markers', function (marker) {
                t.newMarker(marker.lat, marker.lng, marker.ID)
            });
            return t.map
        };
        t.home = function () {
            google.maps.event.trigger(t.map, 'resize');
            t.map.setZoom(t.mapOptions.zoom);
            t.map.fitBounds(t.bounds);
            t.callback.home()
        };
        t.addCircle = function (marker, lt, lg, circle) {
            if (!circle) {
                var circle = {
                    fillColor: 'blue',
                    fillOpacity: .2,
                    strokeColor: 'blue',
                    strokeOpacity: .4,
                    strokeWeight: 3
                }
            };
            if (typeof lg != "number") {
                lg = parseFloat(lg)
            };
            var size = 1609.34;
            circle = $.extend(true, circle, {
                center: new google.maps.LatLng(marker, lt),
                map: t.map,
                radius: lg * size,
            });
            var searched = new google.maps.Circle(circle);
            t.circles.push(searched);
            t.bounds.union(searched.getBounds());
            t.resetBounds();
            return searched
        };
        t.hideCircles = function () {
            $.each(t.circles, function (i, marker) {
                t.circles[i].setVisible(false)
            })
        };
        t.showCircles = function () {
            $.each(t.circles, function (i, marker) {
                t.circles[i].setVisible(true)
            })
        };
        t.showCircle = function (marker) {
            if (t.circles[marker]) {
                t.circles[marker].setVisible(false)
            }
        };
        t.clearSearch = function () {
            t.hasSearched = false;
            t.hideCircles();
            t.showMarkers();
            t.resetBounds();
            t.callback.clearSearch()
        };
        t.getMarkerById = function (lt) {
            var lg;
            $.each(t.markers, function (i, marker) {
                if (marker.id == lt) {
                    lg = marker
                }
            });
            return lg
        };
        t.search = function (g, h, j) {
            if (typeof j != "function") {
                j = function () {}
            };
            h = parseInt(h);
            if (isNaN(h)) {
                h = false
            };
            var k = [];
            t.hideCircles();
            t.geocode(g, function (lg) {
                if (lg.success) {
                    var circle = lg.results[0].geometry.location.lat();
                    var size = lg.results[0].geometry.location.lng();
                    var searched = t.addCircle(circle, size, h);
                    t.db.query('markers', function (marker) {
                        var lat = ((Math.acos(Math.sin(circle * Math.PI / 180) * Math.sin(marker.lat * Math.PI / 180) + Math.cos(circle * Math.PI / 180) * Math.cos(marker.lat * Math.PI / 180) * Math.cos((size - marker.lng) * Math.PI / 180)) * 180 / Math.PI) * 60 * 1.1515) * 1;
                        if (!h || h > lt) {
                            k.push(marker)
                        }
                    });
                    t.searchBounds = searched.getBounds();
                    t.map.fitBounds(t.searchBounds);
                    t.hideMarkers();
                    $.each(k, function (i, marker) {
                        var lt = t.getMarkerById(marker.ID);
                        if (!lt) {
                            console.log(lt)
                        };
                        if (lt) {
                            lt.setVisible(true)
                        }
                    });
                    t.callback.search(k, circle, size, h, searched);
                    t.hasSearched = true
                };
                j(k, lg)
            });
            return k
        };
        t.setBounds = function (marker) {
            t.map.fitBounds(marker);
            t.bounds = marker
        };
        t.hideMarkers = function () {
            $.each(t.markers, function (i, marker) {
                if (marker) {
                    marker.setVisible(false)
                }
            })
        };
        t.showMarkers = function () {
            $.each(t.markers, function (i, marker) {
                if (marker) {
                    marker.setVisible(true)
                }
            })
        };
        t.resetBounds = function (lt) {
            var lg = new google.maps.LatLngBounds();
            google.maps.event.trigger(t.map, 'resize');
            $.each(t.markers, function (i, marker) {
                if (marker && marker.getVisible()) {
                    lg.extend(marker.getPosition())
                }
            });
            if (lt) {
                $.each(t.circles, function (i, marker) {
                    if (marker.getVisible()) {
                        lg.union(marker.getBounds())
                    }
                })
            };
            if (!t.hasSearched) {
                t.bounds = lg;
                t.map.fitBounds(t.bounds)
            } else {
                t.map.fitBounds(t.searchBounds)
            };
            return lg
        };
        t.newMarker = function (marker, lt, lg) {
            var circle = new google.maps.LatLng(marker, lt);
            if (!lg) {
                var lg = false
            };
            marker = new google.maps.Marker({
                map: t.map,
                position: circle,
                id: lg
            });
            t.callback.newMarker(marker, marker, lt, t.markers.length);
            t.markers.push(marker);
            t.bounds.extend(circle);
            t.resetBounds();
            return marker
        };
        t.deleteMarker = function (lt) {
            var lg = t.markers[lt];
            if (!lg) {
                var circle = false
            } else {
                var circle = lg.id;
                lg.setVisible(false)
            }; if (circle) {
                t.db.deleteRows('markers', function (marker) {
                    if (marker.ID == circle) {
                        return true
                    }
                });
                t.db.commit()
            };
            t.markers[lt] = false;
            t.resetBounds();
            t.home()
        };
        t.updateMarker = function (marker, lt, lg) {
            marker.setPosition(new google.maps.LatLng(lt, lg))
        };
        t.editMarker = function (searched, g) {
            t.geocode(searched.address, function (lt) {
                if (lt.success) {
                    var lg = lt.results[0].geometry.location.lat();
                    var circle = lt.results[0].geometry.location.lng();
                    var size = t.hasLatLng(lg, circle);
                    t.updateMarker(t.markers[t.editIndex], lg, circle);
                    t.db.update("markers", {
                        ID: t.editIndex + 1
                    }, function () {
                        var marker = {
                            name: searched.name,
                            address: searched.address,
                            street: searched.street,
                            city: searched.city,
                            state: searched.state,
                            zipcode: searched.zipcode,
                            response: lt,
                            lat: lg,
                            lng: circle
                        };
                        return marker
                    });
                    t.db.commit();
                    if (typeof g == "function") {
                        g(lat, searched)
                    }
                } else {
                    alert('\'' + $.trim(searched.address) + '\' is an invalid location')
                }
            })
        };
        t.addMarker = function (g, h, i) {
            if (typeof h == "undefined") {
                var h = true
            };
            if (typeof h == "function") {
                i = h;
                h = true
            };
            t.geocode(g.address, function (marker) {
                if (marker.success) {
                    var lt = marker.results[0].geometry.location.lat();
                    var lg = marker.results[0].geometry.location.lng();
                    var circle = t.hasLatLng(lt, lg);
                    var size = false;
                    var searched = false;
                    if (h && circle == false) {
                        searched = t.db.insert("markers", {
                            name: g.name,
                            address: g.address,
                            street: g.street,
                            city: g.city,
                            state: g.state,
                            zipcode: g.zipcode,
                            response: marker,
                            lat: lt,
                            lng: lg
                        });
                        t.db.commit()
                    };
                    if (circle) {
                        alert('\'' + $.trim(g.address) + '\' is already a location on the map')
                    } else {
                        t.newMarker(lt, lg, searched);
                        if (typeof i == "function") {
                            i(marker, g, h)
                        }
                    }
                } else {
                    alert('\'' + $.trim(g.address) + '\' is an invalid location')
                }
            })
        };
        t.hasLatLng = function (lt, lg) {
            var circle = false;
            t.db.query('markers', function (marker) {
                if (marker.lat == lt && marker.lng == lg) {
                    circle = true
                }
            });
            return circle
        };
        t.geocode = function (circle, size) {
            if (typeof size != "function") {
                size = function () {}
            };
            t.geocoder.geocode({
                'address': circle
            }, function (marker, lt) {
                var lg = {
                    success: lt == google.maps.GeocoderStatus.OK ? true : false,
                    status: lt,
                    results: marker
                };
                size(lg)
            })
        };
        t.init();
        return t
    };
    $.fn.MobileMap = function (marker) {
        return new MobileMap($(this), marker)
    }
})(jQuery);