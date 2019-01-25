import { ApiProvider } from '../../providers/api/api';
import { Metadata, NotificationMessages, NotificationSensorTitles, NotificationThresholdValues, SenseBox } from '../../providers/model';
import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform, Select } from 'ionic-angular';
import { Geolocation, Geoposition } from "@ionic-native/geolocation";
import * as L from "leaflet";
import { Storage } from '@ionic/storage';
import { ILocalNotification, LocalNotifications } from '@ionic-native/local-notifications';
import { helpers } from '../../providers/service/helpers';
import { verification } from '../../providers/service/verification';

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

    public distanceToClosest: number;
    public timerNotificationCounter: number = 0;
    public timerNotificationEnabled: boolean = false;
    public notificationCounter: number = 0;
    public map: L.Map;

    // to verify senseBox data for notifications
    public notificationSensors = {
        temperature: {
            title: NotificationSensorTitles.temperature,
            threshold: {
                low: {
                    value: NotificationThresholdValues.temperatureLow,
                    msg: NotificationMessages.temperatureLow,
                },
                high: {
                    value: NotificationThresholdValues.temperatureHigh,
                    msg: NotificationMessages.temperatureHigh,
                }
            },
        },
        uvIntensity: {
            title: NotificationSensorTitles.uvIntensity,
            threshold: {
                high: {
                    value: NotificationThresholdValues.uvIntensityHigh,
                    msg: NotificationMessages.uvIntensityHigh,
                }
            }
        }
        // brightness = 'Beleuchtungsstärke',
        // airpressure = 'Luftdruck',
        // humidity = 'rel. Luftfeuchte'
        // , 'PM2.5', 'PM10', 'Niederschlagsmenge', 'Wolkenbedeckung', 'Windrichtung', 'Windgeschwindigkeit'
    };

    tab: String;
    tabSelector: String;
    start: boolean;
    about: boolean;
    currentPos: Geoposition;
    settingsData: any;

    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        private api: ApiProvider,
        private geolocation: Geolocation,
        private storage: Storage,
        private localNotifications: LocalNotifications,
        private plt: Platform,
        private helpers: helpers,
        private verification: verification
    ) {
        this.helpers.presentToast('Loading user data');
        this.storage.get('metadata')
        .then((val) => {
            if (val) {               
                this.metadata = val;
                this.radius = val.settings.radius;
                this.initSenseBoxes();
            } else {
                this.metadata = {
                    settings: {
                        gps: true,
                        radius: 5,
                        gpsDistance: 20,
                        timestamp: null,
                        ranges: { temperature: 5 },
                        thresholds: {
                            temperature: {
                                min: NotificationThresholdValues.temperatureLow,
                                max: NotificationThresholdValues.temperatureHigh
                            },
                            uvIntensity: {
                                max: NotificationThresholdValues.uvIntensityHigh
                            }
                        },
                        zoomLevel: 13,
                        mapView: null,
                        curSensor: null,
                        mySenseBoxIDs: [],
                        setPositionManual: false
                    },
                    notifications: []
                };
                this.radius = 5;
                this.storage.set("metadata", this.metadata);
                this.initSenseBoxes();
            }
            this.helpers.toastMSG.dismiss();
            this.helpers.toastMSG = null;
        }, (error) => {
                console.error(error);
                return error;
            });

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
        this.tabSelector = 'start'
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
    }

    public openSelect() {
        this.selectRef.open();
    }

    public async initSenseBoxes() {
        console.log('Start initSenseBoxes');
        try {
            var currentDate = new Date();
            this.metadata.settings.timestamp = currentDate;

            await this.getUserPosition()
                .then(userlocation => {
                    this.metadata.settings.location = userlocation;
                    this.startLocation = userlocation;
                });

            this.helpers.presentClosableToast('Loading SenseBoxes');
            await this.api.getSenseBoxes(this.metadata.settings.location, this.metadata.settings.radius)
                .then(res => {
                    this.metadata.senseBoxes = res;
                    this.verifyBoxes(res)
                        .then(response => {
                            this.metadata.senseBoxes = response;
                        })
                });

            await this.updateMetadata();
            if (this.metadata.senseBoxes != []) {
                //if personal sensebox is saved, use it instead of searching for closestSenseBox. If not, search closestSenseBox like usually
                if (this.metadata.settings.mySenseBox) {

                    await this.api.getSenseBoxByID(this.metadata.settings.mySenseBox)
                        .then((box: SenseBox) => {
                            this.metadata.closestSenseBox = box;
                            if (this.metadata.senseBoxes.indexOf(box) < 0) {
                                this.metadata.senseBoxes.push(box);
                            }
                            if (this.metadata.settings.location && this.metadata.closestSenseBox) {
                                this.distanceToClosest = this.metadata.settings.location.distanceTo(this.metadata.closestSenseBox.location);
                            }
                    })
                } else {
                    await this.api.getclosestSenseBox(this.metadata.senseBoxes, this.metadata.settings.location)
                        .then((closestBox: SenseBox) => {
                            this.metadata.closestSenseBox = closestBox;
                            if (this.metadata.settings.location && this.metadata.closestSenseBox) {
                                this.distanceToClosest = this.metadata.settings.location.distanceTo(this.metadata.closestSenseBox.location);
                            }
                        });
                }
                await this.updateMetadata();
            }
            this.helpers.toastMSG.dismiss();
            this.helpers.toastMSG = null;

            // Watch the user position
            this.map.locate({watch: true, enableHighAccuracy: true}).on("locationfound", (e: any) => {
                if(e.latlng){
                    let location = new L.LatLng(e.latlng.lat, e.latlng.lng);
                    let distance = location.distanceTo(this.metadata.settings.location);
                    if(distance >= this.metadata.settings.gpsDistance) {
                        this.metadata.settings.location = location;
                        this.updateBoxes();
                    }
                }
            }).on("locationerror", error => {
                console.error(error);
            });

            // TEST: verify TEMPERATURE VALUE OF CLOSEST SENSEBOX          
            // console.log("SenseBox Sensor Value for Temperature Valid? : "+this.api.sensorIsValid("Temperatur", this.metadata.closestSenseBox, this.metadata.senseBoxes, this.metadata.settings.ranges.temperature));
        }
        catch (err) {
            console.error(err);
        }

        // start notification creation and timebased updating
        try {
            this.timerNotification();
        }
        catch (err) {
            console.error(err);
        }
    }

    public async timerNotification() {
        if (this.timerNotificationEnabled) {
            await this.timeout(10000);
            var currentDate = new Date();
            this.metadata.settings.timestamp = currentDate;
            await this.api.getSenseBoxes(this.metadata.settings.location, this.metadata.settings.radius)
                .then(res => {
                    this.metadata.senseBoxes = res;
                    this.verifyBoxes(res)
                        .then(response => {
                            this.metadata.senseBoxes = response;
                        })
                });
            await this.updateMetadata();

            if (this.metadata.senseBoxes != []) {
                //if personal sensebox is saved, use it instead of searching for closestSenseBox. If not, search closestSenseBox like usually
                if (this.metadata.settings.mySenseBox) {
                    await this.api.getSenseBoxByID(this.metadata.settings.mySenseBox)
                        .then((box: SenseBox) => {
                            this.metadata.closestSenseBox = box;
                            if (this.metadata.senseBoxes.indexOf(box) < 0) {
                                this.metadata.senseBoxes.push(box);
                            }
                            if (this.metadata.settings.location && this.metadata.closestSenseBox) {
                                this.distanceToClosest = this.metadata.settings.location.distanceTo(this.metadata.closestSenseBox.location);
                            }
                    })
                } else {
                    await this.api.getclosestSenseBox(this.metadata.senseBoxes, this.metadata.settings.location)
                        .then((closestBox: SenseBox) => {
                            this.metadata.closestSenseBox = closestBox;
                            if (this.metadata.settings.location && this.metadata.closestSenseBox) {
                                this.distanceToClosest = this.metadata.settings.location.distanceTo(this.metadata.closestSenseBox.location);
                            }
                        });
                }
                await this.updateMetadata();
            }
            // verify for threshold
            this.metadata.senseBoxes.forEach(sb => {
                if(sb.isVerified == false) return;  //ONLY USE VERIFIED BOXES
                this.updateNotificationThresholds();
                // verify for each sensor with a threshold
                for (let sensor in this.notificationSensors) {
                    let sn = this.notificationSensors[sensor];
                    let sensorId = sb.sensors.find(el => el.title === sn.title);
                    // verify threshold for low values
                    if (sn.threshold.low) {
                        if (sensorId && sensorId.lastMeasurement && sensorId.lastMeasurement.value != undefined && Number(sensorId.lastMeasurement.value) <= sn.threshold.low.value) {
                            this.timerNotificationCounter += 1;
                            this.setNotificationWithTimer(0.0, 'No.' + this.timerNotificationCounter + ' @' + sb.name, sn.threshold.low.msg, sn.title + ' is ' + sensorId.lastMeasurement.value);
                        }
                    } else
                        // verify threshold for low values
                        if (sn.threshold.high) {
                            if (sensorId && sensorId.lastMeasurement && sensorId.lastMeasurement.value != undefined && Number(sensorId.lastMeasurement.value) >= sn.threshold.high.value) {
                                this.timerNotificationCounter += 1;
                                this.setNotificationWithTimer(0.0, 'No.' + this.timerNotificationCounter + ' @' + sb.name, sn.threshold.high.msg, sn.title + ' is ' + sensorId.lastMeasurement.value);
                            }
                        }
                }
            });
            this.timerNotification();
            this.helpers.toastMSG = null;
        }
    }

    /**
     * Function to update thresholds for notifications and adapt to threshold, the user chose.
     */
    private updateNotificationThresholds() {
        if (this.metadata.settings.thresholds) {
            if (this.metadata.settings.thresholds.temperature.min !== this.notificationSensors.temperature.threshold.low.value) {
                this.notificationSensors.temperature.threshold.low.value = this.metadata.settings.thresholds.temperature.min;
            }
            if (this.metadata.settings.thresholds.temperature.max !== this.notificationSensors.temperature.threshold.high.value) {
                this.notificationSensors.temperature.threshold.high.value = this.metadata.settings.thresholds.temperature.max;
            }
            if (this.metadata.settings.thresholds.uvIntensity.max !== this.notificationSensors.uvIntensity.threshold.high.value) {
                this.notificationSensors.uvIntensity.threshold.high.value = this.metadata.settings.thresholds.uvIntensity.max;
            }
        }
    }

    /**
     * Function that will return a timeout as promise
     * @param ms {number} milliseconds settings a timeout (1000 == 1 sec; 60 000 == 1 min; 3 600 000 == 1 std)
     */
    public timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Function to switch timer notification and pulling ON and OFF and also call loop again after it has been disabled.
     */
    public changeTimerNotificationBoolean() {
        this.timerNotificationEnabled = !this.timerNotificationEnabled;
        if (this.timerNotificationEnabled) {
            this.timerNotification();
        }
    }

    public verifyBoxes(senseboxes: SenseBox[]): Promise<SenseBox[]> {
        return new Promise(resolve => {
            for (let i = 0; i < senseboxes.length; i++) {
                if (senseboxes[i] && senseboxes[i].updatedCategory == "today") {
                    senseboxes[i].isVerified = this.verification.sensorIsVerified("Temperatur", senseboxes[i], senseboxes, this.metadata.settings.ranges.temperature);
                }else{
                    senseboxes[i].isVerified = false;
                }
            }
            resolve(senseboxes);
        });
    }


    public async updateSenseBoxesNow(){
        this.helpers.presentClosableToast('Updating SenseBoxes');
        await this.api.getSenseBoxes(this.metadata.settings.location, this.metadata.settings.radius)
        .then(res => {
            this.metadata.senseBoxes = res;
            if ((this.metadata.closestSenseBox !== null || this.metadata.closestSenseBox !== undefined) && this.metadata.senseBoxes.indexOf(this.metadata.closestSenseBox) < 0) {
                this.metadata.senseBoxes.push(this.metadata.closestSenseBox);
            }
            this.verifyBoxes(res)
                .then(response => {
                    this.metadata.senseBoxes = response;
                })
        });
        this.helpers.toastMSG.dismiss();
        this.helpers.toastMSG = null;
    }

    public async updateBoxes() {
        try {
            // await this.updateMetadata();
            if (!(this.radius < this.metadata.settings.radius) && ((this.metadata.settings.location.distanceTo(this.startLocation) / 1000) < (this.radius / 2) )) {
                // Smaller Radius
                await this.getBoxesSmallerRadius()
                .then(res => {
                    this.metadata.senseBoxes = res;
                })              
            } else {
                // Bigger Radius OR simple update
                await this.updateSenseBoxesNow();
            }

            this.startLocation = this.metadata.settings.location;
            this.radius = this.metadata.settings.radius;
            await this.updateMetadata();

            // only executed when no personal sensebox was set
            if (!this.metadata.settings.mySenseBox) {
                this.metadata
                await this.api.getclosestSenseBox(this.metadata.senseBoxes, this.metadata.settings.location).then(closestBox => {
                    this.metadata.closestSenseBox = closestBox;
                    this.distanceToClosest = this.metadata.settings.location.distanceTo(closestBox.location);
                });
            }
            await this.updateMetadata();
        }
        catch (err) {
            console.error(err);
        }
    }

    /**
     * Function to change reference on metadata to trigger "onChanges"
     */
    private updateMetadata() {
        this.metadata = {
            settings: this.metadata.settings,
            senseBoxes: this.metadata.senseBoxes,
            closestSenseBox: this.metadata.closestSenseBox,
            notifications: this.metadata.notifications
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
    getBoxesSmallerRadius(): Promise<SenseBox[]> {
        return new Promise(resolve => {
            let tempBoxes: SenseBox[] = [];
            for (let i = 0; i < this.metadata.senseBoxes.length; i++) {
                let distance: number = this.metadata.settings.location.distanceTo(this.metadata.senseBoxes[i].location) / 1000;
                if (distance <= this.metadata.settings.radius) { // radius) {
                    tempBoxes.push(this.metadata.senseBoxes[i]);
                } else if (distance > this.metadata.settings.radius && this.metadata.closestSenseBox._id == this.metadata.senseBoxes[i]._id) {
                    tempBoxes.push(this.metadata.senseBoxes[i]);
                }
            }
            resolve(tempBoxes);
        });
    }



    //Set notification with time in minutes from now, Title, Text, data that will be visible on click
    setNotificationWithTimer(time: number, title: string, text: string, data: string) {
        let timeInMS = time * 1000 * 60;    //time * 60 = time in seconds, time * 1000 = time in ms
        // let not: ILocalNotification;
        let notification: ILocalNotification = {
            id: this.notificationCounter,
            trigger: { at: new Date(new Date().getTime() + timeInMS) },
            title: title,
            text: text,
            data: data
        };
        this.metadata.notifications.push(notification);
        this.notificationCounter += 1;
        if (this.plt.is('cordova')) {
            this.localNotifications.schedule(notification);
        } else {
            console.log("Notifications are disabled: Not a real device or emulator");
        }
    }
}
