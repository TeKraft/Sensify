import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NavController} from 'ionic-angular';
import { tileLayer } from "leaflet";
import * as L from "leaflet";
import { Metadata, SenseBox } from "../../../providers/model";
import {OnChanges} from '@angular/core';

@Component({
    selector: 'sensify-page-map',
    templateUrl: 'sensify-map.html',
})
export class SensifyMapPage implements OnChanges {

    @Input()
    public metadata: Metadata;

    @Output()
    public onMessageChange: EventEmitter<string> = new EventEmitter();;

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
    public senseboxMarkersLayer: L.LayerGroup;

    constructor(
        public navCtrl: NavController) {}

    public greenIcon = L.icon({
        iconUrl: '../../assets/imgs/greenMarker.png',
        iconSize: [25, 40],
        iconAnchor: [12, 40],
        popupAnchor: [-3, -76]
    });

    public redIcon = L.icon({
        iconUrl: '../../assets/imgs/redMarker.png',
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
        console.log(changes);
        if (changes.metadata && this.map) {
            this.updateMap();
        }
    }

    onMapReady(map: L.Map) {
        this.map = map;
        this.updateMap();
    }

    public updateMap() {
        if (this.metadata.settings.location) {
            this.addUserLocationToMap();
            this.addSenseboxMarkerToMap();
        }
    }

    public addUserLocationToMap() {
        // Center map on user location
        this.map.panTo(this.metadata.settings.location);

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
            let closestBoxesMarkers = [];
            for (let i = 0; i < this.metadata.senseBoxes.length; i++) {
                // Generate marker-description
                let popupDescription = SensifyMapPage.getSenseboxPopupDescription(this.metadata.senseBoxes[i]);
                // Generate marker
                if (this.metadata.senseBoxes[i].location != this.metadata.closestSenseBox.location){
                    let marker = L.marker(this.metadata.senseBoxes[i].location, 
                        { icon: this.greenIcon })
                        .bindPopup(popupDescription);
                    // Add marker to map
                    closestBoxesMarkers.push(marker);
                } else {//ClosestSenseBox Marker
                    let marker = L.marker(this.metadata.senseBoxes[i].location, 
                        { icon: this.redIcon })
                        .bindPopup(popupDescription);
                    // Add marker to map
                    closestBoxesMarkers.push(marker);
                }
            }
    
            // Check if markers were already set; delete them if yes -> update markers
            if (this.senseboxMarkersLayer != undefined) {
                this.map.removeLayer(this.senseboxMarkersLayer);
                this.senseboxMarkersLayer = undefined;
                this.layersControl.overlays['SenseBoxes'] = {};
            }
            //line from user to closest box
            let lineCoords = [[this.metadata.settings.location, this.metadata.closestSenseBox.location]];
            let polyline = L.polyline(lineCoords, {color:'red'});
            closestBoxesMarkers.push(polyline);
            this.senseboxMarkersLayer = L.layerGroup(closestBoxesMarkers);
            this.layersControl.overlays['SenseBoxes'] = this.senseboxMarkersLayer;
            this.layersControl.overlays['SenseBoxes'].addTo(this.map);
        } else {
            this.metadata.senseBoxes !== null ? console.log(this.metadata.senseBoxes.length) : console.log('senseboxes ==== null');
            if (this.senseboxMarkersLayer !== undefined) {
                this.map.removeLayer(this.senseboxMarkersLayer);
            }
            if (this.senseboxMarkersLayer === undefined || this.metadata.closestSenseBox === null || this.metadata.closestSenseBox === undefined) {
                this.onMessageChange.emit('No SenseBoxes around.');
            }
            delete this.layersControl.overlays['SenseBoxes'];
        }        
        
    }

    static getSenseboxPopupDescription(sensebox: SenseBox): string{
        let sensorTitle = "<b>" + sensebox.name + "</b>";
        let sensorsDescription : String = "";
        for (let i = 0; i < sensebox.sensors.length; i++) {
            if (sensebox.sensors[i].lastMeasurement != null && sensebox.sensors[i].lastMeasurement) {
                sensorsDescription += sensebox.sensors[i].title + ": " + sensebox.sensors[i].lastMeasurement.value + "<br>";
            }
        }
        return sensorTitle + "<br>" + sensorsDescription;
    }
}
