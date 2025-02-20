import $ from 'jquery'
import * as d3 from 'd3'
import F_ from '../Formulae_/Formulae_'
import L_ from '../Layers_/Layers_'
import Viewer_ from '../Viewer_/Viewer_'
import Globe_ from '../Globe_/Globe_'
import ToolController_ from '../ToolController_/ToolController_'
import CursorInfo from '../../Ancillary/CursorInfo'
import Description from '../../Ancillary/Description'
import QueryURL from '../../Ancillary/QueryURL'
import Kinds from '../../Tools/Kinds/Kinds'
import DataShaders from '../../Ancillary/DataShaders'
import calls from '../../../pre/calls'
let L = window.L

let essenceFina = function () {}

let Map_ = {
    //Our main leaflet map variable
    map: null,
    toolbar: null,
    tempOverlayImage: null,
    activeLayer: null,
    allLayersLoadedPassed: false,
    player: { arrow: null, lookat: null },
    //Initialize a map based on a config file
    init: function (essenceFinal) {
        essenceFina = essenceFinal

        //Repair Leaflet and plugin incongruities
        L.DomEvent._fakeStop = L.DomEvent.fakeStop

        //var fakeStop = L.DomEvent.fakeStop || L.DomEvent._fakeStop || stop;?
        /*
            var xhr = new XMLHttpRequest();
            try {
              xhr.open("GET", 'Missions/MTTT/Layers/TEMP/M2020_EDL_bufpoints_3m_geo/12/2929/1834.pbf');
              xhr.responseType = "arraybuffer";
              xhr.onerror = function() {
                console.log("Network error")
              };
              xhr.onload = function() {
                if (xhr.status === 200) {
                    var data = new Pbf(new Uint8Array(xhr.response)).readFields(readData, {});

                    console.log( data )

                    function readData(tag, data, pbf) {
                        if (tag === 1) data.name = pbf.readString();
                        else if (tag === 2) data.version = pbf.readVarint();
                        //else if (tag === 3) data.layer = pbf.readMessage(readLayer, {});
                    }
                    function readLayer(tag, layer, pbf) {
                        if (tag === 1) layer.name = pbf.readString();
                        else if (tag === 3) layer.size = pbf.readVarint();
                    }
                }
                else console.log(xhr.statusText);
                
              };
              xhr.send();
            } catch (err) {
              console.log(err.message)
            }
            */

        var hasZoomControl = false
        if (L_.configData.look && L_.configData.look.zoomcontrol)
            hasZoomControl = true

        Map_.mapScaleZoom = L_.configData.msv.mapscale || null

        if (this.map != null) this.map.remove()

        let shouldFade = true
        if (L_.hasTool('viewshed')) shouldFade = false

        if (
            L_.configData.projection &&
            L_.configData.projection.custom == true
        ) {
            var cp = L_.configData.projection
            //console.log(cp)
            var crs = new L.Proj.CRS(
                Number.isFinite(parseInt(cp.epsg[0]))
                    ? `EPSG:${cp.epsg}`
                    : cp.epsg,
                cp.proj,
                {
                    origin: [
                        parseFloat(cp.origin[0]),
                        parseFloat(cp.origin[1]),
                    ],
                    resolutions: cp.res,
                    bounds: L.bounds(
                        [parseFloat(cp.bounds[0]), parseFloat(cp.bounds[1])],
                        [parseFloat(cp.bounds[2]), parseFloat(cp.bounds[3])]
                    ),
                },
                parseFloat(L_.configData.msv.radius.major)
            )

            this.map = L.map('map', {
                zoomControl: hasZoomControl,
                editable: true,
                crs: crs,
                zoomDelta: 0.05,
                zoomSnap: 0,
                fadeAnimation: shouldFade,
                //wheelPxPerZoomLevel: 500,
            })

            window.mmgisglobal.customCRS = crs
        } else {
            /*
                //Set up leaflet for planet radius only
                var r = parseInt(L_.configData.msv.radius.major)
                var rFactor = r / 6378137
   
                var get_resolution = function() {
                    level = 30
                    var res = []
                    res[0] = (Math.PI * 2 * r) / 256
                    for (var i = 1; i < level; i++) {
                        res[i] = (Math.PI * 2 * r) / 256 / Math.pow(2, i)
                    }
                    return res
                }
                var crs = new L.Proj.CRS(
                    'EPSG:3857',
                    '+proj=merc +a=' +
                        r +
                        ' +b=' +
                        r +
                        ' +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs',
                    {
                        resolutions: get_resolution(),
                        origin: [
                            (-Math.PI * 2 * r) / 2.0,
                            (Math.PI * 2 * r) / 2.0,
                        ],
                        bounds: L.bounds(
                            [
                                -20037508.342789244 * rFactor,
                                20037508.342789244 * rFactor,
                            ],
                            [
                                20037508.342789244 * rFactor,
                                -20037508.342789244 * rFactor,
                            ]
                        ),
                    }
                )
                */

            //Make the empty map and turn off zoom controls
            this.map = L.map('map', {
                zoomControl: hasZoomControl,
                editable: true,
                fadeAnimation: shouldFade,
                //crs: crs,
                //zoomDelta: 0.05,
                //zoomSnap: 0,
                //wheelPxPerZoomLevel: 500,
            })
        }
        if (this.map.zoomControl) this.map.zoomControl.setPosition('topright')

        if (Map_.mapScaleZoom) {
            L.control
                .scalefactor({
                    radius: parseInt(L_.configData.msv.radius.major),
                    mapScaleZoom: Map_.mapScaleZoom,
                })
                .addTo(this.map)
        }

        //Initialize the view to that set in config
        if (L_.FUTURES.mapView != null) {
            this.resetView(L_.FUTURES.mapView)
        } else {
            this.resetView(L_.view)
        }
        //Remove attribution
        d3.select('.leaflet-control-attribution').remove()

        //Make our layers
        makeLayers(L_.layersData)

        //Just in case we have no layers
        allLayersLoaded()

        //Add a graticule
        if (L_.configData.look && L_.configData.look.graticule == true) {
            L.latlngGraticule({
                showLabel: true,
                color: '#bbb',
                weight: 1,
                zoomInterval: [
                    { start: 2, end: 3, interval: 40 },
                    { start: 4, end: 5, interval: 20 },
                    { start: 6, end: 7, interval: 10 },
                    { start: 8, end: 9, interval: 5 },
                    { start: 10, end: 11, interval: 0.4 },
                    { start: 12, end: 13, interval: 0.2 },
                    { start: 14, end: 15, interval: 0.1 },
                    { start: 16, end: 17, interval: 0.01 },
                    { start: 18, end: 19, interval: 0.005 },
                    { start: 20, end: 21, interval: 0.0025 },
                    { start: 21, end: 30, interval: 0.00125 },
                ],
            }).addTo(Map_.map)
        }

        //When done zooming, hide the things you're too far out to see/reveal the things you're close enough to see
        this.map.on('zoomend', function () {
            enforceVisibilityCutoffs()
        })

        Map_.map.on('move', function (e) {
            if (L_.mapAndGlobeLinked || window.mmgisglobal.ctrlDown) {
                if (L_.Globe_ != null) {
                    var c = Map_.map.getCenter()
                    L_.Globe_.setCenter([c.lat, c.lng])
                }
            }
        })
        Map_.map.on('mousemove', function (e) {
            if (L_.mapAndGlobeLinked || window.mmgisglobal.ctrlDown) {
                if (L_.Globe_ != null) L_.Globe_.setLink(e.latlng)
            }
        })
        Map_.map.on('mouseout', function (e) {
            if (L_.Globe_ != null) L_.Globe_.setLink('off')
        })

        //Build the toolbar
        buildToolBar()
    },
    clear: function () {
        this.map.eachLayer(function (layer) {
            Map_.map.removeLayer(layer)
        })

        this.toolbar = null
        this.tempOverlayImage = null
        this.activeLayer = null
        this.allLayersLoadedPassed = false
        this.player = { arrow: null, lookat: null }
    },
    setZoomToMapScale() {
        this.map.setZoom(this.mapScaleZoom)
    },
    //Focuses the map on [lat, lon, zoom]
    resetView: function (latlonzoom, stopNextMove) {
        //Uses Leaflet's setView
        var lat = parseFloat(latlonzoom[0])
        if (isNaN(lat)) lat = 0
        var lon = parseFloat(latlonzoom[1])
        if (isNaN(lon)) lon = 0
        var zoom = parseInt(latlonzoom[2])
        if (isNaN(zoom)) zoom = this.map.getZoom()
        this.map.setView([lat, lon], zoom)
        this.map.invalidateSize()
    },
    //returns true if the map has the layer
    hasLayer: function (layername) {
        if (L_.layersGroup[layername]) {
            return Map_.map.hasLayer(L_.layersGroup[layername])
        }
        return false
    },
    //adds a temp tile layer to the map
    tempTileLayer: null,
    changeTempTileLayer: function (url) {
        this.removeTempTileLayer()
        this.tempTileLayer = L.tileLayer(url, {
            minZoom: 0,
            maxZoom: 25,
            maxNativeZoom: 25,
            tms: true, //!!!
            noWrap: true,
            continuousWorld: true,
            reuseTiles: true,
        }).addTo(this.map)
    },
    //removes that layer
    removeTempTileLayer: function () {
        this.rmNotNull(this.tempTileLayer)
    },
    //Removes the map layer if it isnt null
    rmNotNull: function (layer) {
        if (layer != null) {
            this.map.removeLayer(layer)
            layer = null
        }
    },
    //Redraws all layers, starting with the bottom one
    orderedBringToFront: function () {
        var hasIndex = []
        for (var i = L_.layersOrdered.length - 1; i >= 0; i--) {
            if (Map_.hasLayer(L_.layersOrdered[i])) {
                if (
                    L_.layersNamed[L_.layersOrdered[i]] &&
                    L_.layersNamed[L_.layersOrdered[i]].type == 'vector'
                ) {
                    Map_.map.removeLayer(L_.layersGroup[L_.layersOrdered[i]])
                    hasIndex.push(i)
                }
            }
        }
        for (var i = 0; i < hasIndex.length; i++) {
            Map_.map.addLayer(L_.layersGroup[L_.layersOrdered[hasIndex[i]]])
        }
    },
    setPlayerArrow(lng, lat, rot) {
        var playerMapArrowOffsets = [
            [0.06, 0],
            [-0.04, 0.04],
            [-0.02, 0],
            [-0.04, -0.04],
        ]
        var playerMapArrowPolygon = []

        if (Map_.map.hasLayer(Map_.player.arrow))
            Map_.map.removeLayer(Map_.player.arrow)
        var scalar = 512 / Math.pow(2, Map_.map.getZoom())
        var rotatedOffsets
        for (var i = 0; i < playerMapArrowOffsets.length; i++) {
            rotatedOffsets = F_.rotatePoint(
                {
                    x: playerMapArrowOffsets[i][0],
                    y: playerMapArrowOffsets[i][1],
                },
                [0, 0],
                -rot
            )
            playerMapArrowPolygon.push([
                lat + scalar * rotatedOffsets.x,
                lng + scalar * rotatedOffsets.y,
            ])
        }
        Map_.player.arrow = L.polygon(playerMapArrowPolygon, {
            color: 'lime',
            opacity: 1,
            lineJoin: 'miter',
            weight: 2,
        }).addTo(Map_.map)
    },
    setPlayerLookat(lng, lat) {
        if (Map_.map.hasLayer(Map_.player.lookat))
            Map_.map.removeLayer(Map_.player.lookat)
        if (lat && lng) {
            Map_.player.lookat = new L.circleMarker([lat, lng], {
                fillColor: 'lime',
                fillOpacity: 0.75,
                color: 'lime',
                opacity: 1,
                weight: 2,
            })
                .setRadius(5)
                .addTo(Map_.map)
        }
    },
    hidePlayer(hideArrow, hideLookat) {
        if (hideArrow !== false && Map_.map.hasLayer(Map_.player.arrow))
            Map_.map.removeLayer(Map_.player.arrow)
        if (hideLookat !== false && Map_.map.hasLayer(Map_.player.lookat))
            Map_.map.removeLayer(Map_.player.lookat)
    },
    getScreenDiagonalInMeters() {
        let bb = document.getElementById('map').getBoundingClientRect()
        let nwLatLng = Map_.map.containerPointToLatLng([0, 0])
        let seLatLng = Map_.map.containerPointToLatLng([bb.width, bb.height])
        return F_.lngLatDistBetween(
            nwLatLng.lng,
            nwLatLng.lat,
            seLatLng.lng,
            seLatLng.lat
        )
    },
}

