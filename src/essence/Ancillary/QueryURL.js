import L_ from '../Basics/Layers_/Layers_'
import T_ from '../Basics/ToolController_/ToolController_'
import calls from '../../pre/calls'

var QueryURL = {
    checkIfMission: function () {
        return this.getSingleQueryVariable('mission')
    },
    queryURL: function () {
        //Set the site and view if specified in the url
        var urlSite = this.getSingleQueryVariable('site')
        var urlMapLat = this.getSingleQueryVariable('mapLat')
        var urlMapLon = this.getSingleQueryVariable('mapLon')
        var urlMapZoom = this.getSingleQueryVariable('mapZoom')
        var urlGlobeLat = this.getSingleQueryVariable('globeLat')
        var urlGlobeLon = this.getSingleQueryVariable('globeLon')
        var urlGlobeZoom = this.getSingleQueryVariable('globeZoom')
        var urlGlobeCamera = this.getSingleQueryVariable('globeCamera')
        var urlPanePercents = this.getSingleQueryVariable('panePercents')
        var urlToolsObj = this.getSingleQueryVariable('tools')

        var searchFile = this.getSingleQueryVariable('searchFile')
        var searchStrings = this.getMultipleQueryVariable('searchstr')
        var layersOn = this.getSingleQueryVariable('on')
        var selected = this.getSingleQueryVariable('selected')

        var viewerImg = this.getSingleQueryVariable('viewerImg')
        var viewerLoc = this.getSingleQueryVariable('viewerLoc')

        var rmcxyzoom = this.getSingleQueryVariable('rmcxyzoom')

        if (urlSite !== false) {
            L_.FUTURES.site = urlSite
        }

        if (
            urlMapLat !== false &&
            urlMapLon !== false &&
            urlMapZoom !== false
        ) {
            // lat, lon, zoom
            L_.FUTURES.mapView = [
                parseFloat(urlMapLat),
                parseFloat(urlMapLon),
                parseInt(urlMapZoom),
            ]
        }

        if (
            urlGlobeLat !== false &&
            urlGlobeLon != false &&
            urlGlobeZoom != false
        ) {
            // lat, lon, zoom
            L_.FUTURES.globeView = [
                parseFloat(urlGlobeLat),
                parseFloat(urlGlobeLon),
                parseInt(urlGlobeZoom),
            ]
        }

        if (urlGlobeCamera !== false) {
            var c = urlGlobeCamera.split(',')
            // posX, posY, posZ, targetX, targetY, targetZ
            L_.FUTURES.globeCamera = [
                parseFloat(c[0]),
                parseFloat(c[1]),
                parseInt(c[2]),
                parseFloat(c[3]),
                parseFloat(c[4]),
                parseInt(c[5]),
            ]
        }

        if (urlPanePercents !== false) {
            // viewerPercent, mapPercent, globePercent
            // sum == 100
            L_.FUTURES.panelPercents = urlPanePercents.split(',')
        }

        if (urlToolsObj !== false) {
            L_.FUTURES.tools = urlToolsObj.split(',')
        }

        if (searchFile !== false) {
            L_.searchFile = searchFile
        }

        if (searchStrings !== false) {
            L_.searchStrings = searchStrings
        }

        if (selected !== false) {
            var s = selected.split(',')
            //1 and 2 could be either lat, lng or key, value
            let isKeyValue = isNaN(parseFloat(s[1])) || isNaN(parseFloat(s[2]))
            if (isKeyValue) {
                L_.FUTURES.activePoint = {
                    layerName: s[0],
                    key: s[1],
                    value: s[2],
                    view: s[3],
                    zoom: s[4],
                }
            } else {
                L_.FUTURES.activePoint = {
                    layerName: s[0],
                    lat: parseFloat(s[1]),
                    lon: parseFloat(s[2]),
                    view: s[3],
                    zoom: s[4],
                }
            }
        }

        if (viewerImg !== false) {
            L_.FUTURES.viewerImg = viewerImg
        }

        if (viewerLoc !== false) {
            var l = viewerLoc.split(',')
            for (var i = 0; i < l.length; i++) l[i] = parseFloat(l[i])
            L_.FUTURES.viewerLoc = l
        }

        if (rmcxyzoom) {
            let s = rmcxyzoom.split(',')
            if (s.length == 5) {
                calls.api(
                    'spatial_published',
                    {
                        rmc: s[0] + ',' + s[1],
                        x: s[2],
                        y: s[3],
                        query: 'self',
                    },
                    function (d) {
                        console.log(d)
                    },
                    function (d) {
                        console.warn(d)
                    }
                )
            }
        }

        if (layersOn !== false || selected !== false) {
            L_.FUTURES.customOn = true
            // lists all the on layers
            // if the url has the on parameter and a layer is not listed in that url, the layer is off
            // on layers are split into <layername>$<layeropacity>, <layername>$<layeropacity>, ...
            var onLayers = {}
            //'replace' makes it so that onLayers are the only ones on,
            //'add' makes it so that onLayers and union of default are on
            var method = 'replace'

            if (layersOn !== false) {
                L_.initialLayersOn = layersOn
                var arr = layersOn.split(',')
                for (var l of arr) {
                    let s = l.split('$')
                    onLayers[s[0]] = { opacity: parseFloat(s[1]) }
                }
            }
            //Turn the selected layer on too
            if (selected !== false) {
                let s = selected.split(',')
                onLayers[s[0]] = { opacity: 1 }
            }

            //This is so that when preselecting data the layer can turn on along with all default layers
            if (layersOn == false && selected != false) method = 'add'

            return {
                onLayers: onLayers,
                method: method,
            }
        }

        return null
    },
    getSingleQueryVariable: function (variable) {
        var query = window.location.search.substring(1)
        var vars = query.split('&')
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=')
            if (pair[0] == variable) {
                return decodeURIComponent(pair[1])
            }
        }

        return false
    },
    getMultipleQueryVariable: function (variable) {
        var parameterList = []
        var query = window.location.search.substring(1)
        var vars = query.split('&')
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split('=')
            if (pair[0].toLowerCase() == variable) {
                parameterList.push(decodeURIComponent(pair[1]))
            }
        }

        if (parameterList.length == 0) {
            return false
        } else {
            return parameterList
        }
    },
    /*
    mission
    site
    mapLon
    mapLat
    mapZoom
    globeLon
    globeLat
    globeZoom
    globeCamera posX,posY,posZ,tarX,tarY,tarZ
    panePercents
    on name$opacity,
    selected name,lat,lon
    viewerImg
    viewerLoc
      image         posX,posY,w,h
      photosphere   az,el,fov
      model         posX,posY,posZ,tarX,tarY,tarZ
    tools
      "tools=camp$1.3.4,"
    */
    writeCoordinateURL: function (
        mapLon,
        mapLat,
        mapZoom,
        globeLon,
        globeLat,
        globeZoom
    ) {
        L_.Viewer_.getLocation()

        var callback
        if (typeof mapLon === 'function') {
            callback = mapLon
            mapLon = undefined
        }

        //Defaults
        if (mapLon === undefined) mapLon = L_.Map_.map.getCenter().lng
        if (mapLat === undefined) mapLat = L_.Map_.map.getCenter().lat
        if (mapZoom === undefined) mapZoom = L_.Map_.map.getZoom()

        var globeCenter = L_.Globe_.getCenter()
        if (globeLon === undefined) globeLon = globeCenter.lon
        if (globeLat === undefined) globeLat = globeCenter.lat
        if (globeZoom === undefined) globeZoom = L_.Globe_.zoom

        var viewerImg = L_.Viewer_.getLastImageId()
        var viewerLoc = L_.Viewer_.getLocation()

        //mission
        var urlAppendage = '?mission=' + L_.mission

        //site
        if (L_.site) urlAppendage += '&site=' + L_.site

        //mapLon
        urlAppendage += '&mapLon=' + mapLon

        //mapLat
        urlAppendage += '&mapLat=' + mapLat

        //mapZoom
        urlAppendage += '&mapZoom=' + mapZoom

        //globeLon
        urlAppendage += '&globeLon=' + globeLon

        //globeLat
        urlAppendage += '&globeLat=' + globeLat

        //globeZoom
        urlAppendage += '&globeZoom=' + globeZoom

        //globeCamera
        var orbit = L_.Globe_.getCameras().orbit
        var cam = orbit.camera
        var con = orbit.controls

        var pos = cam.position
        var tar = con.target
        var globeCamera =
            pos.x +
            ',' +
            pos.y +
            ',' +
            pos.z +
            ',' +
            tar.x +
            ',' +
            tar.y +
            ',' +
            tar.z
        urlAppendage += '&globeCamera=' + globeCamera

        //panePercents
        var pP = L_.UserInterface_.getPanelPercents()
        var panePercents = pP.viewer + ',' + pP.map + ',' + pP.globe
        urlAppendage += '&panePercents=' + panePercents

        //on
        var layersOnString = ''
        for (var l in L_.toggledArray) {
            if (L_.toggledArray[l] && L_.layersDataByName[l].type !== 'header')
                layersOnString +=
                    l + '$' + parseFloat(L_.opacityArray[l]).toFixed(2) + ','
        }
        layersOnString = layersOnString.substring(0, layersOnString.length - 1)
        if (layersOnString.length > 0) urlAppendage += '&on=' + layersOnString

        //selected
        if (L_.lastActivePoint.layerName != null) {
            if (L_.toggledArray[L_.lastActivePoint.layerName])
                urlAppendage +=
                    '&selected=' +
                    L_.lastActivePoint.layerName +
                    ',' +
                    L_.lastActivePoint.lat +
                    ',' +
                    L_.lastActivePoint.lon
        }

        //viewer
        if (viewerImg !== false) urlAppendage += '&viewerImg=' + viewerImg
        if (viewerImg !== false && viewerLoc !== false)
            urlAppendage += '&viewerLoc=' + viewerLoc

        //tools
        var urlTools = T_.getToolsUrl()
        if (urlTools !== false) urlAppendage += '&tools=' + urlTools

        var url = urlAppendage

        calls.api(
            'shortener_shorten',
            {
                url: url,
            },
            function (s) {
                //Set and update the short url
                L_.url = window.location.href.split('?')[0] + '?s=' + s.body.url
                window.history.replaceState('', '', L_.url)
                if (typeof callback === 'function') callback()
            },
            function (e) {
                //Set and update the full url
                L_.url = window.location.href.split('?')[0] + url
                window.history.replaceState('', '', L_.url)
                if (typeof callback === 'function') callback()
            }
        )
    },
    writeSearchURL: function (searchStrs, searchFile) {
        return //!!!!!!!!!!!!!!!!
        /*
        var url =
            window.location.href.split('?')[0] +
            '?mission=' +
            L_.mission +
            '&site=' +
            L_.site
        for (var i = 0; i < searchStrs.length; i++) {
            url = url + '&searchStr=' + searchStrs[i]
        }
        url = url + '&searchFile=' + searchFile

        window.history.replaceState('', '', url)
        */
    },
}

export default QueryURL
