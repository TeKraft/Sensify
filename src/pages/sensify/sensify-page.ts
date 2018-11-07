import { ApiProvider } from '../../providers/api/api';
import { Metadata, SenseBox } from '../../providers/model';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { Geolocation, Geoposition } from "@ionic-native/geolocation";
import * as L from "leaflet";
import { SenseBoxPage } from '../sense-box/sense-box';


@IonicPage()
@Component({
    selector: 'sensify-page',
    templateUrl: 'sensify-page.html',
})
export class SensifyPage {

    public metadata: Metadata;

    tab: String;
    tabSelector: String;
    start: boolean;
    map: boolean;
    about: boolean;
    currentPos: Geoposition;

    constructor(public navCtrl: NavController, public navParams: NavParams, private api: ApiProvider, private geolocation: Geolocation) {
        // TODO: check for localStorage
        this.metadata = {
            settings: {
                gps: true,
                radius: 20,
                ranges: {
                    temperature: 5
                }
            }
        }
        this.initSenseBoxes();
    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad SensifyPage');
        this.tabSelector = 'start';
    }

    public async initSenseBoxes() {
        console.log('Initialising UserLocation and SenseBoxes');
        try {
            this.metadata.settings.location = await this.getUserPosition();
            this.metadata.senseBoxes = await this.api.getClosestSenseBoxes(this.metadata.settings.location, this.metadata.settings.radius);
            const closestBox = await this.api.getclosestSenseBox(this.metadata.senseBoxes, this.metadata.settings.location);
            this.metadata = {
                settings: this.metadata.settings,
                senseBoxes: this.metadata.senseBoxes,
                closestSenseBox: closestBox
            }
            //Test for Validation!!! Can be called from anywhere via API
            this.api.validateSenseBoxTemperature(this.metadata.closestSenseBox, this.metadata.senseBoxes, this.metadata.settings.ranges.temperature);
        }
        catch (err) {
            console.log(err);
        }
    }

    public changeTab(tab) {
        this.tabSelector = tab;
    }

    public setMetadata(metadata: Metadata) {
        console.log(metadata);
        // TODO: adapt localStorage with new settings
    }

    /**
     * ##############################
     * Positioning
     * ##############################
     */

    // Get the current location
    getUserPosition(): Promise<L.LatLng> {
        // TODO: check if this.settings.gps === true
        return this.geolocation.getCurrentPosition()
            .then((pos: Geoposition) => {
                // this.metadata.settings.location = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
                return new L.LatLng(pos.coords.latitude, pos.coords.longitude);
            }, (error) => {
                return error;
            });
    }

    // Watch the user position
    subscription = this.geolocation.watchPosition()
        .subscribe(pos => {
            console.log('watch position');
            let location = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
            // necessary to re-define this.settings to trigger ngOnChanges in sensify.map.ts
            this.metadata = {
                settings: {
                    location: location,
                    radius: this.metadata.settings.radius,
                    ranges: this.metadata.settings.ranges,
                    gps: this.metadata.settings.gps
                },
                senseBoxes: this.metadata.senseBoxes,
                closestSenseBox: this.metadata.closestSenseBox
            }
        });

    // TODO: getClosestSenseBoxes (only in sensify-page.ts) & set metadata.closestSenseBoxes
    // this.metadata.senseBoxes = this.api. requests
}