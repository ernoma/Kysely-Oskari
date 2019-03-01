

var IFRAME_DOMAIN = 'https://kartta.paikkatietoikkuna.fi';
var KyselyOskari = {
    // features: null,
    lastClickedFeature: null
}

$(function() {

    var iFrame = document.getElementById('publishedMap');

    console.log(OskariRPC);

    var channel = OskariRPC.connect(
		iFrame,
		IFRAME_DOMAIN
    );

    channel.onReady(function() {
	//channel is now ready and listening.
	channel.log('Map is now listening');
	var expectedOskariVersion = '1.49.0';
	channel.isSupported(expectedOskariVersion, function(blnSupported) {
            if(blnSupported) {
		channel.log('Client is supported and Oskari version is ' + expectedOskariVersion);
            } else {
		channel.log('Oskari-instance is not the one we expect (' + expectedOskariVersion + ') or client not supported');
		// getInfo can be used to get the current Oskari version
		channel.getInfo(function(oskariInfo) {
		    channel.log('Current Oskari-instance reports version as: ', oskariInfo);
		});
            }
	});
	channel.isSupported(function(blnSupported) {
            if(!blnSupported) {
		channel.log('Oskari reported client version (' + OskariRPC.VERSION + ') is not supported.' +
			    'The client might work, but some features are not compatible.');
            } else {
		channel.log('Client is supported by Oskari.');
            }

	    channel.getSupportedEvents(function(supported) {
		channel.log('Supported events', supported);
	    });
  
	    channel.getSupportedRequests(function(supported) {
		channel.log('Supported requests', supported);
	    });
	    
	    channel.getSupportedFunctions(function(supported) {
		channel.log('Supported functions', supported);
	    });
	});

	// supported functions can also be detected by
	if (typeof channel.getAllLayers === 'function') {
	    channel.getAllLayers(function(layers) {
		channel.log('Available layers', layers);
	    });
	}

	channel.getFeatures([true], function(data) {
	    channel.log('GetFeatures: ', data);
	});

	$.getJSON('http://karttatehdas.fi:8080/geoserver/oskari/ows?service=WFS&version=1.1.0&request=GetFeature&typeNames=oskari:kysely_oskari_paikat&maxFeatures=50&outputFormat=application%2Fjson&srsName=EPSG:3067', function(data) {
	    console.log(data);
	    // KyselyOskari.features = data.features;

	    var params = [data, {
			centerTo: true,
			featureStyle: {
				fill: {
				color: '#ff0000'
				},
				stroke : {
				color: '#ff0000',
				width: 5
				},
				text : {
				scale : 1.3,
				fill : {
					color : 'rgba(0,0,0,1)'
				},
				stroke : {
					color : 'rgba(255,255,255,1)',
					width : 2
				},
				labelProperty: 'test_property'
				}
			},
			cursor: '',
			prio: 1
	    }];

	    channel.postRequest(
			'MapModulePlugin.AddFeaturesToMapRequest',
			params
	    );
	});
    });

    channel.handleEvent(
		'MapClickedEvent',
		function(data) {
			console.log('MapClickedEvent', data);
			console.log(KyselyOskari.lastClickedFeature);

			if (KyselyOskari.lastClickedFeature != null) {
				const feature = KyselyOskari.lastClickedFeature;
				var html = '<p><b>' + feature.properties.kysymys + '</b></p>' +
					'<p><img src="' + feature.properties.kuva_url + '"></p>' +
					'<input type="text" placeholder="Vastaus...">' +
					'<button>Lähetä vastaus</button>' +
					'<p><a href="' + feature.properties.info_url + '" target="_blank">lisätieto</a></p>' +
					'<p>' +
					(feature.properties.kuva_lisenssi != null ? 'kuvan lisenssi: ' + feature.properties.kuva_lisenssi : 'kuvan lisenssi: tuntematon') +
					'</p>';
				$('#featurePopup').html(html);
				$('#featurePopup').css('top', data.y);
				$('#featurePopup').css('left', data.x);
				$('#featurePopup').show();
				KyselyOskari.lastClickedFeature = null;
			}
			else {
				$('#featurePopup').hide();
			}
		}
	);

    // channel.handleEvent('InfoBox.InfoBoxEvent', function(data) {
    // console.log('InfoBox.InfoBoxEvent', data);
    // });

    channel.handleEvent('FeatureEvent', function(data) {
		console.log('FeatureEvent', data);
		KyselyOskari.lastClickedFeature = data.features[0].geojson.features[0];
    });

});


