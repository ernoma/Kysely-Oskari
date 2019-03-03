
// log filter in Chrome: -url:https://kartta.paikkatietoikkuna.fi/action -url:http://localhost/Kysely-Oskari/lib/rpc-client.min.js -url:https://kartta.paikkatietoikkuna.fi/Oskari/dist/1.49.0/published-map_ol3/oskari.min.js

var IFRAME_DOMAIN = 'https://kartta.paikkatietoikkuna.fi';
var KyselyOskari = {
	// features: null,
	lastClickedFeature: null,
	drawing: false
}

$(function() {
	
	var iFrame = document.getElementById('publishedMap');
	
	//console.log(OskariRPC);
	
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
				//channel.log('Available layers', layers);
			});
		}
		
		channel.getFeatures([true], function(data) {
			//channel.log('GetFeatures: ', data);
		});
		
		channel.handleEvent('FeedbackResultEvent', function (data) {
			console.log('FeedbackResultEvent', data);
			handleFeedbackResults(data);
		});

		channel.handleEvent('DrawingEvent', function (data) {
			console.log('DrawingEvent', data);
			handleDrawingEvent(data);
		});
		
		//channel.postRequest('GetFeedbackServiceRequest', []);
		
		getOpen311Feedbacks();
		
		
		$.getJSON('http://karttatehdas.fi:8080/geoserver/oskari/ows?service=WFS&version=1.1.0&request=GetFeature&typeNames=oskari:kysely_oskari_paikat&maxFeatures=50&outputFormat=application%2Fjson&srsName=EPSG:3067', function(data) {
		//console.log(data);
		// KyselyOskari.features = data.features;
		
		var params = [data, {
			centerTo: true,
			featureStyle: {
				fill: {
					color: '#ff0000'
				},
				stroke : {
					color: '#ff0000',
					width: 10
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
			cursor: 'pointer',
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
			//console.log('MapClickedEvent', data);
			console.log(KyselyOskari.lastClickedFeature);
			
			if (KyselyOskari.lastClickedFeature != null && !$('#featurePopup').is(":visible")) {
				const feature = KyselyOskari.lastClickedFeature;
				var html = '<p><b>' + feature.properties.kysymys + '</b></p>';
				if (feature.properties.kuva_url != null) {
					html += '<p><img src="' + feature.properties.kuva_url + '"></p>';
				}
				if (feature.properties.tyyppi == 'teksti') {
					html += '<p><div class="ui action input">' +
						'<input id="inputAnswer" type="text" placeholder="Vastaus...">' +
						'<button class="ui primary button" id="buttonAnswer">Lähetä vastaus</button>' +
					'</div></p>';
				}
				else if (feature.properties.tyyppi == 'piirto_alue') {
					html +=
						'<div class="ui vertical animated button primary" tabindex="0" id="buttonDraw">' +
							'<div id="drawDiv" class="hidden content">Piirrä</div>' +
							'<div class="visible content">' +
								'<i id="drawItem" class="pencil icon"></i>' +
							'</div>' +
						'</div>';
				}
				if (feature.properties.info_url != null) {
					html += '<p><a href="' + feature.properties.info_url + '" target="_blank">lisätieto</a></p>';
				}
				if (feature.properties.kuva_url != null) {
					html += '<p>' +
					(feature.properties.kuva_lisenssi != null ? 'kuvan lisenssi: ' + feature.properties.kuva_lisenssi : 'kuvan lisenssi: tuntematon') +
					'</p>';
				}
				$('#featurePopup').html(html);
			
				if (feature.properties.tyyppi == 'teksti') {
					$('#buttonAnswer').on('click', function(event) {
						sendAnswer();
					});
				}
				else if (feature.properties.tyyppi == 'piirto_alue') {
					$('#buttonDraw').on('click', function(event) {
						if (!KyselyOskari.drawing) {
							KyselyOskari.drawing = true;
							$("#drawDiv").text('Lähetä');
							$("#drawItem").toggleClass('pencil save');
							startDrawing();
						}
						else {
							KyselyOskari.drawing = false;
							$("#drawDiv").text('Piirrä');
							$("#drawItem").toggleClass('save pencil');
							$('#featurePopup').hide();
							stopDrawing();
						}
					});
				}

				// $('#featurePopup').css('top', data.y);
				// $('#featurePopup').css('left', data.x);
				$('#featurePopup').show();
			}
			else if ($('#featurePopup').is(":visible")) {
				$('#featurePopup').hide();
				KyselyOskari.lastClickedFeature = null;
			}
		}
	);
		
	// channel.handleEvent('InfoBox.InfoBoxEvent', function(data) {
	// console.log('InfoBox.InfoBoxEvent', data);
	// });
	
	channel.handleEvent('FeatureEvent', function(data) {
		//console.log('FeatureEvent', data);
		if (data.operation == 'click') {
			KyselyOskari.lastClickedFeature = data.features[0].geojson.features[0];
			//console.log('FeatureEvent, KyselyOskari.lastClickedFeature', KyselyOskari.lastClickedFeature);
		}
		else if (data.operation == 'add') {
			channel.zoomOut(function(data){
				channel.log('Zoom level after: ', data);
			});
		}
	});
		
	function sendAnswer() {
		var answer = $('#inputAnswer').val();
		// //console.log(answer);
		// //console.log('sendAnswer, KyselyOskari.lastClickedFeature', KyselyOskari.lastClickedFeature);
		// var postdata = {
		// 	"service_code": "180",
		// 	"description": answer,
		// 	"first_name" : "Martti",
		// 	"last_name" : "Mahtava",
		// 	"lat": KyselyOskari.lastClickedFeature.geometry.coordinates[0],
		// 	"long": KyselyOskari.lastClickedFeature.geometry.coordinates[1]
		// };
		// var data = {
		// 	"baseUrl": "http://dev.hel.fi/open311-test/v1",
		// 	"srs":"EPSG:3067",
		// 	"payload": postdata
		// };
		// channel.postRequest('PostFeedbackRequest', [data]);

		var html =
		'<div class="item">' +
			'<i class="map marker icon"></i>' +
				'<div class="content">' +
					'<a class="header">' + KyselyOskari.lastClickedFeature.properties.address + '</a>' +
					'<div class="description">' +
						(answer.length > 30 ? answer.substr(0, 27) + '...' : answer) +
						'</div>' +
				'</div>' +
		'</div>';
		$("#serviceFeedbacksList").prepend(html);

		$('#featurePopup').hide();
		KyselyOskari.lastClickedFeature = null;

		// getOpen311Feedbacks();
	}
	
	function getOpen311Feedbacks() {
		var filterdata = {
			"service_code": "180",
			"start_date": "2018-04-01T00:00:00Z",
			"status": "open,closed"
		};
		var data = {
			"baseUrl": "http://dev.hel.fi/open311-test/v1", //https://asiointi.hel.fi/palautews/rest/v1
			"srs":"EPSG:3067",
			"payload": filterdata
		};
		channel.postRequest('GetFeedbackRequest', [data]);
	}

	function startDrawing() {
		var style = {
			draw : {
					fill : {
							 color: 'rgba(238,0,0,0.3)'
					},
					stroke : {
								color: 'rgba(0,0,0,1)',
								width: 2
					},
					image : {
								radius: 4,
								fill: {
									color: 'rgba(0,0,0,1)'
								}
					}
			}
		};

		channel.postRequest('DrawTools.StartDrawingRequest', ['myplaces', 'Polygon', {
				label : 'Kerrostaloalue',
				style : style,
				allowMultipleDrawing: false
		}]);
	}

	function stopDrawing() {
		channel.postRequest('DrawTools.StopDrawingRequest', ['myplaces', false]);
	}

	function handleFeedbackResults(data) {

		const count = data.data.getFeedback.features.length > 5 ? 5 : data.data.getFeedback.features.length - 1;

		for (var i = count; i >= 0; i--) {
			do {
				var x = Math.floor(Math.random() * data.data.getFeedback.features.length);
			} while (data.data.getFeedback.features[x].properties.address == '');

			var feature = data.data.getFeedback.features[x];
			var html =
				'<div class="item">' +
					'<i class="map marker icon"></i>' +
						'<div class="content">' +
							'<a class="header">' + feature.properties.address + '</a>' +
							'<div class="description">' +
								(feature.properties.description.length > 30 ? feature.properties.description.substr(0, 27) + '...' : feature.properties.description) +
								'</div>' +
						'</div>' +
				'</div>';
			$("#serviceFeedbacksList").append(html);
		}

		$("#feedbackLoader").toggleClass('active disabled');
	}

	function handleDrawingEvent(data) {
		console.log(data);
		if (data.isFinished && !$('#featurePopup').is(":visible")) {

			var center = turf.center(data.geojson);
			console.log(center);
			var projEPSG3067 = "+proj=utm +zone=35 +ellps=GRS80 +units=m +no_defs";

			var coordsInEPSG4326 = proj4(projEPSG3067, 'EPSG:4326', center.geometry.coordinates);
			console.log(coordsInEPSG4326);

			var params = {
				'point.lat': coordsInEPSG4326[1],
				'point.lon': coordsInEPSG4326[0],
				size: 1
			}

			$.getJSON('https://api.digitransit.fi/geocoding/v1/reverse', params, function (result) {
				console.log(result);

				var html =
				'<div class="item">' +
					'<i class="map marker icon"></i>' +
						'<div class="content">' +
							'<a class="header">' + result.features[0].properties.name + '</a>' +
							'<div class="description">' +
								'uusi kerrostaloalue'
								'</div>' +
						'</div>' +
				'</div>';
				$("#serviceFeedbacksList").prepend(html);
			});
		}
	}

});

	
		