//Specific internal functions likely only to be used once
function getLayersChosenNamePropVal(feature, layer) {
    //These are what you'd think they'd be (Name could be thought of as key)
    var propertyName, propertyValue
    var foundThroughVariables = false
    if (
        layer.hasOwnProperty('options') &&
        layer.options.hasOwnProperty('layerName')
    ) {
        var l = L_.layersNamed[layer.options.layerName]
        if (
            l.hasOwnProperty('variables') &&
            l.variables.hasOwnProperty('useKeyAsName')
        ) {
            propertyName = l.variables['useKeyAsName']
            if (feature.properties.hasOwnProperty(propertyName)) {
                propertyValue = feature.properties[propertyName]
                foundThroughVariables = true
            }
        }
    }
    if (!foundThroughVariables) {
        for (var key in feature.properties) {
            //Store the current feature's key
            propertyName = key
            //Be certain we have that key in the feature
            if (feature.properties.hasOwnProperty(key)) {
                //Store the current feature's value
                propertyValue = feature.properties[key]
                //Break out of for loop since we're done
                break
            }
        }
    }
    return { name: propertyName, value: propertyValue }
}

//Takes an array of layer objects and makes them map layers
function makeLayers(layersObj) {
    //Make each layer (backwards to maintain draw order)
    for (var i = layersObj.length - 1; i >= 0; i--) {
        makeLayer(layersObj[i])
    }
}
//Takes the layer object and makes it a map layer
function makeLayer(layerObj) {
    //Decide what kind of layer it is
    //Headers do not need to be made
    if (layerObj.type != 'header') {
        //Simply call the appropriate function for each layer type
        switch (layerObj.type) {
            case 'vector':
                makeVectorLayer()
                break
            case 'point':
                makeVectorLayer() //makePointLayer(); //DEATH TO POINT
                break
            case 'tile':
                makeTileLayer()
                break
            case 'vectortile':
                makeVectorTileLayer()
                break
            case 'data':
                makeDataLayer()
                break
            case 'model':
                //Globe only
                break
            default:
                console.warn('Unknown layer type: ' + layerObj.type)
        }
    }

    //Default is onclick show full properties and onhover show 1st property
    Map_.onEachFeatureDefault = onEachFeatureDefault
    function onEachFeatureDefault(feature, layer) {
        var pv = getLayersChosenNamePropVal(feature, layer)

        layer['useKeyAsName'] = pv.name
        if (
            layer.hasOwnProperty('options') &&
            layer.options.hasOwnProperty('layerName')
        ) {
            L_.layersNamed[layer.options.layerName].useKeyAsName = pv.name
        }

        if (
            pv.hasOwnProperty('name') &&
            pv.name != null &&
            typeof pv.name === 'string'
        ) {
            var propertyName = pv.name.capitalizeFirstLetter()
            var propertyValue = pv.value

            //Add a mouseover event to the layer
            layer.on('mouseover', function () {
                //Make it turn on CursorInfo and show name and value
                CursorInfo.update(
                    propertyName + ': ' + propertyValue,
                    null,
                    false
                )
            })
            //Add a mouseout event
            layer.on('mouseout', function () {
                //Make it turn off CursorInfo
                CursorInfo.hide()
            })
        }

        if (
            !(
                feature.style &&
                feature.style.hasOwnProperty('noclick') &&
                feature.style.noclick
            )
        ) {
            //Add a click event to send the data to the info tab
            layer.on('click', function (e) {
                if (
                    ToolController_.activeTool &&
                    ToolController_.activeTool.disableLayerInteractions === true
                )
                    return

                //Query dataset links if possible and add that data to the feature's properties
                if (
                    layer.options.layerName &&
                    L_.layersNamed[layer.options.layerName] &&
                    L_.layersNamed[layer.options.layerName].variables &&
                    L_.layersNamed[layer.options.layerName].variables
                        .datasetLinks
                ) {
                    const dl =
                        L_.layersNamed[layer.options.layerName].variables
                            .datasetLinks
                    let dlFilled = dl
                    for (let i = 0; i < dlFilled.length; i++) {
                        dlFilled[i].search = F_.getIn(
                            layer.feature.properties,
                            dlFilled[i].prop.split('.')
                        )
                    }

                    calls.api(
                        'datasets_get',
                        {
                            queries: JSON.stringify(dlFilled),
                        },
                        function (data) {
                            const d = data.body
                            for (let i = 0; i < d.length; i++) {
                                if (d[i].type == 'images') {
                                    layer.feature.properties.images =
                                        layer.feature.properties.images || []
                                    for (
                                        let j = 0;
                                        j < d[i].results.length;
                                        j++
                                    ) {
                                        layer.feature.properties.images.push(
                                            d[i].results[j]
                                        )
                                    }
                                    //remove duplicates
                                    layer.feature.properties.images = F_.removeDuplicatesInArrayOfObjects(
                                        layer.feature.properties.images
                                    )
                                } else {
                                    layer.feature.properties._data =
                                        d[i].results
                                }
                            }
                            keepGoing()
                        },
                        function (data) {
                            keepGoing()
                        }
                    )
                } else {
                    keepGoing()
                }

                function keepGoing() {
                    L_.setLastActivePoint(layer)
                    L_.resetLayerFills()
                    L_.highlight(layer)
                    Map_.activeLayer = layer
                    Description.updatePoint(Map_.activeLayer)

                    //View images
                    var propImages = propertiesToImages(
                        feature.properties,
                        layer.options.metadata
                            ? layer.options.metadata.base_url || ''
                            : ''
                    )

                    Kinds.use(
                        L_.layersNamed[layerObj.name].kind,
                        Map_,
                        feature,
                        layer,
                        layer.options.layerName,
                        propImages,
                        e
                    )

                    Globe_.highlight(
                        Globe_.findSpriteObject(
                            layer.options.layerName,
                            layer.feature.properties[layer.useKeyAsName]
                        ),
                        false
                    )
                    Viewer_.highlight(layer)

                    //update url
                    if (layer != null && layer.hasOwnProperty('options')) {
                        var keyAsName
                        if (layer.hasOwnProperty('useKeyAsName')) {
                            keyAsName =
                                layer.feature.properties[layer.useKeyAsName]
                        } else {
                            keyAsName = layer.feature.properties[0]
                        }
                    }

                    Viewer_.changeImages(propImages, feature)
                    for (var i in propImages) {
                        if (propImages[i].type == 'radargram') {
                            //Globe_.radargram( layer.options.layerName, feature.geometry, propImages[i].url, propImages[i].length, propImages[i].depth );
                            break
                        }
                    }

                    //figure out how to construct searchStr in URL. For example: a ChemCam target can sometime
                    //be searched by "target sol", or it can be searched by "sol target" depending on config file.
                    var searchToolVars = L_.getToolVars('search', true)
                    var searchfields = {}
                    if (searchToolVars.hasOwnProperty('searchfields')) {
                        for (var layerfield in searchToolVars.searchfields) {
                            var fieldString =
                                searchToolVars.searchfields[layerfield]
                            fieldString = fieldString.split(')')
                            for (var i = 0; i < fieldString.length; i++) {
                                fieldString[i] = fieldString[i].split('(')
                                var li = fieldString[i][0].lastIndexOf(' ')
                                if (li != -1) {
                                    fieldString[i][0] = fieldString[
                                        i
                                    ][0].substring(li + 1)
                                }
                            }
                            fieldString.pop()
                            //0 is function, 1 is parameter
                            searchfields[layerfield] = fieldString
                        }
                    }

                    var str = ''
                    if (searchfields.hasOwnProperty(layer.options.layerName)) {
                        var sf = searchfields[layer.options.layerName] //sf for search field
                        for (var i = 0; i < sf.length; i++) {
                            str += sf[i][1]
                            str += ' '
                        }
                    }
                    str = str.substring(0, str.length - 1)

                    var searchFieldTokens = str.split(' ')
                    var searchStr

                    if (searchFieldTokens.length == 2) {
                        if (
                            searchFieldTokens[0].toLowerCase() ==
                            layer.useKeyAsName.toLowerCase()
                        ) {
                            searchStr =
                                keyAsName + ' ' + layer.feature.properties.Sol
                        } else {
                            searchStr =
                                layer.feature.properties.Sol + ' ' + keyAsName
                        }
                    }

                    QueryURL.writeSearchURL(
                        [searchStr],
                        layer.options.layerName
                    )
                }
            })
        }
    }

    //Pretty much like makePointLayer but without the pointToLayer stuff
    function makeVectorLayer() {
        var layerUrl = layerObj.url
        if (!F_.isUrlAbsolute(layerUrl)) layerUrl = L_.missionPath + layerUrl
        let urlSplit = layerObj.url.split(':')

        if (
            urlSplit[0].toLowerCase() === 'geodatasets' &&
            urlSplit[1] != null
        ) {
            calls.api(
                'geodatasets_get',
                {
                    layer: urlSplit[1],
                    type: 'geojson',
                },
                function (data) {
                    add(data.body)
                },
                function (data) {
                    console.warn(
                        'ERROR! ' +
                            data.status +
                            ' in ' +
                            layerObj.url +
                            ' /// ' +
                            data.message
                    )
                    add(null)
                }
            )
        } else if (layerObj.url.substr(0, 16) == 'api:publishedall') {
            calls.api(
                'files_getfile',
                {
                    id: JSON.stringify([1, 2, 3, 4, 5]),
                    quick_published: true,
                },
                function (data) {
                    data.body.features.sort((a, b) => {
                        let intentOrder = [
                            'all',
                            'roi',
                            'campaign',
                            'campsite',
                            'trail',
                            'signpost',
                            'note',
                            'master',
                        ]
                        let ai = intentOrder.indexOf(a.properties._.intent)
                        let bi = intentOrder.indexOf(b.properties._.intent)
                        return ai - bi
                    })
                    add(data.body)
                },
                function (data) {
                    console.warn(
                        'ERROR! ' +
                            data.status +
                            ' in ' +
                            layerObj.url +
                            ' /// ' +
                            data.message
                    )
                    add(null)
                }
            )
        } else if (layerObj.url.substr(0, 13) == 'api:published') {
            calls.api(
                'files_getfile',
                {
                    intent: layerObj.url.split(':')[2],
                    quick_published: true,
                },
                function (data) {
                    add(data.body)
                },
                function (data) {
                    console.warn(
                        'ERROR! ' +
                            data.status +
                            ' in ' +
                            layerObj.url +
                            ' /// ' +
                            data.message
                    )
                    add(null)
                }
            )
        } else if (layerObj.url.substr(0, 19) == 'api:tacticaltargets') {
            calls.api(
                'tactical_targets',
                {},
                function (data) {
                    add(data.body)
                },
                function (data) {
                    if (data) {
                        console.warn(
                            'ERROR! ' +
                                data.status +
                                ' in ' +
                                layerObj.url +
                                ' /// ' +
                                data.message
                        )
                    }
                    add(null)
                }
            )
        } else {
            $.getJSON(layerUrl, function (data) {
                add(data)
            }).fail(function (jqXHR, textStatus, errorThrown) {
                //Tell the console council about what happened
                console.warn(
                    'ERROR! ' +
                        textStatus +
                        ' in ' +
                        layerObj.url +
                        ' /// ' +
                        errorThrown
                )
                //Say that this layer was loaded, albeit erroneously
                L_.layersLoaded[L_.layersOrdered.indexOf(layerObj.name)] = true
                //Check again to see if all layers have loaded
                allLayersLoaded()
            })
        }

        function add(data) {
            if (data == null) {
                L_.layersLoaded[L_.layersOrdered.indexOf(layerObj.name)] = true
                allLayersLoaded()
                return
            }

            layerObj.style.layerName = layerObj.name

            layerObj.style.opacity = L_.opacityArray[layerObj.name]
            //layerObj.style.fillOpacity = L_.opacityArray[layerObj.name]

            var col = layerObj.style.color
            var opa = String(layerObj.style.opacity)
            var wei = String(layerObj.style.weight)
            var fiC = layerObj.style.fillColor
            var fiO = String(layerObj.style.fillOpacity)

            var leafletLayerObject = {
                style: function (feature) {
                    if (feature.properties.hasOwnProperty('style')) {
                        let className = layerObj.style.className
                        let layerName = layerObj.style.layerName
                        layerObj.style = JSON.parse(
                            JSON.stringify(feature.properties.style)
                        )
                        layerObj.style.className = className
                        layerObj.style.layerName = layerName
                    } else {
                        // Priority to prop, prop.color, then style color.
                        var finalCol =
                            col.toLowerCase().substring(0, 4) == 'prop'
                                ? F_.parseColor(
                                      feature.properties[col.substring(5)]
                                  ) || '#FFF'
                                : feature.style && feature.style.stroke != null
                                ? feature.style.stroke
                                : col
                        var finalOpa =
                            opa.toLowerCase().substring(0, 4) == 'prop'
                                ? feature.properties[opa.substring(5)] || '1'
                                : feature.style && feature.style.opacity != null
                                ? feature.style.opacity
                                : opa
                        var finalWei =
                            wei.toLowerCase().substring(0, 4) == 'prop'
                                ? feature.properties[wei.substring(5)] || '1'
                                : feature.style && feature.style.weight != null
                                ? feature.style.weight
                                : wei
                        if (!isNaN(parseInt(wei))) finalWei = parseInt(wei)
                        var finalFiC =
                            fiC.toLowerCase().substring(0, 4) == 'prop'
                                ? F_.parseColor(
                                      feature.properties[fiC.substring(5)]
                                  ) || '#000'
                                : feature.style && feature.style.fill != null
                                ? feature.style.fill
                                : fiC
                        var finalFiO =
                            fiO.toLowerCase().substring(0, 4) == 'prop'
                                ? feature.properties[fiO.substring(5)] || '1'
                                : feature.style &&
                                  feature.style.fillopacity != null
                                ? feature.style.fillopacity
                                : fiO

                        var noPointerEventsClass =
                            feature.style && feature.style.nointeraction
                                ? ' noPointerEvents'
                                : ''

                        layerObj.style.color = finalCol
                        layerObj.style.opacity = finalOpa
                        layerObj.style.weight = finalWei
                        layerObj.style.fillColor = finalFiC
                        layerObj.style.fillOpacity = finalFiO
                    }
                    layerObj.style.className =
                        layerObj.style.className + noPointerEventsClass
                    layerObj.style.metadata = data.metadata || {}
                    return layerObj.style
                },
                onEachFeature: (function (layerObjName) {
                    return onEachFeatureDefault
                })(layerObj.name),
            }
            if (layerObj.hasOwnProperty('radius')) {
                let markerIcon = null
                if (
                    layerObj.hasOwnProperty('variables') &&
                    layerObj.variables.hasOwnProperty('markerIcon')
                ) {
                    let markerIconOptions = F_.clone(
                        layerObj.variables.markerIcon
                    )

                    if (
                        markerIconOptions.iconUrl &&
                        !F_.isUrlAbsolute(markerIconOptions.iconUrl)
                    )
                        markerIconOptions.iconUrl =
                            L_.missionPath + markerIconOptions.iconUrl
                    if (
                        markerIconOptions.shadowUrl &&
                        !F_.isUrlAbsolute(markerIconOptions.shadowUrl)
                    )
                        markerIconOptions.shadowUrl =
                            L_.missionPath + markerIconOptions.shadowUrl

                    markerIcon = new L.icon(markerIconOptions)
                }
                leafletLayerObject.pointToLayer = function (feature, latlong) {
                    //We'll use leaflet's circleMarker for this
                    let layer = L.circleMarker(
                        latlong,
                        leafletLayerObject.style
                    ).setRadius(layerObj.radius)

                    if (markerIcon) {
                        layer = L.marker(latlong, { icon: markerIcon })
                        layer.options.layerName = layerObj.name
                    }

                    return layer
                }
            }

            //If it's a drawing layer
            if (layerObj.name.toLowerCase().indexOf('draw') != -1) {
                F_.sortGeoJSONFeatures(data)

                leafletLayerObject = {
                    style: function (feature) {
                        return {
                            color: 'black',
                            radius: 6,
                            opacity: feature.properties.opacity,
                            fillColor: feature.properties.fill,
                            fillOpacity: feature.properties.fillOpacity,
                            color: feature.properties.stroke,
                            weight: feature.properties.weight,
                            className: 'spePolygonLayer',
                        }
                    },
                    pointToLayer: function (feature, latlng) {
                        return L.circleMarker(latlng)
                    },
                    onEachFeature: function (feature, layer) {
                        var desc = feature.properties.description
                        if (desc) desc = desc.replace(/\n/g, '<br />')
                        var list =
                            '<dl><dt><b>' +
                            feature.properties.name +
                            '</b></dt><dt>' +
                            desc +
                            '</dt></dl>'
                        layer.bindPopup(list)
                    },
                }
            }
            L_.layersGroup[layerObj.name] = L.geoJson(data, leafletLayerObject)

            d3.selectAll(
                '.' + layerObj.name.replace(/\s/g, '').toLowerCase()
            ).data(data.features)
            L_.layersLoaded[L_.layersOrdered.indexOf(layerObj.name)] = true
            allLayersLoaded()
        }
    }

    function makeTileLayer() {
        var layerUrl = layerObj.url
        if (!F_.isUrlAbsolute(layerUrl)) layerUrl = L_.missionPath + layerUrl
        var bb = null
        if (layerObj.hasOwnProperty('boundingBox')) {
            bb = L.latLngBounds(
                L.latLng(layerObj.boundingBox[3], layerObj.boundingBox[2]),
                L.latLng(layerObj.boundingBox[1], layerObj.boundingBox[0])
            )
        }

        var tileFormat = 'tms'
        // For backward compatibility with the .tms option
        if (typeof layerObj.tileformat === 'undefined') {
            tileFormat =
                typeof layerObj.tms === 'undefined' ? true : layerObj.tms
            tileFormat = tileFormat ? 'tms' : 'wmts'
        } else tileFormat = layerObj.tileformat

        L_.layersGroup[layerObj.name] = L.tileLayer.colorFilter(layerUrl, {
            minZoom: layerObj.minZoom,
            maxZoom: layerObj.maxZoom,
            maxNativeZoom: layerObj.maxNativeZoom,
            tileFormat: tileFormat,
            tms: tileFormat === 'tms',
            //noWrap: true,
            continuousWorld: true,
            reuseTiles: true,
            bounds: bb,
        })

        L_.setLayerOpacity(layerObj.name, L_.opacityArray[layerObj.name])

        L_.layersLoaded[L_.layersOrdered.indexOf(layerObj.name)] = true
        allLayersLoaded()
    }

    function makeVectorTileLayer() {
        var layerUrl = layerObj.url
        if (!F_.isUrlAbsolute(layerUrl)) layerUrl = L_.missionPath + layerUrl

        let urlSplit = layerObj.url.split(':')

        if (
            urlSplit[0].toLowerCase() === 'geodatasets' &&
            urlSplit[1] != null
        ) {
            layerUrl =
                '/API/geodatasets/get?layer=' +
                urlSplit[1] +
                '&type=mvt&x={x}&y={y}&z={z}'
        }

        var bb = null
        if (layerObj.hasOwnProperty('boundingBox')) {
            bb = L.latLngBounds(
                L.latLng(layerObj.boundingBox[3], layerObj.boundingBox[2]),
                L.latLng(layerObj.boundingBox[1], layerObj.boundingBox[0])
            )
        }

        var clearHighlight = function () {
            for (let l of Object.keys(L_.layersNamed)) {
                if (L_.layersGroup[l]) {
                    var highlight = L_.layersGroup[l].highlight
                    if (highlight) {
                        L_.layersGroup[l].resetFeatureStyle(highlight)
                    }
                    L_.layersGroup[l].highlight = null
                }
            }
        }
        var timedSelectTimeout = null
        var timedSelect = function (layer, layerName, e) {
            clearTimeout(timedSelectTimeout)
            timedSelectTimeout = setTimeout(
                (function (layer, layerName, e) {
                    return function () {
                        let ell = { latlng: null }
                        if (e.latlng != null)
                            ell.latlng = JSON.parse(JSON.stringify(e.latlng))

                        Kinds.use(
                            L_.layersNamed[layerName].kind,
                            Map_,
                            L_.layersGroup[layerName].activeFeatures[0],
                            layer,
                            layerName,
                            null,
                            ell
                        )

                        ToolController_.getTool('InfoTool').use(
                            layer,
                            layerName,
                            L_.layersGroup[layerName].activeFeatures,
                            null,
                            null,
                            null,
                            ell
                        )
                        L_.layersGroup[layerName].activeFeatures = []
                    }
                })(layer, layerName, e),
                100
            )
        }

        var vectorTileOptions = {
            layerName: layerObj.name,
            rendererFactory: L.canvas.tile,
            vectorTileLayerStyles: layerObj.style.vtLayer || {},
            interactive: true,
            minZoom: layerObj.minZoom,
            maxZoom: layerObj.maxZoom,
            maxNativeZoom: layerObj.maxNativeZoom,
            getFeatureId: (function (vtId) {
                return function (f) {
                    if (
                        f.properties.properties &&
                        typeof f.properties.properties === 'string'
                    ) {
                        f.properties = JSON.parse(f.properties.properties)
                    }
                    return f.properties[vtId]
                }
            })(layerObj.style.vtId),
        }

        L_.layersGroup[layerObj.name] = L.vectorGrid
            .protobuf(layerUrl, vectorTileOptions)
            .on('click', function (e) {
                let layerName = e.sourceTarget._layerName
                let vtId = L_.layersGroup[layerName].vtId
                clearHighlight()
                L_.layersGroup[layerName].highlight = e.layer.properties[vtId]

                L_.layersGroup[layerName].setFeatureStyle(
                    L_.layersGroup[layerName].highlight,
                    {
                        weight: 2,
                        color: 'red',
                        opacity: 1,
                        fillColor: 'red',
                        fill: true,
                        radius: 4,
                        fillOpacity: 1,
                    }
                )
                L_.layersGroup[layerName].activeFeatures =
                    L_.layersGroup[layerName].activeFeatures || []
                L_.layersGroup[layerName].activeFeatures.push({
                    type: 'Feature',
                    properties: e.layer.properties,
                    geometry: {},
                })

                Map_.activeLayer = e.sourceTarget._layer
                let p = e.sourceTarget._point

                for (var i in e.layer._renderer._features) {
                    if (
                        e.layer._renderer._features[i].feature._pxBounds.min
                            .x <= p.x &&
                        e.layer._renderer._features[i].feature._pxBounds.max
                            .x >= p.x &&
                        e.layer._renderer._features[i].feature._pxBounds.min
                            .y <= p.y &&
                        e.layer._renderer._features[i].feature._pxBounds.max
                            .y >= p.y &&
                        e.layer._renderer._features[i].feature.properties[
                            vtId
                        ] != e.layer.properties[vtId]
                    ) {
                        L_.layersGroup[layerName].activeFeatures.push({
                            type: 'Feature',
                            properties:
                                e.layer._renderer._features[i].feature
                                    .properties,
                            geometry: {},
                        })
                    }
                }

                timedSelect(e.sourceTarget._layer, layerName, e)

                L.DomEvent.stop(e)
            })
            .on(
                'mouseover',
                (function (vtKey) {
                    return function (e, a, b, c) {
                        if (vtKey != null)
                            CursorInfo.update(
                                vtKey + ': ' + e.layer.properties[vtKey],
                                null,
                                false
                            )
                    }
                })(layerObj.style.vtKey)
            )
            .on('mouseout', function () {
                CursorInfo.hide()
            })

        L_.layersGroup[layerObj.name].vtId = layerObj.style.vtId
        L_.layersGroup[layerObj.name].vtKey = layerObj.style.vtKey

        L_.setLayerOpacity(layerObj.name, L_.opacityArray[layerObj.name])

        L_.layersLoaded[L_.layersOrdered.indexOf(layerObj.name)] = true
        allLayersLoaded()
    }

    function makeDataLayer() {
        var layerUrl = layerObj.url
        if (!F_.isUrlAbsolute(layerUrl)) layerUrl = L_.missionPath + layerUrl

        var bb = null
        if (layerObj.hasOwnProperty('boundingBox')) {
            bb = L.latLngBounds(
                L.latLng(layerObj.boundingBox[3], layerObj.boundingBox[2]),
                L.latLng(layerObj.boundingBox[1], layerObj.boundingBox[0])
            )
        }

        var uniforms = {}
        for (var i = 0; i < DataShaders['flood'].settings.length; i++) {
            uniforms[DataShaders['flood'].settings[i].parameter] =
                DataShaders['flood'].settings[i].value
        }

        L_.layersGroup[layerObj.name] = L.tileLayer.gl({
            options: {
                tms: true,
            },
            fragmentShader: DataShaders['flood'].frag,
            tileUrls: [layerUrl],
            uniforms: uniforms,
        })

        L_.setLayerOpacity(layerObj.name, L_.opacityArray[layerObj.name])

        L_.layersLoaded[L_.layersOrdered.indexOf(layerObj.name)] = true
        allLayersLoaded()
    }
}

