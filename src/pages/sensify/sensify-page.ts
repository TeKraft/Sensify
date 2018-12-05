import { ApiProvider } from '../../providers/api/api';
import { Metadata, SenseBox } from '../../providers/model';
import { Component, ViewChild} from '@angular/core';
import { IonicPage, NavController, NavParams, Platform, Select } from 'ionic-angular';
import { Geolocation, Geoposition } from "@ionic-native/geolocation";
import * as L from "leaflet";
import { Storage } from '@ionic/storage';
import { LocalNotifications } from '@ionic-native/local-notifications';

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

    @ViewChild('mySelect') selectRef: Select;

    public metadata: Metadata;
    public startLocation: L.LatLng;
    public radius: number;
    public globalMessage = {
        show: false,
        message: null
    };
    public loadingSpinner: Loading = {
        show: false,
        message: null,
        messages: [],
    };

    public distanceToClosest;

    tab: String;
    tabSelector: String;
    start: boolean;
    map: boolean;
    about: boolean;
    currentPos: Geoposition;
    settingsData: any;

    constructor(public navCtrl: NavController, public navParams: NavParams, private api: ApiProvider, private geolocation: Geolocation,private storage: Storage, private localNotifications: LocalNotifications, private plt: Platform) {
        // check for localStorage
        this.metadata = {
            settings: {
                gps: true,
                radius: 5,
                timestamp: null,
                ranges: { temperature: 5 },
                zoomLevel: null,
                mapView: null
            }
        };
        this.radius = 5;
        this.storage.set("metadata", this.metadata);
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

    public openSelect() {
        this.selectRef.open();
    }

    public closeSelect() {
        this.selectRef.close();
    }


    public async initSenseBoxes() {
        console.log('Start initSenseBoxes');
        try {
            var currentDate = new Date();
            this.metadata.settings.timestamp = currentDate; 
            this.showGlobalMessage('No SenseBoxes around.');
            this.toggleSpinner(true, 'Loading user position.');
            await this.getUserPosition().then(userlocation => {
                this.metadata.settings.location = userlocation;
                this.startLocation = userlocation;
            });
            this.toggleSpinner(false, 'Loading user position.');
            await this.getMetadata().then(meta => {
                this.metadata = meta;
                this.radius = meta.settings.radius;
            });
            this.toggleSpinner(true, 'Loading SenseBoxes.');
            await this.api.getSenseBoxes(this.metadata.settings.location, this.metadata.settings.radius)
                .then(res => {
                    this.metadata.senseBoxes = res;
                });
            this.toggleSpinner(false, 'Loading SenseBoxes.');
            this.updateMetadata();
            this.toggleSpinner(true, 'Loading closest SenseBox.');

            //if personal sensebox is saved, use it instead of searching for closestSenseBox. If not, search closestSenseBox like usually
            if(this.metadata.settings.mySenseBox){
                await this.api.getSenseBoxByID(this.metadata.settings.mySenseBox).then((box : SenseBox) => {
                    this.metadata.closestSenseBox = box;
                    if(this.metadata.senseBoxes.indexOf(box) < 0){
                        this.metadata.senseBoxes.push(box);
                    }
                  if(this.metadata.settings.location && this.metadata.closestSenseBox){
                    this.distanceToClosest = this.metadata.settings.location.distanceTo(this.metadata.closestSenseBox.location);
                  }
                })
            }else{
                await this.api.getclosestSenseBox(this.metadata.senseBoxes, this.metadata.settings.location)
                    .then((closestBox : SenseBox) => {
                        this.metadata.closestSenseBox = closestBox;
                        if(this.metadata.settings.location && this.metadata.closestSenseBox){
                            this.distanceToClosest = this.metadata.settings.location.distanceTo(this.metadata.closestSenseBox.location);
                        }
                    });
            }
            this.toggleSpinner(false, 'Loading closest SenseBox.');
            this.updateMetadata();

            // TEST: VALIDATE TEMPERATURE VALUE OF CLOSEST SENSEBOX          
            // console.log("SenseBox Sensor Value for Temperature Valid? : "+this.api.sensorIsValid("Temperatur", this.metadata.closestSenseBox, this.metadata.senseBoxes, this.metadata.settings.ranges.temperature));
        }
        catch (err) {
            console.error(err);
        }
    }

    /**
     * Function to display and verify message of loading spinner.
     * @param show {boolean} Should be true, if spinner is visible.
     * @param msg {string} Should be the displayed message.
     */
    public toggleSpinner(show: boolean, msg: string) {
        this.globalMessage.show = false;
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

        if (!this.loadingSpinner.show && (!this.metadata.senseBoxes || (this.metadata.senseBoxes && this.metadata.senseBoxes.length <= 0)) ) {
            this.globalMessage.show = true;
        }
        return;
    }

    public async updateBoxes() {
        await this.updateMetadata();
        await this.toggleSpinner(true, 'Updating SenseBoxes.');
        // Check whether radius gets bigger or smaller
        if(this.radius <= this.metadata.settings.radius){
            await this.getBoxesSmallerRadius()
                .then(res => {
                    this.metadata.senseBoxes = res;
                })
        } else {
            await this.api.getSenseBoxes(this.metadata.settings.location, this.metadata.settings.radius)
                .then(res => {
                    this.metadata.senseBoxes = res;
                    if(this.metadata.senseBoxes.indexOf(this.metadata.closestSenseBox) < 0){
                        this.metadata.senseBoxes.push(this.metadata.closestSenseBox);
                    }
                });
        }
        this.radius = this.metadata.settings.radius;
        await this.toggleSpinner(false, 'Updating SenseBoxes.');
        await this.updateMetadata();
        await this.toggleSpinner(true, 'Updating closest SenseBox.');
        if(this.radius > this.metadata.settings.radius && !this.metadata.settings.mySenseBox){
            await this.api.getclosestSenseBox(this.metadata.senseBoxes, this.metadata.settings.location).then(closestBox => {
                this.metadata.closestSenseBox = closestBox;
                if(this.metadata.settings.location && this.metadata.closestSenseBox){
                    this.distanceToClosest = this.metadata.settings.location.distanceTo(this.metadata.closestSenseBox.location);
                }
            });
        }
        await this.toggleSpinner(false, 'Updating closest SenseBox.');
        await this.updateMetadata();
    }
    
    private updateMetadata() {
        this.metadata = {
            settings: this.metadata.settings,
            senseBoxes: this.metadata.senseBoxes,
            closestSenseBox: this.metadata.closestSenseBox
        };
        return;
    }

    public changeTab(tab) {
        this.tabSelector = tab;
    }

    public setMetadata(metadata: Metadata) {
        var currentDate = new Date();
        this.metadata = metadata;
        this.metadata.settings.timestamp = currentDate;
        this.updateBoxes();
        this.storage.set("metadata", this.metadata);
    }

    public showGlobalMessage(msg: string) {
        this.globalMessage = {
            show: true,
            message: msg
        }
    }

    // Get the Metadata from storage
    getMetadata(): Promise<Metadata> {
      return this.storage.get('metadata')
        .then((val) => {
          return {
            settings: {
              gps: val ? val.settings.gps : true,
              radius: val ? val.settings.radius : 5,
              timestamp: val? val.settings.timestamp: " : ",
              ranges: val ? val.settings.ranges : { temperature: 5 },
              location: this.metadata.settings.location ? this.metadata.settings.location : ( val && val.settings.location ? val.settings.location : null ),
              zoomLevel: val.settings.zoomLevel ? val.settings.zoomLevel : 13,
              mapView: this.metadata.settings.mapView ? this.metadata.settings.mapView : null
            },
            senseBoxes: this.metadata.senseBoxes ? this.metadata.senseBoxes : ( val && val.senseBoxes ? val.senseBoxes : null ),
            closestSenseBox: this.metadata.closestSenseBox ? this.metadata.closestSenseBox : ( val && val.closestSenseBox ? val.closestSenseBox : null )
          };
        }, (error) => {
          return error;
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
                return new L.LatLng(51.9695, 7.5961);
                // return error;
            });
    }

    // If radius gets smaller, compute the new SenseBoxes
    getBoxesSmallerRadius():Promise<SenseBox[]>{
        return new Promise(resolve => {
            let tempBoxes: SenseBox[] = [];
            for(let i = 0; i < this.metadata.senseBoxes.length; i++) {
                let distance: number = this.metadata.settings.location.distanceTo(this.metadata.senseBoxes[i].location) / 1000;
                if (distance <= this.radius) {
                    tempBoxes.push(this.metadata.senseBoxes[i]);
                } else if(distance > this.radius && this.metadata.closestSenseBox._id == this.metadata.senseBoxes[i]._id){
                    tempBoxes.push(this.metadata.senseBoxes[i]);
                }
            }
            resolve(tempBoxes);
        });
    }

    /*
    // Watch the user position
    subscription = this.geolocation.watchPosition()
        .subscribe(pos => {
            console.log('watch position');
            // let location = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
            let location = new L.LatLng(7.5961, 51.9695);
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
        */

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
            console.log("Notifications are disabled: Not a real device or emulator");
        }
    }
}
