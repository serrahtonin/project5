var MobileMap;
(function ($) {
    MobileMap = function (l, m) {
        var n = $(l);
        var t = {
            callback: {
                search: function (a, b, c, d, e) {},
                clearSearch: function () {},
                home: function () {},
                newMarker: function (a, b, c) {},
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
        if (!m) {
            var m = {}
        };
        t = $.extend(true, t, m);
        t.init = function (b) {
            if (b) {
                t.mapOptions = $.extend(true, t.mapOptions, b)
            };
            t.map = new google.maps.Map(t.ui.map.get(0), t.mapOptions);
            if (!t.db.tableExists('markers')) {
                t.db.createTable("markers", ["name", "address", "response", "street", "city", "state", "zipcode", "lat", "lng"]);
                t.db.commit()
            };
            t.db.query('markers', function (a) {
                t.newMarker(a.lat, a.lng, a.ID)
            });
            return t.map
        };
        t.home = function () {
            google.maps.event.trigger(t.map, 'resize');
            t.map.setZoom(t.mapOptions.zoom);
            t.map.fitBounds(t.bounds);
            t.callback.home()
        };
        t.addCircle = function (a, b, c, d) {
            if (!d) {
                var d = {
                    fillColor: 'blue',
                    fillOpacity: .2,
                    strokeColor: 'blue',
                    strokeOpacity: .4,
                    strokeWeight: 3
                }
            };
            if (typeof c != "number") {
                c = parseFloat(c)
            };
            var e = 1609.34;
            d = $.extend(true, d, {
                center: new google.maps.LatLng(a, b),
                map: t.map,
                radius: c * e,
            });
            var f = new google.maps.Circle(d);
            t.circles.push(f);
            t.bounds.union(f.getBounds());
            t.resetBounds();
            return f
        };
        t.hideCircles = function () {
            $.each(t.circles, function (i, a) {
                t.circles[i].setVisible(false)
            })
        };
        t.showCircles = function () {
            $.each(t.circles, function (i, a) {
                t.circles[i].setVisible(true)
            })
        };
        t.showCircle = function (a) {
            if (t.circles[a]) {
                t.circles[a].setVisible(false)
            }
        };
        t.clearSearch = function () {
            t.hasSearched = false;
            t.hideCircles();
            t.showMarkers();
            t.resetBounds();
            t.callback.clearSearch()
        };
        t.getMarkerById = function (b) {
            var c;
            $.each(t.markers, function (i, a) {
                if (a.id == b) {
                    c = a
                }
            });
            return c
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
            t.geocode(g, function (c) {
                if (c.success) {
                    var d = c.results[0].geometry.location.lat();
                    var e = c.results[0].geometry.location.lng();
                    var f = t.addCircle(d, e, h);
                    t.db.query('markers', function (a) {
                        var b = ((Math.acos(Math.sin(d * Math.PI / 180) * Math.sin(a.lat * Math.PI / 180) + Math.cos(d * Math.PI / 180) * Math.cos(a.lat * Math.PI / 180) * Math.cos((e - a.lng) * Math.PI / 180)) * 180 / Math.PI) * 60 * 1.1515) * 1;
                        if (!h || h > b) {
                            k.push(a)
                        }
                    });
                    t.searchBounds = f.getBounds();
                    t.map.fitBounds(t.searchBounds);
                    t.hideMarkers();
                    $.each(k, function (i, a) {
                        var b = t.getMarkerById(a.ID);
                        if (!b) {
                            console.log(b)
                        };
                        if (b) {
                            b.setVisible(true)
                        }
                    });
                    t.callback.search(k, d, e, h, f);
                    t.hasSearched = true
                };
                j(k, c)
            });
            return k
        };
        t.setBounds = function (a) {
            t.map.fitBounds(a);
            t.bounds = a
        };
        t.hideMarkers = function () {
            $.each(t.markers, function (i, a) {
                if (a) {
                    a.setVisible(false)
                }
            })
        };
        t.showMarkers = function () {
            $.each(t.markers, function (i, a) {
                if (a) {
                    a.setVisible(true)
                }
            })
        };
        t.resetBounds = function (b) {
            var c = new google.maps.LatLngBounds();
            google.maps.event.trigger(t.map, 'resize');
            $.each(t.markers, function (i, a) {
                if (a && a.getVisible()) {
                    c.extend(a.getPosition())
                }
            });
            if (b) {
                $.each(t.circles, function (i, a) {
                    if (a.getVisible()) {
                        c.union(a.getBounds())
                    }
                })
            };
            if (!t.hasSearched) {
                t.bounds = c;
                t.map.fitBounds(t.bounds)
            } else {
                t.map.fitBounds(t.searchBounds)
            };
            return c
        };
        t.newMarker = function (a, b, c) {
            var d = new google.maps.LatLng(a, b);
            if (!c) {
                var c = false
            };
            marker = new google.maps.Marker({
                map: t.map,
                position: d,
                id: c
            });
            t.callback.newMarker(marker, a, b, t.markers.length);
            t.markers.push(marker);
            t.bounds.extend(d);
            t.resetBounds();
            return marker
        };
        t.deleteMarker = function (b) {
            var c = t.markers[b];
            if (!c) {
                var d = false
            } else {
                var d = c.id;
                c.setVisible(false)
            }; if (d) {
                t.db.deleteRows('markers', function (a) {
                    if (a.ID == d) {
                        return true
                    }
                });
                t.db.commit()
            };
            t.markers[b] = false;
            t.resetBounds();
            t.home()
        };
        t.updateMarker = function (a, b, c) {
            a.setPosition(new google.maps.LatLng(b, c))
        };
        t.editMarker = function (f, g) {
            t.geocode(f.address, function (b) {
                if (b.success) {
                    var c = b.results[0].geometry.location.lat();
                    var d = b.results[0].geometry.location.lng();
                    var e = t.hasLatLng(c, d);
                    t.updateMarker(t.markers[t.editIndex], c, d);
                    t.db.update("markers", {
                        ID: t.editIndex + 1
                    }, function () {
                        var a = {
                            name: f.name,
                            address: f.address,
                            street: f.street,
                            city: f.city,
                            state: f.state,
                            zipcode: f.zipcode,
                            response: b,
                            lat: c,
                            lng: d
                        };
                        return a
                    });
                    t.db.commit();
                    if (typeof g == "function") {
                        g(b, f)
                    }
                } else {
                    alert('\'' + $.trim(f.address) + '\' is an invalid location')
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
            t.geocode(g.address, function (a) {
                if (a.success) {
                    var b = a.results[0].geometry.location.lat();
                    var c = a.results[0].geometry.location.lng();
                    var d = t.hasLatLng(b, c);
                    var e = false;
                    var f = false;
                    if (h && d == false) {
                        f = t.db.insert("markers", {
                            name: g.name,
                            address: g.address,
                            street: g.street,
                            city: g.city,
                            state: g.state,
                            zipcode: g.zipcode,
                            response: a,
                            lat: b,
                            lng: c
                        });
                        t.db.commit()
                    };
                    if (d) {
                        alert('\'' + $.trim(g.address) + '\' is already a location on the map')
                    } else {
                        t.newMarker(b, c, f);
                        if (typeof i == "function") {
                            i(a, g, h)
                        }
                    }
                } else {
                    alert('\'' + $.trim(g.address) + '\' is an invalid location')
                }
            })
        };
        t.hasLatLng = function (b, c) {
            var d = false;
            t.db.query('markers', function (a) {
                if (a.lat == b && a.lng == c) {
                    d = true
                }
            });
            return d
        };
        t.geocode = function (d, e) {
            if (typeof e != "function") {
                e = function () {}
            };
            t.geocoder.geocode({
                'address': d
            }, function (a, b) {
                var c = {
                    success: b == google.maps.GeocoderStatus.OK ? true : false,
                    status: b,
                    results: a
                };
                e(c)
            })
        };
        t.init();
        return t
    };
    $.fn.MobileMap = function (a) {
        return new MobileMap($(this), a)
    }
})(jQuery);