//Because some layers load faster than others, check to see if
// all our layers were loaded before moving on
function allLayersLoaded() {
    if (!Map_.allLayersLoadedPassed) {
        //Only continues if all layers have been loaded
        for (var i = 0; i < L_.layersLoaded.length; i++) {
            if (L_.layersLoaded[i] == false) {
                return
            }
        }
        Map_.allLayersLoadedPassed = true

        //Then do these
        essenceFina()
        L_.addVisible(Map_)
        enforceVisibilityCutoffs()

        //OTHER TEMPORARY TEST STUFF THINGS
    }
}

//This would be better moved to Layers_
function enforceVisibilityCutoffs() {
    var settingsEnforceVC = true //We don't have setting yet
    var layerElements
    var names = Object.keys(L_.layersNamed)
    var vc = 0
    for (var i = 0; i < names.length; i++) {
        layerElements = d3.selectAll(
            '.' + names[i].replace(/\s/g, '').toLowerCase()
        )
        if (
            L_.layersGroup[names[i]] != undefined &&
            Map_.map.hasLayer(L_.layersGroup[names[i]]) &&
            L_.layersNamed[names[i]].hasOwnProperty('visibilitycutoff')
        ) {
            vc = L_.layersNamed[names[i]].visibilitycutoff
            if (vc > 0) {
                if (Map_.map.getZoom() < vc && settingsEnforceVC) {
                    layerElements.attr('display', 'none')
                } else {
                    layerElements.attr('display', 'inherit')
                }
            } else {
                if (Map_.map.getZoom() > Math.abs(vc) && settingsEnforceVC) {
                    layerElements.attr('display', 'none')
                } else {
                    layerElements.attr('display', 'inherit')
                }
            }
        }
    }
}

