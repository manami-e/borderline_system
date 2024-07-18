window.onload = function () {

    var text1 = "https://uedayou.net/loa/";
    var text2 = $('#addr').val();
    console.log(text2);
    var text3 = text1 + text2;
    console.log(text3);

    var text4 = $('#opacity_input').val();
    console.log(text4);

    var data = [
        { uri: "https://uedayou.net/loa/新潟県" },
    ];

    var map = L.map('view_map', {
        scrollWheelZoom: false, // disable original zoom function
        smoothWheelZoom: true,  // enable smooth zoom 
        smoothSensitivity: 1,   // zoom speed. default is 1
    }).setView([39.211, 137.5458], 10);//新潟

    //(1)スケールコントロールを最大幅200px、右下、m単位で地図に追加
    L.control.scale({ maxWidth: 200, position: 'bottomleft', imperial: false }).addTo(map);

    var gsiattr = "<a href='http://portal.cyberjapan.jp/help/termsofuse.html' target='_blank'>地理院タイル</a>";
    var gsi = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', { opacity: text4 / 100, attribution: "<a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors" });
    var gsipale = L.tileLayer('http://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', { opacity: text4 / 100, attribution: "<a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors" });
    var osm = L.tileLayer('http://tile.openstreetmap.jp/{z}/{x}/{y}.png',
        { opacity: text4 / 100, attribution: "<a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors" });
    var baseMaps = {
        "地理院地図": gsi,
        "淡色地図": gsipale,
        "オープンストリートマップ": osm
    };
    L.control.layers(baseMaps).addTo(map);
    // (3)デフォルトで表示する地図の指定
    osm.addTo(map);

    var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        opacity: 0,
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

            var stroke = document.getElementById("line_width");

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
                upd.attr('stroke-width', stroke.value);
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
                    // TooltipMarker.bindPopup(out.join("<br/>"));
                    // TooltipMarker.openPopup();
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

    var popup = L.popup();
    map.on('click', onMapClick);

    $("#resetButton").on('click', function () {
        if (map) {
            map.remove();
            map = null;
        }
    });

    $("#serchButton").on('click', function () {
        // function searchButton() {
        // map.remove();
        if (!map) {
            text3 = 0;
            text1 = "https://uedayou.net/loa/";
            text2 = $('#addr').val();
            console.log(text2);
            text3 = text1 + text2;
            console.log(text3);

            text4 = $('#opacity_input').val();
            console.log(text4);

            data = [
                { uri: text3 },
            ];

            // var map = 0;
            // map = L.map('view_map'); //ここが原因でリセット必要、ここなくすと上書き、ドラッグもできる

            map = L.map('view_map', {
                scrollWheelZoom: false, // disable original zoom function
                smoothWheelZoom: true,  // enable smooth zoom 
                smoothSensitivity: 1,   // zoom speed. default is 1
            });

            L.control.scale({ maxWidth: 200, position: 'bottomright', imperial: false }).addTo(map);
            //(2)ズームコントロールを左下で地図に追加
            // L.control.zoom({ position: 'bottomleft' }).addTo(map);

            var gsiattr = "<a href='http://portal.cyberjapan.jp/help/termsofuse.html' target='_blank'>地理院タイル</a>";
            var gsi = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', { opacity: text4 / 100, attribution: "<a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors" });
            var gsipale = L.tileLayer('http://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', { opacity: text4 / 100, attribution: "<a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors" });
            var osm = L.tileLayer('http://tile.openstreetmap.jp/{z}/{x}/{y}.png',
                { opacity: text4 / 100, attribution: "<a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors" });
            var baseMaps = {
                "地理院地図": gsi,
                "淡色地図": gsipale,
                "オープンストリートマップ": osm
            };
            L.control.layers(baseMaps).addTo(map);
            // (3)デフォルトで表示する地図の指定
            osm.addTo(map);

            var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                opacity: 0,
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

                    var stroke = document.getElementById("line_width");

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
                        upd.attr('stroke-width', stroke.value);
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
                            // TooltipMarker.bindPopup(out.join("<br/>"));
                            // TooltipMarker.openPopup();
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
        }
        var popup = L.popup();
        map.on('click', onMapClick);
    });

    function onMapClick(e) {
        //地図のclickイベント呼び出される
        //クリック地点の座標にマーカーを追加、マーカーのclickイベントでonMarkerClick関数を呼び出し
        // var mk = L.marker(e.latlng).on('click', onMarkerClick).addTo(map);
        const robotamaIcon = L.icon({
            iconUrl: ['en7.png'], // 画像ファイルパス
            iconSize: [20, 20]  // アイコンサイズ
        });
        L.marker((e.latlng),
            // [51.5, -0.09],
            { icon: robotamaIcon }  // ここで、OriginalアイコンをSetする🔥
        )
            .on('click', onMarkerClick)
            .addTo(map)
    }
    function onMarkerClick(e) {
        //マーカーのclickイベント呼び出される
        //クリックされたマーカーを地図のレイヤから削除する
        map.removeLayer(e.target);
    }

    var parent = document.getElementById("view_map");
    console.log(parent);

    var child1 = parent.getElementsByClassName('leaflet-map-pane')[0];
    var child2 = child1.getElementsByClassName('leaflet-objects-pane')[0];
    console.log(child2);
    var child3 = child2.getElementsByClassName('leaflet-overlay-pane')[0];
    console.log(child3);

    var child4 = child3.children;
    console.log(child4);
    let len = child4.length;
    console.log(len); //0
    let element = child4.item(0);
    console.log(element);

    Array.from(child4).forEach(function (child5) {
        console.log(child5);
    });

    // console.log($("#view-map").class());

}

$(function () {
    //印刷ボタンをクリックした時の処理
    $('.print-btn').on('click', function () {

        //プリントしたいエリアの取得
        var printArea = document.getElementsByClassName("print-area");

        //プリント用の要素「#print」を作成し、上で取得したprintAreaをその子要素に入れる。
        $('body').append('<div id="print" class="printBc"></div>');
        $(printArea).clone().appendTo('#print');

        //この下に、以降の処理が入ります。
        $('body > :not(#print)').addClass('print-off');

        window.print();

        $('#print').remove();
        $('.print-off').removeClass('print-off');

    });
});

