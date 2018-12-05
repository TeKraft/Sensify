import { Component, EventEmitter, Input, Output, ElementRef } from '@angular/core';
import { NavController, AlertController } from 'ionic-angular';
import { tileLayer } from "leaflet";
import * as L from "leaflet";
import { Metadata, SenseBox } from "../../../providers/model";
import { OnChanges } from '@angular/core';

@Component({
    selector: 'sensify-page-map',
    templateUrl: 'sensify-map.html',
})
export class SensifyMapPage implements OnChanges {

    @Input()
    public metadata: Metadata;

    @Output()
    public onMessageChange: EventEmitter<string> = new EventEmitter();

    @Output()
    public onMetadataChange: EventEmitter<Metadata> = new EventEmitter();

    // Leaflet Config Values
    public map: L.Map;
    public LeafletOptions = {
        layers: [
            tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        ],
        zoom: 13,
        center: [0, 0]
    };
    public layersControl = {
        baselayers: null,
        overlays: {},
        options: {
            position: 'bottomleft'
        }
    };
    public userLocationMarker: L.Marker;
    public userLocationMarkerLayer: L.LayerGroup;
    public senseboxMarkersLayerGreen: L.LayerGroup;
    public senseboxMarkersLayerYellow: L.LayerGroup;
    public senseboxMarkersLayerRed: L.LayerGroup;
    public senseboxMarkersLayerBlue: L.LayerGroup;
    public distanceToClosest: number;
    public distanceToClosestString: String;

    constructor(
        public navCtrl: NavController,
        private elementRef: ElementRef,
        private alertCtrl: AlertController
    ) { }

    public greenIcon = L.icon({
        iconUrl: '../../assets/imgs/greenMarker.png',
        iconSize: [40, 40],
        iconAnchor: [20, 37],
        popupAnchor: [-3, -76]
    });

    public yellowIcon = L.icon({
        iconUrl: '../../assets/imgs/yellowMarker.png',
        iconSize: [40, 40],
        iconAnchor: [20, 37],
        popupAnchor: [-3, -76]
    });

    public redIcon = L.icon({
        iconUrl: '../../assets/imgs/redMarker.png',
        iconSize: [40, 40],
        iconAnchor: [20, 37],
        popupAnchor: [-3, -76]
    });

    public blueIcon = L.icon({
        iconUrl: '../../assets/imgs/blueMarker.png',
        iconSize: [40, 40],
        iconAnchor: [20, 37],
        popupAnchor: [-3, -76]
    });

    public posIcon = L.icon({
        iconUrl: '../../assets/imgs/positionMarker.png',
        iconSize: [50, 50],
        iconAnchor: [25, 48],
        popupAnchor: [-3, -76]
    });

    ionViewDidLoad() {
        console.log('ionViewDidLoad MapPage');
    }

    ngOnChanges(changes): void {
        if (changes.metadata && this.map) {
            this.updateMap();
        }
    }

    onMapReady(map: L.Map) {
        this.map = map;
        this.updateMap();
        this.map.on('moveend', e => {
            this.metadata.settings.zoomLevel = e.target.getZoom();
            let tempView = e.target.getCenter();
            this.metadata.settings.mapView = new L.LatLng(tempView.lat, tempView.lng);
            this.onMetadataChange.emit(this.metadata);
        })
    }

    public updateMap() {
        if (this.metadata.settings.location) {
            this.addUserLocationToMap();
            this.addSenseboxMarkerToMap();
        }
    }

    public addUserLocationToMap() {
        // Center map on user location
        // this.map.panTo(this.metadata.settings.location);
        if (this.metadata.settings.zoomLevel && this.metadata.settings.mapView) {
            this.map.setView(this.metadata.settings.mapView, this.metadata.settings.zoomLevel);
        } else {
            this.map.setView(this.metadata.settings.location, this.metadata.settings.zoomLevel);
        }

        // Remove user location layer from map
        if (this.userLocationMarkerLayer != undefined) {
            this.map.removeLayer(this.userLocationMarkerLayer);
        }

        // Create marker with user location + description
        let popupDescription = "<b>Your position is:</b><br>Latitude: " + this.metadata.settings.location.toString();
        this.userLocationMarker = L.marker(this.metadata.settings.location,
            { icon: this.posIcon })
            .bindPopup(popupDescription);

        this.userLocationMarkerLayer = L.layerGroup([this.userLocationMarker]);
        // Add userLocationMarker to Overlay Layer "Me"
        this.layersControl.overlays['Me'] = this.userLocationMarkerLayer;
        this.layersControl.overlays['Me'].addTo(this.map);
    }