function propertiesToImages(props, baseUrl) {
    baseUrl = baseUrl || ''
    var images = []
    //Use "images" key first
    if (props.hasOwnProperty('images')) {
        for (var i = 0; i < props.images.length; i++) {
            if (props.images[i].url) {
                var url = baseUrl + props.images[i].url
                if (!F_.isUrlAbsolute(url)) url = L_.missionPath + url
                if (props.images[i].isModel) {
                    images.push({
                        url: url,
                        texture: props.images[i].texture,
                        name:
                            (props.images[i].name ||
                                props.images[i].url.match(/([^\/]*)\/*$/)[1]) +
                            ' [Model]',
                        type: 'model',
                        isPanoramic: false,
                        isModel: true,
                        values: props.images[i].values || {},
                        master: props.images[i].master,
                    })
                } else {
                    if (props.images[i].isPanoramic) {
                        images.push({
                            ...props.images[i],
                            url: url,
                            name:
                                (props.images[i].name ||
                                    props.images[i].url.match(
                                        /([^\/]*)\/*$/
                                    )[1]) + ' [Panoramic]',
                            type: 'photosphere',
                            isPanoramic: true,
                            isModel: false,
                            values: props.images[i].values || {},
                            master: props.images[i].master,
                        })
                    }
                    images.push({
                        url: url,
                        name:
                            props.images[i].name ||
                            props.images[i].url.match(/([^\/]*)\/*$/)[1],
                        type: props.images[i].type || 'image',
                        isPanoramic: false,
                        isModel: false,
                        values: props.images[i].values || {},
                        master: props.images[i].master,
                    })
                }
            }
        }
    }
    //If there isn't one, search all string valued props for image urls
    else {
        for (var p in props) {
            if (
                typeof props[p] === 'string' &&
                props[p].toLowerCase().match(/\.(jpeg|jpg|gif|png|xml)$/) !=
                    null
            ) {
                var url = props[p]
                if (!F_.isUrlAbsolute(url)) url = L_.missionPath + url
                images.push({
                    url: url,
                    name: p,
                    isPanoramic: false,
                    isModel: false,
                })
            }
            if (
                typeof props[p] === 'string' &&
                (props[p].toLowerCase().match(/\.(obj)$/) != null ||
                    props[p].toLowerCase().match(/\.(dae)$/) != null)
            ) {
                var url = props[p]
                if (!F_.isUrlAbsolute(url)) url = L_.missionPath + url
                images.push({
                    url: url,
                    name: p,
                    isPanoramic: false,
                    isModel: true,
                })
            }
        }
    }

    return images
}

function buildToolBar() {
    d3.select('#mapToolBar').html('')

    Map_.toolBar = d3
        .select('#mapToolBar')
        .append('div')
        .attr('class', 'row childpointerevents')
        .style('height', '100%')
    Map_.toolBar
        .append('div')
        .attr('id', 'scaleBarBounds')
        .style('width', '270px')
        .style('height', '36px')
        .append('svg')
        .attr('id', 'scaleBar')
        .attr('width', '270px')
        .attr('height', '36px')
}

export default Map_
