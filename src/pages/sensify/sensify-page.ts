import { ApiProvider } from '../../providers/api/api';
import { Metadata } from '../../providers/model';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular';
import { Geolocation, Geoposition } from "@ionic-native/geolocation";
import * as L from "leaflet";
import { Storage } from '@ionic/storage';
import { LocalNotifications } from '@ionic-native/local-notifications'

interface Loading {
    show: boolean,
    message: string,
    messages: string[]
}

@IonicPage()
@Component({
    selector: 'sensify-page',
    templateUrl: 'sensify-page.html',
})
export class SensifyPage {

    public metadata: Metadata;
    public startLocation: L.LatLng;

    public globalMessage;
    public loadingSpinner: Loading = {
        show: false,
        message: null,
        messages: [],
    };

    tab: String;
    tabSelector: String;
    start: boolean;
    map: boolean;
    about: boolean;
    currentPos: Geoposition;

    constructor(public navCtrl: NavController, public navParams: NavParams, private api: ApiProvider, private geolocation: Geolocation,private storage: Storage, private localNotifications: LocalNotifications, private plt: Platform) {
        // check for localStorage
        this.metadata = {
            settings: {
                gps: true,
                radius: 5,
                ranges: { temperature: 5 }
            }
        }
        this.globalMessage = {
            show: false,
            message: null
        };
        this.getMetadata();
        this.initSenseBoxes();

        //On Notification click display data property of notification
        if (this.plt.is('cordova')) {
            this.plt.ready().then(rdy => {
                this.localNotifications.on('click').subscribe(res => {
                    alert(res.data);
                });
            });
        }
    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad SensifyPage');
        this.tabSelector = 'start';
        
        //example notification 
        this.setNotificationWithTimer(0.2,"Test","Hey! Open up your Sensify-App for a quick update :)","Works like a charm.");
    }

    public async initSenseBoxes() {
        console.log('Initialising UserLocation and SenseBoxes');
        try {
            this.showGlobalMessage('No SenseBoxes around.');
            this.toggleSpinner(true, 'Loading user position.');
            await this.getUserPosition().then(userlocation => {
                this.metadata.settings.location = userlocation;
                this.startLocation = userlocation;
            });
            this.toggleSpinner(false, 'Loading user position.');
            this.updateMetadata();
            this.toggleSpinner(true, 'Loading SenseBoxes.');
            await this.api.getSenseBoxesInBB(this.metadata.settings.location, this.metadata.settings.radius).then(res => { this.metadata.senseBoxes = res; });
            this.toggleSpinner(false, 'Loading SenseBoxes.');
            this.updateMetadata();
            this.toggleSpinner(true, 'Loading closest SenseBox.');
            await this.api.getclosestSenseBox(this.metadata.senseBoxes, this.metadata.settings.location).then(closestBox => { this.metadata.closestSenseBox = closestBox; });
            this.toggleSpinner(false, 'Loading closest SenseBox.');
            this.updateMetadata();

            // Test for Validation!!! Can be called from anywhere via API
            this.api.validateSenseBoxTemperature(this.metadata.closestSenseBox, this.metadata.senseBoxes, this.metadata.settings.ranges.temperature);
        }
        catch (err) {
            console.log(err);
        }
    }

    /**
     * Function to display and verify message of loading spinner.
     * @param show {boolean} Should be true, if spinner is visible.
     * @param msg {string} Should be the displayed message.
     */
    public toggleSpinner(show: boolean, msg: string) {
        this.globalMessage = {
            show: false,
            message: ''
        }
        let idx = this.loadingSpinner.messages.findIndex(el => el === msg);
        this.loadingSpinner.show = show;
        if (idx >= 0) {
            this.loadingSpinner.messages.splice(idx, 1);
            if (this.loadingSpinner.messages.length > 0) {
                this.loadingSpinner.show = true;
                this.loadingSpinner.message = this.loadingSpinner.messages[this.loadingSpinner.messages.length - 1];
            } else {
                this.loadingSpinner.show = false;
            }
        } else if (show) {
            this.loadingSpinner.messages.push(msg);
            this.loadingSpinner.message = msg;
        }
        return;
    }

    public async updateBoxes() {
        this.globalMessage = {
            show: false,
            message: ""
        }
        await this.updateMetadata();
        await this.toggleSpinner(true, 'Updating SenseBoxes.');
        await this.api.getSenseBoxesInBB(this.metadata.settings.location, this.metadata.settings.radius).then(res => { this.metadata.senseBoxes = res; });
        await this.toggleSpinner(false, 'Updating SenseBoxes.');
        await this.updateMetadata();
        await this.toggleSpinner(true, 'Updating closest SenseBox.');
        await this.api.getclosestSenseBox(this.metadata.senseBoxes, this.metadata.settings.location).then(closestBox => { this.metadata.closestSenseBox = closestBox; });
        await this.toggleSpinner(false, 'Updating closest SenseBox.');
        await this.updateMetadata();
    }
    
    private updateMetadata() {
        this.metadata = {
            settings: this.metadata.settings,
            senseBoxes: this.metadata.senseBoxes,
            closestSenseBox: this.metadata.closestSenseBox
        }
        return;
    }

    public changeTab(tab) {
        this.tabSelector = tab;
    }

    public setMetadata(metadata: Metadata) {
        this.metadata = metadata;
        this.storage.set("metadata", this.metadata);
    }

    public showGlobalMessage(msg: string) {
        this.globalMessage = {
            show: true,
            message: msg
        }
    }

    public getMetadata() {
        this.storage.get('metadata')
            .then((val) => {
                console.log("Meta: ", val);
                this.metadata = {
                    settings: {
                        gps: val ? val.settings.gps : true,
                        radius: val ? val.settings.radius : 5,
                        ranges: val ? val.settings.ranges : { temperature: 5 },
                        location: this.metadata.settings.location ? this.metadata.settings.location : ( val && val.settings.location ? val.settings.location : null )
                    },
                    senseBoxes: this.metadata.senseBoxes ? this.metadata.senseBoxes : ( val && val.senseBoxes ? val.senseBoxes : null ),
                    closestSenseBox: this.metadata.closestSenseBox ? this.metadata.closestSenseBox : ( val && val.closestSenseBox ? val.closestSenseBox : null )
                }
            });
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
            this.metadata.settings.location = location;
            if (location.distanceTo(this.startLocation) / 1000 >= this.metadata.settings.radius / 2) {
                this.startLocation = this.metadata.settings.location;
                this.updateBoxes();
            }

            if (this.metadata.senseBoxes && this.metadata.settings.location) {
                this.api.getclosestSenseBox(this.metadata.senseBoxes, this.metadata.settings.location).then(closestBox => {
                    this.metadata.closestSenseBox = closestBox;
                    this.metadata = this.metadata;
                });
            }
        });

    //Set notification with time in minutes from now, Title, Text, data that will be visible on click
    setNotificationWithTimer(time : number, title : String, text : String, data : String){
        let timeInMS = time * 1000 * 60;    //time * 60 = time in seconds, time * 1000 = time in ms
        if (this.plt.is('cordova')) {
            this.localNotifications.schedule({
                id: 1,
                trigger: { at: new Date(new Date().getTime() + timeInMS) }, 
                title: ""+title,
                text: ""+text,
                data: ""+data
            });
        } else {
            console.log("Notifications are not set because you ain't on a real device or emulator.");
        }
    }


    // TODO: getClosestSenseBoxes (only in sensify-page.ts) & set metadata.closestSenseBoxes
    // this.metadata.senseBoxes = this.api. requests
}