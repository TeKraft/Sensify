import { Component, ElementRef, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { NavController } from 'ionic-angular';
import * as L from "leaflet";
import "leaflet.awesome-markers";
import { Metadata, SenseBox } from "../../../providers/model";
import { helpers } from "./../../../providers/service/helpers";
import { map } from 'rxjs/operator/map';

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

    public map: L.Map;
    public layersControl: L.Control.Layers;
    public radiusCircle: L.CircleMarker;
    public locatorButton: L.Control;
    public LegendButton: L.Control;
    public DrawButton: L.Control;
    public userLocationMarker: L.Marker;
    public userLocationMarkerLayer: L.LayerGroup;
    public senseboxMarkersLayerGreen: L.LayerGroup;
    public senseboxMarkersLayerYellow: L.LayerGroup;
    public senseboxMarkersLayerRed: L.LayerGroup;
    public senseboxMarkersLayerBlue: L.LayerGroup;
    public distanceToClosestString: String;

    constructor(
        public navCtrl: NavController,
        private elementRef: ElementRef,
        private helpers: helpers,
    ) {}

    ngOnChanges(changes): void {
        if (changes.metadata && this.map) {
            this.updateMap();
        }
    }

    public LeafletOptions = {
        layers: [
            L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        ],
        zoom: 13,
        center: [0, 0]
    };

    onMapReady(map: L.Map) {
        this.map = map;
        this.map.on('moveend', e => {
            this.metadata.settings.zoomLevel = e.target.getZoom();
            let tempView = e.target.getCenter();
            this.metadata.settings.mapView = new L.LatLng(tempView.lat, tempView.lng);
            // this.onMetadataChange.emit(this.metadata);
        });

        this.layersControl = L.control.layers(null, {}, { position: 'topleft' }).addTo(this.map);
        // Custom Controls
        this.locatorButton = new this.locateButton();
        this.LegendButton = new this.legendButton();
        this.DrawButton = new this.drawButton();

        this.map.addControl(this.LegendButton);
        this.map.addControl(this.locatorButton);
        this.map.addControl(this.DrawButton);

        this.map.zoomControl.setPosition('topleft');
        this.LegendButton.setPosition('topleft');
        this.locatorButton.setPosition('topleft');
        this.DrawButton.setPosition('topleft');

        this.map.on('click', (e: any) => {
            if (this.metadata.settings.setPositionManual) {
                this.metadata.settings.location = e.latlng;
                this.updateMap();
            }
            // var marker = new L.marker(e.latlng).addTo(map);
        });

        // Add layers to map
        if (this.metadata.settings.location) {
            this.addUserLocationToLayer();
            this.addSenseboxMarkerToMap();
        }
    }

    public updateMap() {
        if (this.metadata.settings.location) {
            this.updateLayerControl();
            this.addUserLocationToLayer();
            this.addSenseboxMarkerToMap();
        }
    }

    private updateLayerControl() {
        this.map.removeControl(this.layersControl);
        this.layersControl = L.control.layers(null, {}, { position: 'topleft' }).addTo(this.map);
    }

    public addUserLocationToLayer() {
        // if => user position | else => saved position
        if (this.metadata.settings.zoomLevel && this.metadata.settings.mapView) {
            this.map.setView(this.metadata.settings.mapView, this.metadata.settings.zoomLevel);
        } else {
            this.map.setView(this.metadata.settings.location, this.metadata.settings.zoomLevel);
        }

        // Create marker with user location + description
        let userlocation = this.metadata.settings.location;
        let popupDescription = "<b>Your position is:</b><br>Latitude: "
            + userlocation.lat.toFixed(4)
            + "<br>Longitude: "
            + userlocation.lng.toFixed(4)
            + "<br>Timestamp at position: "
            + this.metadata.settings.timestamp.getHours()
            + ":"
            + this.metadata.settings.timestamp.getMinutes()
            + "<p><b>Closest SenseBox is:</b><br>'"
            + (this.metadata.closestSenseBox ? this.metadata.closestSenseBox.name : "Not set");
            + "'";
        this.userLocationMarker = this.createMarker('darkred', userlocation, popupDescription, 'customBlue');

        // Add Layergroup to userLocationMarkerLayer
        this.userLocationMarkerLayer = this.removeLayerGroup(this.userLocationMarkerLayer);
        this.userLocationMarkerLayer = L.layerGroup([this.userLocationMarker]).addTo(this.map);
    }

    // Add senseBoxes to Map
    public addSenseboxMarkerToMap() {
        if (this.metadata.senseBoxes && this.metadata.closestSenseBox && this.metadata.senseBoxes.length > 0) {
            let closestMarkersRed: L.Marker[] = [];
            let closestMarkersYellow: L.Marker[] = [];
            let closestMarkersGreen: L.Marker[] = [];
            let closestMarkersBlue: L.Marker[] = [];
            for (let i = 0; i < this.metadata.senseBoxes.length; i++) {
                let marker: L.Marker;
                if (this.metadata.senseBoxes[i]) {
                    let currentSensebox = this.metadata.senseBoxes[i];
                    let popupDescription = this.getSenseboxPopupDescription(currentSensebox);

                    if (currentSensebox._id != this.metadata.closestSenseBox._id) {
                        let location = this.metadata.senseBoxes[i].location;
                        switch (this.metadata.senseBoxes[i].updatedCategory) {
                            case 'today': {
                                if (currentSensebox.isVerified) {
                                    marker = this.createMarker('green', location, popupDescription, 'customGreen');
                                    closestMarkersGreen.push(marker);
                                } else {
                                    marker = this.createMarker('purple', location, popupDescription, 'customRed');
                                    closestMarkersGreen.push(marker);
                                }
                                break;
                            }
                            case 'thisWeek': {
                                marker = this.createMarker('orange', location, popupDescription, 'customOrange');
                                closestMarkersYellow.push(marker);
                                break;
                            }
                            case 'tooOld': {
                                marker = this.createMarker('red', location, popupDescription, 'customRed');
                                closestMarkersRed.push(marker);
                                break;
                            }
                            default: {
                                this.helpers.showAlert('Error', 'Ups, something went wrong here.');
                                break;
                            }
                        }
                    } else {
                        marker = this.createMarker('blue', this.metadata.closestSenseBox.location, popupDescription, 'customGreen');
                        closestMarkersBlue.push(marker);
                        // Calculate and style distance distance to ClosestSenseBox
                        let distanceToBox = this.metadata.settings.location.distanceTo(this.metadata.closestSenseBox.location);
                        if (distanceToBox > 999) {
                            distanceToBox = distanceToBox / 1000;
                            this.distanceToClosestString = this.round(distanceToBox, 2) + " km";
                        } else {
                            this.distanceToClosestString = this.round(distanceToBox, 2) + " m";
                        }
                    }

                    // check if closestSenseBox exists in senseBoxes array (if closestSB is inside radius)
                    let idxOutside = this.metadata.senseBoxes.findIndex(el => el._id === this.metadata.closestSenseBox._id);

                    // should be executed only once
                    if (i === this.metadata.senseBoxes.length - 1 && idxOutside < 0) {
                        marker = this.createMarker('blue', this.metadata.closestSenseBox.location, popupDescription, 'customGreen');
                        closestMarkersBlue.push(marker);
                        // Calculate and style distance distance to ClosestSenseBox
                        let distanceToBox = this.metadata.settings.location.distanceTo(this.metadata.closestSenseBox.location);
                        if (distanceToBox > 999) {
                            distanceToBox = distanceToBox / 1000;
                            this.distanceToClosestString = this.round(distanceToBox, 2) + " km";
                        } else {
                            this.distanceToClosestString = this.round(distanceToBox, 2) + " m";
                        }
                    }
                }
                if (marker) {
                    marker.on('popupopen', () => {
                        this.elementRef.nativeElement.querySelector("#a" + this.metadata.senseBoxes[i]._id).addEventListener('click', (e) => {
                            this.metadata.closestSenseBox = this.metadata.senseBoxes[i];
                            this.metadata.settings.mySenseBox = this.metadata.senseBoxes[i]._id;
                            if (!this.metadata.settings.mySenseBoxIDs) {
                                this.metadata.settings.mySenseBoxIDs = [];
                            }
                            let idx = this.metadata.settings.mySenseBoxIDs.findIndex(el => el === this.metadata.settings.mySenseBox);
                            // slice deleted id from sensebox array
                            if (idx < 0) {
                                this.metadata.settings.mySenseBoxIDs.push(this.metadata.settings.mySenseBox);
                            }
                            this.updateMap();
                            this.helpers.showAlert('Success', 'New home SenseBox was set');
                        })
                    })
                }
            } // End Create Markers

            // Check if markers were already set; If yes: Remove Layer
            this.senseboxMarkersLayerGreen = this.removeLayerGroup(this.senseboxMarkersLayerGreen);
            this.senseboxMarkersLayerYellow = this.removeLayerGroup(this.senseboxMarkersLayerYellow);
            this.senseboxMarkersLayerRed = this.removeLayerGroup(this.senseboxMarkersLayerRed);
            this.senseboxMarkersLayerBlue = this.removeLayerGroup(this.senseboxMarkersLayerBlue);

            // Create and add layerGroups to map (for markers)
            this.senseboxMarkersLayerGreen = this.createLayerGroupsForMarkers(closestMarkersGreen, this.senseboxMarkersLayerGreen, true);
            this.senseboxMarkersLayerYellow = this.createLayerGroupsForMarkers(closestMarkersYellow, this.senseboxMarkersLayerYellow, false);
            this.senseboxMarkersLayerRed = this.createLayerGroupsForMarkers(closestMarkersRed, this.senseboxMarkersLayerRed, false);
            this.senseboxMarkersLayerBlue = this.createLayerGroupsForMarkers(closestMarkersBlue, this.senseboxMarkersLayerBlue, true);

            if (this.senseboxMarkersLayerGreen) this.layersControl.addOverlay(this.senseboxMarkersLayerGreen, 'Green SenseBoxes');
            if (this.senseboxMarkersLayerYellow) this.layersControl.addOverlay(this.senseboxMarkersLayerYellow, 'Yellow SenseBoxes');
            if (this.senseboxMarkersLayerRed) this.layersControl.addOverlay(this.senseboxMarkersLayerRed, 'Red SenseBoxes');
            if (this.senseboxMarkersLayerBlue) this.layersControl.addOverlay(this.senseboxMarkersLayerBlue, 'Nearest/My SenseBoxes');

            // Connect user with closest SenseBox
            this.connectUserWithBox();

            // Draw radius-circle
            this.drawRadiusCircle();

        } else {
            if(this.metadata.settings.location){
                this.drawRadiusCircle();
            }
            if(this.metadata.closestSenseBox){
                let closestMarkersBlue: L.Marker[] = [];
                let popupDescription = this.getSenseboxPopupDescription(this.metadata.closestSenseBox);
                let marker: L.Marker;
                marker = this.createMarker('blue', this.metadata.closestSenseBox.location, popupDescription, 'customGreen');
                closestMarkersBlue.push(marker);
                // Calculate and style distance distance to ClosestSenseBox
                let distanceToBox = this.metadata.settings.location.distanceTo(this.metadata.closestSenseBox.location);
                if (distanceToBox > 999) {
                    distanceToBox = distanceToBox / 1000;
                    this.distanceToClosestString = this.round(distanceToBox, 2) + " km";
                } else {
                    this.distanceToClosestString = this.round(distanceToBox, 2) + " m";
                }
                this.senseboxMarkersLayerBlue = this.removeLayerGroup(this.senseboxMarkersLayerBlue);
                this.senseboxMarkersLayerBlue = this.createLayerGroupsForMarkers(closestMarkersBlue, this.senseboxMarkersLayerBlue, true);
                if (this.senseboxMarkersLayerBlue) this.layersControl.addOverlay(this.senseboxMarkersLayerBlue, 'Nearest/My SenseBoxes');
                this.connectUserWithBox();
            }

            // Metadata was not set yet => No SenseBoxes found
            this.senseboxMarkersLayerGreen = this.removeLayerGroup(this.senseboxMarkersLayerGreen);
            this.senseboxMarkersLayerYellow = this.removeLayerGroup(this.senseboxMarkersLayerYellow);
            this.senseboxMarkersLayerRed = this.removeLayerGroup(this.senseboxMarkersLayerRed);
            if(!this.metadata.closestSenseBox) this.senseboxMarkersLayerBlue = this.removeLayerGroup(this.senseboxMarkersLayerBlue);

            if (this.senseboxMarkersLayerGreen === undefined &&
                this.senseboxMarkersLayerYellow === undefined &&
                this.senseboxMarkersLayerRed === undefined &&
                this.senseboxMarkersLayerBlue === undefined ||
                this.metadata.closestSenseBox === null ||
                this.metadata.closestSenseBox === undefined) {
                this.helpers.showAlert('Error', 'No SenseBoxes were found.');
            }
        }
    }

    public locateButton = L.Control.extend({
        options: {
            position: 'topleft'
        },
        onAdd: (map) => {
            var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.className = 'buttons';
            container.style.backgroundImage = 'url(../../assets/buttons/positionMarkerButton.png)';

            container.onclick = () => {
                if (this.metadata.settings.location) {
                    this.map.panTo(this.metadata.settings.location);
                    if(this.metadata.settings.mapView){
                        this.metadata.settings.mapView = null;
                        this.onMetadataChange.emit(this.metadata);
                    }
                }
            };
            return container;
        }
    });

    public legendButton = L.Control.extend({
        options: {
            position: 'topleft'
        },
        onAdd: (map) => {
            var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.className = 'buttons';
            container.style.backgroundImage = 'url(../../assets/buttons/questionMarkButton.png)';

            container.onclick = () => {
                let containerContent = "<ion-grid><ion-row><ion-col col-20><p><img style='height:30px' src='../../assets/markers/greenMarkerIcon.png'></ion-col><ion-col col-80>Data is valid & up-to-date (<24h)</p></ion-col></ion-row><ion-row><ion-col col-20><p><img style='height:30px' src='../../assets/markers/greenMarkerNotValidIcon.png'></ion-col><ion-col col-80>Data is NOT valid, but up-to-date (<24h)</p></ion-col></ion-row><ion-row><ion-col col-20><p><img style='height:30px' src='../../assets/markers/orangeMarkerIcon.png'></ion-col><ion-col col-80>Data is one week old</p></ion-col></ion-row><ion-row><ion-col col-20><p><img style='height:30px' src='../../assets/markers/redMarkerIcon.png'></ion-col><ion-col col-80>Data is older than one week</p></ion-col></ion-row><ion-row><ion-col col-20><p><img style='height:30px' src='../../assets/markers/blueMarkerIcon.png'></ion-col><ion-col col-80>Closest Sensebox</p></ion-col></ion-row><ion-row><ion-col col-20><p><img style='height:30px' src='../../assets/markers/positionMarkerIcon.png'></ion-col><ion-col col-80>User-Location</p></ion-col></ion-row></ion-grid>";
                /*let containerContent = "<ion-grid> <ion-row> <p><img style='height:30px' src='../../assets/markers/greenMarkerIcon.png'>Data is valid & up-to-date (&lt24h)</p> </ion-row> <ion-row> <p><img style='height:30px' src='../../assets/markers/greenMarkerNotValidIcon.png'>Data is NOT valid, but up-to-date (&lt24h)</p> </ion-row> <ion-row> <p><img style='height:30px' src='../../assets/markers/orangeMarkerIcon.png'>Data is one week old</p> </ion-row> <ion-row> <p><img style='height:30px' src='../../assets/markers/redMarkerIcon.png'>Data is older than one week</p> </ion-row> <ion-row> <p><img style='height:30px' src='../../assets/markers/blueMarkerIcon.png'>Closest Sensebox</p> </ion-row> <ion-row> <p><img style='height:30px' src='../../assets/markers/positionMarkerIcon.png'>User-Location</p> </ion-row> </ion-grid>";*/
                /*let containerContent = "<ion-grid> <ion-row> <p><img src='../../assets/markers/greenMarkerIcon.png'>Data is valid & up-to-date (&lt24h)</p> </ion-row> <ion-row> <p><img src='../../assets/markers/greenMarkerNotValidIcon.png'>Data is NOT valid, but up-to-date (&lt24h)</p> </ion-row> <ion-row> <p><img src='../../assets/markers/orangeMarkerIcon.png'>Data is one week old</p> </ion-row> <ion-row> <p><img src='../../assets/markers/redMarkerIcon.png'>Data is at most one week old</p> </ion-row> <ion-row> <p><img src='../../assets/markers/blueMarkerIcon.png'>Closest Sensebox</p> </ion-row> <ion-row> <p><img src='../../assets/markers/positionMarkerIcon.png'>User-Location</p> </ion-row> </ion-grid>";*/
                this.helpers.showAlert('Legend', containerContent);
            };
            return container;
        }
    });

    public drawButton = L.Control.extend({
        options: {
            position: 'topleft'
        },
        onAdd: (map) => {
            var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.className = 'buttons';
            container.style.backgroundImage = 'url(../../assets/buttons/setPositionManually.png)';

            container.onclick = () => {
                if (this.metadata.settings.setPositionManual) { // deactivate
                    container.style.backgroundImage = 'url(../../assets/buttons/setPositionManually.png)';
                    this.onMetadataChange.emit(this.metadata);
                } else { // set active
                    container.style.backgroundImage = 'url(../../assets/buttons/setPositionManuallyActive.png)';
                }
                this.metadata.settings.setPositionManual = !this.metadata.settings.setPositionManual;
            };
            return container;
        }
    });

    private createMarker(color: any, loc: L.LatLng, popupDescription: string, classname: string): L.Marker {
        let marker = new L.Marker(loc, {
            icon: L.AwesomeMarkers.icon({
                markerColor: color
            })
        }).bindPopup(
            popupDescription, {
                'className': classname
            }
        );
        return marker;
    }

    private connectUserWithBox() {
        let lineCoords = [[this.metadata.settings.location, this.metadata.closestSenseBox.location]];
        let line = L.polyline(lineCoords, {
            className: "line",
            dashArray: "10,15"
        });
        this.userLocationMarkerLayer.addLayer(line);
        this.layersControl.addOverlay(this.userLocationMarkerLayer, 'Me');
    }

    private drawRadiusCircle() {
        if (this.radiusCircle) {
            this.map.removeLayer(this.radiusCircle);
        }
        this.radiusCircle = L.circle(this.metadata.settings.location, {
            className: "circle",
            radius: this.metadata.settings.radius * 1000
        }).addTo(this.map);
    }

    private createLayerGroupsForMarkers(markerArray: L.Marker[], layer: L.LayerGroup, activeLayer: boolean): L.LayerGroup {
        if (markerArray.length > 0) {
            if (activeLayer) {
                layer = new L.LayerGroup(markerArray).addTo(this.map);
            } else {
                layer = new L.LayerGroup(markerArray);
            }
        }
        return layer;
    }

    private removeLayerGroup(layer: L.LayerGroup) {
        if (layer !== undefined) {
            this.map.removeLayer(layer);
            this.layersControl.removeLayer(layer);
        }
        return undefined;
    }

    private getSenseboxPopupDescription(sensebox: SenseBox): string {
        if (sensebox) {
            let sensorTitle = "<b>" + sensebox.name + "</b>";
            let sensorsDescription: String = "";
            let id = 'a' + sensebox._id;
            let makeThisMySenseBox = "<button id='" + id + "'>Make this my home SenseBox</button>";
            for (let i = 0; i < sensebox.sensors.length; i++) {
                if (sensebox.sensors[i].lastMeasurement != null && sensebox.sensors[i].lastMeasurement) {
                    sensorsDescription += sensebox.sensors[i].title + ": " + sensebox.sensors[i].lastMeasurement.value + "<br>";
                }
            }
            return sensorTitle + "<br>" + sensorsDescription + makeThisMySenseBox;
        }
    }

    private round(value, precision) {
        var multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }
}
