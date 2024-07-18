var text1 = "https://uedayou.net/loa/";
var text2 = $('#addr').val();
console.log(text2);
var text3 = text1 + text2;
console.log(text3);

var data = [
    { uri: "https://uedayou.net/loa/新潟県" },
];

var map = L.map('map').setView([39.211, 137.5458], 10); //新潟市の座標


var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors | <a href="https://uedayou.net/loa/">住所LOD</a>'
});
map.addLayer(tiles);

var group = L.featureGroup();

console.log("start loading.");
map.spin(true);

var req = [];
$.each(data, function (i, d) {
    if (d.uri.lastIndexOf('https://uedayou.net/loa/', 0) !== 0) {
        data[i].uri = 'https://uedayou.net/loa/' + d.uri;
    }
    req.push(loadPolygonFromLOAJ(d.uri, d));
});

$.when.apply($, req).done(function (data) {
    map.fitBounds(group.getBounds());
    console.log("finished loading.");
    map.spin(false);
});

function loadPolygonFromLOAJ(uri, option) {
    var url = uri.replace(/^http:/i, "https:");
    return $.ajax({
        url: url + ".json"
    }).done(function (json) {
        console.log(uri);
        //var json = json[uri];
        if (uri in json) {
            json = json[uri];
        } else {
            json = json[Object.keys(json)[0]];
        }
        if ("http://www.opengis.net/ont/geosparql#asWKT" in json); else return;
        var label = json["http://www.w3.org/2000/01/rdf-schema#label"][0]["value"];
        var wkt = json["http://www.opengis.net/ont/geosparql#asWKT"][0]["value"];
        var _geoArray = new Array();
        var _o = new Object();
        _o["type"] = "Feature";
        wicket = new Wkt.Wkt();
        wicket.read(wkt);
        var obj = wicket.toJson();
        _o["geometry"] = obj;
        // _o["properties"] = { "name": label };
        var importance = [];
        if (obj.type == "MultiPolygon") {
            var mx = 0;
            $.each(obj.coordinates, function (i, _d) {
                var area = polygonArea(_d[0], _d[0].length);
                if (mx < area) {
                    importance = _d[0];
                    mx = area;
                }
            });
        }
        else importance = obj.coordinates[0];
        _o["internal"] = { "center": getCentroid2(importance) };
        _geoArray[0] = _o;

        group.addLayer(L.geoJson(_o));

        // tooltip
        var TooltipMarker = '';
        var d3Layer = L.d3SvgOverlay(function (sel, proj) {
            var upd = sel.selectAll('path').data(_geoArray);
            upd.enter()
                .append('path')
                .attr('d', proj.pathFromGeojson)
                .attr('stroke', 'black')
                // .attr('fill', function () { return d3.hsl(Math.random() * 360, 0.9, 0.5) })
                .attr('fill-opacity', '0');
            upd.attr('stroke-width', 2 / proj.scale);
            upd.on('mouseover', function (d) {
                var Lati = d.internal.center[1];
                var Longi = d.internal.center[0];

                if (!isFinite(Lati) || !isFinite(Longi)) return;

                var markerIcon = L.icon({
                    iconUrl: 'Empty_Icon.png',
                    iconSize: [38, 95],
                    shadowSize: [50, 64],
                    iconAnchor: [Lati, Longi],
                });

                TooltipMarker = new L.Marker([Lati, Longi], {
                    icon: markerIcon
                });
                map.addLayer(TooltipMarker);

                var out = [];
                for (var key in d.properties) {
                    out.push("<strong>" + key + "</strong>: " + d.properties[key]);
                }
                TooltipMarker.bindPopup(out.join("<br/>"));
                TooltipMarker.openPopup();
            })
                .on('mouseout', function (d) {
                    if (TooltipMarker != '') map.removeLayer(TooltipMarker);
                });
        });
        //

        map.addLayer(d3Layer);
    });
}

var getCentroid2 = function (arr) {
    var twoTimesSignedArea = 0;
    var cxTimes6SignedArea = 0;
    var cyTimes6SignedArea = 0;

    var length = arr.length

    var x = function (i) { return parseFloat(arr[i % length][0]) };
    var y = function (i) { return parseFloat(arr[i % length][1]) };

    for (var i = 0; i < arr.length; i++) {
        var twoSA = x(i) * y(i + 1) - x(i + 1) * y(i);
        twoTimesSignedArea += twoSA;
        cxTimes6SignedArea += (x(i) + x(i + 1)) * twoSA;
        cyTimes6SignedArea += (y(i) + y(i + 1)) * twoSA;
    }
    var sixSignedArea = 3 * twoTimesSignedArea;
    return [cxTimes6SignedArea / sixSignedArea, cyTimes6SignedArea / sixSignedArea];
}

function polygonArea(coord, numPoints) {
    area = 0;
    j = numPoints - 1;
    for (i = 0; i < numPoints; i++) {
        area = area + (coord[j][0] + coord[i][0]) * (coord[j][1] - coord[i][1]);
        j = i;
    }
    return Math.abs(area / 2);
}

// console.log(document.ByClassName("leaflet-overlay-pane"));

// function resetButton() {
//     map.remove();
// }