    // Add senseBoxes to Map
    public addSenseboxMarkerToMap() {
        if (this.metadata.senseBoxes && this.metadata.closestSenseBox && this.metadata.senseBoxes.length > 0) {
            let closestMarkersRed = [];
            let closestMarkersYellow = [];
            let closestMarkersGreen = [];
            let closestMarkersBlue = [];
            for (let i = 0; i < this.metadata.senseBoxes.length; i++) {
                if (!this.metadata.senseBoxes[i].location) {
                }
                // Generate marker-description
                let popupDescription = this.getSenseboxPopupDescription(this.metadata.senseBoxes[i]);
                // Generate marker
                let marker;
                if (this.metadata.senseBoxes[i].location != this.metadata.closestSenseBox.location) {
                    if (this.metadata.senseBoxes[i].updatedCategory == "today") {
                        marker = L.marker(this.metadata.senseBoxes[i].location,
                            { icon: this.greenIcon })
                            .bindPopup(popupDescription);
                        // Add marker to map
                        closestMarkersGreen.push(marker);
                    } else if (this.metadata.senseBoxes[i].updatedCategory == "thisWeek") {
                        marker = L.marker(this.metadata.senseBoxes[i].location,
                            { icon: this.yellowIcon })
                            .bindPopup(popupDescription);
                        // Add marker to map
                        closestMarkersYellow.push(marker);
                    } else if (this.metadata.senseBoxes[i].updatedCategory == "tooOld") {
                        marker = L.marker(this.metadata.senseBoxes[i].location,
                            { icon: this.redIcon })
                            .bindPopup(popupDescription);
                        // Add marker to map
                        closestMarkersRed.push(marker);
                    }
                } else {//ClosestSenseBox Marker
                    marker = L.marker(this.metadata.closestSenseBox.location,
                        { icon: this.blueIcon })
                        .bindPopup(popupDescription);
                    // Add marker to map
                    closestMarkersBlue.push(marker);
                    let tempDistance = this.metadata.settings.location.distanceTo(this.metadata.closestSenseBox.location);
                    if (tempDistance > 999) {
                        tempDistance = tempDistance / 1000;
                        this.distanceToClosest = this.round(tempDistance, 2);
                        this.distanceToClosestString = this.distanceToClosest + " km";
                    } else {
                        this.distanceToClosest = this.round(tempDistance, 2);
                        this.distanceToClosestString = this.distanceToClosest + " m";
                    }


                }
                if (marker) {
                    marker.on('popupopen', () => {
                        this.elementRef.nativeElement.querySelector("#a" + this.metadata.senseBoxes[i]._id).addEventListener('click', (e) => {
                            this.metadata.closestSenseBox = this.metadata.senseBoxes[i];
                            this.metadata.settings.mySenseBox = this.metadata.senseBoxes[i]._id;
                            let alert = this.alertCtrl.create({
                                title: 'Success',
                                subTitle: 'New home SenseBox was set',
                                buttons: ['OK']
                            });
                            alert.present();
                        })
                    })
                }
            }

            // Check if markers were already set; delete them if yes -> update markers
            if (this.senseboxMarkersLayerGreen != undefined) {
                this.map.removeLayer(this.senseboxMarkersLayerGreen);
                this.senseboxMarkersLayerGreen = undefined;
                this.layersControl.overlays['Green SenseBoxes'] = {};
            }
            if (this.senseboxMarkersLayerYellow != undefined) {
                this.map.removeLayer(this.senseboxMarkersLayerYellow);
                this.senseboxMarkersLayerYellow = undefined;
                this.layersControl.overlays['Yellow SenseBoxes'] = {};
            }
            if (this.senseboxMarkersLayerRed != undefined) {
                this.map.removeLayer(this.senseboxMarkersLayerRed);
                this.senseboxMarkersLayerRed = undefined;
                this.layersControl.overlays['Red SenseBoxes'] = {};
            }
            if (this.senseboxMarkersLayerBlue != undefined) {
                this.map.removeLayer(this.senseboxMarkersLayerBlue);
                this.senseboxMarkersLayerBlue = undefined;
                this.layersControl.overlays['Closest/My SenseBox'] = {};
            }

            //line from user to closest box
            let lineCoords = [[this.metadata.settings.location, this.metadata.closestSenseBox.location]];
            let line = L.polyline(lineCoords, { className: "line", dashArray: "10,15" });
            closestMarkersBlue.push(line);

            //Circle, visualizing radius
            let radiusCircle = L.circle(this.metadata.settings.location, { className: "circle", radius: this.metadata.settings.radius * 1000 }).addTo(this.map);

            // Create layerGroups
            this.senseboxMarkersLayerGreen = L.layerGroup(closestMarkersGreen);
            this.senseboxMarkersLayerYellow = L.layerGroup(closestMarkersYellow);
            this.senseboxMarkersLayerRed = L.layerGroup(closestMarkersRed);
            this.senseboxMarkersLayerBlue = L.layerGroup(closestMarkersBlue);

            // Add layerGroups to map
            this.layersControl.overlays['Green SenseBoxes'] = this.senseboxMarkersLayerGreen;
            this.layersControl.overlays['Yellow SenseBoxes'] = this.senseboxMarkersLayerYellow;
            this.layersControl.overlays['Red SenseBoxes'] = this.senseboxMarkersLayerRed;
            this.layersControl.overlays['Closest/My SenseBox'] = this.senseboxMarkersLayerBlue;
            this.layersControl.overlays['Green SenseBoxes'].addTo(this.map);
            this.layersControl.overlays['Yellow SenseBoxes'].addTo(this.map);
            this.layersControl.overlays['Red SenseBoxes'].addTo(this.map);
            this.layersControl.overlays['Closest/My SenseBox'].addTo(this.map);
        } else {
            if (this.senseboxMarkersLayerGreen !== undefined) {
                this.map.removeLayer(this.senseboxMarkersLayerGreen);
            }
            if (this.senseboxMarkersLayerYellow !== undefined) {
                this.map.removeLayer(this.senseboxMarkersLayerYellow);
            }
            if (this.senseboxMarkersLayerRed !== undefined) {
                this.map.removeLayer(this.senseboxMarkersLayerRed);
            }
            if (this.senseboxMarkersLayerBlue !== undefined) {
                this.map.removeLayer(this.senseboxMarkersLayerBlue);
            }
            if (this.senseboxMarkersLayerGreen === undefined && this.senseboxMarkersLayerYellow === undefined && this.senseboxMarkersLayerRed === undefined && this.senseboxMarkersLayerBlue === undefined || this.metadata.closestSenseBox === null || this.metadata.closestSenseBox === undefined) {
                this.onMessageChange.emit('No SenseBoxes around.');
            }
            delete this.layersControl.overlays['Green SenseBoxes'];
            delete this.layersControl.overlays['Yellow SenseBoxes'];
            delete this.layersControl.overlays['Red SenseBoxes'];
            delete this.layersControl.overlays['Closest/MY SenseBox'];
        }
    }

    // Create Popop-Description for senseBoxes
    getSenseboxPopupDescription(sensebox: SenseBox): string {
        let sensorTitle = "<b>" + sensebox.name + "</b>";
        let updatedAt = sensebox.updatedAt.substring(0, 10) + " :  " + sensebox.updatedAt.substring(11, 16);
        let sensorsDescription: String = "";
        let id = 'a' + sensebox._id;
        let makeThisMySenseBox = "<button id='" + id + "'>Make this my home SenseBox</button>";
        for (let i = 0; i < sensebox.sensors.length; i++) {
            if (sensebox.sensors[i].lastMeasurement != null && sensebox.sensors[i].lastMeasurement) {
                sensorsDescription += sensebox.sensors[i].title + ": " + sensebox.sensors[i].lastMeasurement.value + "<br>";
            }
        }
        return sensorTitle + "<br>" + updatedAt + "<br>" + sensorsDescription + makeThisMySenseBox;
    }

    // Round a number
    round(number, precision) {
        let factor = Math.pow(10, precision);
        let tempNumber = number * factor;
        let roundedTempNumber = Math.round(tempNumber);
        return roundedTempNumber / factor;
    };
}
