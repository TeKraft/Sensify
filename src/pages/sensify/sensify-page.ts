import { ApiProvider } from '../../providers/api/api';
import { Metadata, NotificationMessages, NotificationSensorTitles, NotificationThresholdValues, SenseBox } from '../../providers/model';
import { Component, ViewChild } from '@angular/core';
import { IonicPage, NavController, NavParams, Platform, Select, ToastController, Toast } from 'ionic-angular';
import { Geolocation, Geoposition } from "@ionic-native/geolocation";
import * as L from "leaflet";
import { Storage } from '@ionic/storage';
import { ILocalNotification, LocalNotifications } from '@ionic-native/local-notifications';

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
    public toastMSG: Toast;

    public distanceToClosest: number;
    public timerNotificationCounter: number = 0;
    public timerNotificationEnabled: boolean = false;
    public notificationCounter: number = 0;

    // to validate senseBox data for notifications
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
    }

    tab: String;
    tabSelector: String;
    start: boolean;
    map: boolean;
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
        private toastCtrl: ToastController
    ) {
        // check for localStorage
        this.metadata = {
            settings: {
                gps: true,
                radius: 5,
                timestamp: null,
                ranges: { temperature: 5 },
                zoomLevel: null,
                mapView: null,
                curSensor: null,
                mySenseBoxIDs: []
            },
            notifications: []
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
        this.setNotificationWithTimer(0.2, "Test", "Hey! Open up your Sensify-App for a quick update :)", "Works like a charm.");
    }

    public openSelect() {
        this.selectRef.open();
    }

    presentToast(text: string): void {
        let toastData = {
            message: text,
            duration: 500000,
            position: 'top',
            dismissOnPageChange: true
        }

        this.showToast(toastData);
    }

    presentClosableToast(text: string): void {
        let toastData = {
            message: text,
            showCloseButton: true,
            closeButtonText: 'X',
            position: 'top',
            dismissOnPageChange: true
        };

        this.showToast(toastData);
    }

    private showToast(data: any): void {
        this.toastMSG ? this.toastMSG.dismiss() : false;
        this.toastMSG = this.toastCtrl.create(data);
        this.toastMSG.present();
    }

    public async initSenseBoxes() {
        console.log('Start initSenseBoxes');
        try {
            var currentDate = new Date();
            this.metadata.settings.timestamp = currentDate;

            this.presentToast('Loading user position');
            await this.getUserPosition().then(userlocation => {
                this.metadata.settings.location = userlocation;
                this.startLocation = userlocation;
            });

            this.presentToast('Loading user data');
            await this.getMetadata().then(meta => {
                this.metadata = meta;
                this.radius = meta.settings.radius;
            });

            this.presentToast('Loading SenseBoxes');
            await this.api.getSenseBoxes(this.metadata.settings.location, this.metadata.settings.radius)
                .then(res => {
                    this.metadata.senseBoxes = res;
                    this.validateBoxes(res)
                        .then(response => {
                            this.metadata.senseBoxes = response;
                        })
                });
            this.updateMetadata();

            this.presentToast('Loading closest SenseBox');
            if (this.metadata.senseBoxes != []) {
                //if personal sensebox is saved, use it instead of searching for closestSenseBox. If not, search closestSenseBox like usually
                if (this.metadata.settings.mySenseBox) {
                    await this.api.getSenseBoxByID(this.metadata.settings.mySenseBox).then((box: SenseBox) => {
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
                this.updateMetadata();
            }
            this.toastMSG.dismiss();
            this.toastMSG = null;

            // TEST: VALIDATE TEMPERATURE VALUE OF CLOSEST SENSEBOX          
            // console.log("SenseBox Sensor Value for Temperature Valid? : "+this.api.sensorIsValid("Temperatur", this.metadata.closestSenseBox, this.metadata.senseBoxes, this.metadata.settings.ranges.temperature));
        }
        catch (err) {
            this.presentClosableToast('Ups, something went wrong!');
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
            this.presentToast('Loading SenseBoxes. - automatic');
            await this.api.getSenseBoxes(this.metadata.settings.location, this.metadata.settings.radius)
                .then(res => {
                    this.metadata.senseBoxes = res;
                    this.validateBoxes(res)
                        .then(response => {
                            this.metadata.senseBoxes = response;
                        })
                });
            this.updateMetadata();
            this.presentToast('Loading closest SenseBox. - automatic');

            if (this.metadata.senseBoxes != []) {
                //if personal sensebox is saved, use it instead of searching for closestSenseBox. If not, search closestSenseBox like usually
                if (this.metadata.settings.mySenseBox) {
                    await this.api.getSenseBoxByID(this.metadata.settings.mySenseBox).then((box: SenseBox) => {
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
                this.updateMetadata();
            }
            // validate for threshold
            this.metadata.senseBoxes.forEach(sb => {
                // validate for each sensor with a threshold
                for (let sensor in this.notificationSensors) {
                    let sn = this.notificationSensors[sensor];
                    let sensorId = sb.sensors.find(el => el.title === sn.title);
                    // validate threshold for low values
                    if (sn.threshold.low) {
                        if (sensorId && sensorId.lastMeasurement && sensorId.lastMeasurement.value != undefined && Number(sensorId.lastMeasurement.value) <= sn.threshold.low.value) {
                            this.timerNotificationCounter += 1;
                            this.setNotificationWithTimer(0.0, 'No.' + this.timerNotificationCounter + ' @' + sb.name, sn.threshold.low.msg, sn.title + ' is ' + sensorId.lastMeasurement.value);
                        }
                    } else
                        // validate threshold for low values
                        if (sn.threshold.high) {
                            if (sensorId && sensorId.lastMeasurement && sensorId.lastMeasurement.value != undefined && Number(sensorId.lastMeasurement.value) >= sn.threshold.high.value) {
                                this.timerNotificationCounter += 1;
                                this.setNotificationWithTimer(0.0, 'No.' + this.timerNotificationCounter + ' @' + sb.name, sn.threshold.high.msg, sn.title + ' is ' + sensorId.lastMeasurement.value);
                            }
                        }
                }
            })
            console.log('finished --> timerNotification()');
            this.timerNotification();
            this.toastMSG.dismiss();
            this.toastMSG = null;
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

    public validateBoxes(senseboxes: SenseBox[]): Promise<SenseBox[]> {
        return new Promise(resolve => {
            for (let i = 0; i < senseboxes.length; i++) {
                if (senseboxes[i] && senseboxes[i].updatedCategory == "today") {
                    senseboxes[i].isValid = this.api.sensorIsValid("Temperatur", senseboxes[i], senseboxes, this.metadata.settings.ranges.temperature);
                }
            }
            resolve(senseboxes);
        });
    }


    public async updateBoxes() {
        await this.updateMetadata();
        this.presentToast('Updating SenseBoxes');
        // Check whether radius gets bigger or smaller
        if (this.metadata.senseBoxes != undefined && this.metadata.senseBoxes.length > 0) {
            if (this.metadata.settings.radius > this.radius) {
                // if new radius is greater than 
                await this.api.getSenseBoxes(this.metadata.settings.location, this.metadata.settings.radius)
                    .then(res => {
                        this.metadata.senseBoxes = res;
                        if ((this.metadata.closestSenseBox !== null || this.metadata.closestSenseBox !== undefined) && this.metadata.senseBoxes.indexOf(this.metadata.closestSenseBox) < 0) {
                            this.metadata.senseBoxes.push(this.metadata.closestSenseBox);
                        }
                        this.validateBoxes(res)
                            .then(response => {
                                this.metadata.senseBoxes = response;
                            })
                    });
            } else if ((this.metadata.settings.location.distanceTo(this.startLocation) / 1000) < (this.radius / 2)) {
                // get boxes smaller radius inside origin circle & smaller
                await this.getBoxesSmallerRadius()
                    .then(res => {
                        this.metadata.senseBoxes = res;
                    })
            } else {
                // normal get senseBoxes
                await this.api.getSenseBoxes(this.metadata.settings.location, this.metadata.settings.radius)
                    .then(res => {
                        this.metadata.senseBoxes = res;
                        if ((this.metadata.closestSenseBox !== null || this.metadata.closestSenseBox !== undefined) && this.metadata.senseBoxes.indexOf(this.metadata.closestSenseBox) < 0) {
                            this.metadata.senseBoxes.push(this.metadata.closestSenseBox);
                        }
                        this.validateBoxes(res)
                            .then(response => {
                                this.metadata.senseBoxes = response;
                            })
                    });
            }
        } else {
            await this.api.getSenseBoxes(this.metadata.settings.location, this.metadata.settings.radius)
                .then(res => {
                    this.metadata.senseBoxes = res;
                    if ((this.metadata.closestSenseBox !== null || this.metadata.closestSenseBox !== undefined) && this.metadata.senseBoxes.indexOf(this.metadata.closestSenseBox) < 0) {
                        this.metadata.senseBoxes.push(this.metadata.closestSenseBox);
                    }
                    this.validateBoxes(res)
                        .then(response => {
                            this.metadata.senseBoxes = response;
                        })
                });
        }
        this.startLocation = this.metadata.settings.location;
        this.radius = this.metadata.settings.radius;
        await this.updateMetadata();
        this.presentToast('Updating closest SenseBox.');
        // if (this.radius > this.metadata.settings.radius && !this.metadata.settings.mySenseBox) {
        if (!this.metadata.settings.mySenseBox) {
            await this.api.getclosestSenseBox(this.metadata.senseBoxes, this.metadata.settings.location).then(closestBox => {
                this.metadata.closestSenseBox = closestBox;
                if (this.metadata.settings.location && this.metadata.closestSenseBox) {
                    this.distanceToClosest = this.metadata.settings.location.distanceTo(this.metadata.closestSenseBox.location);
                }
            });
        }
        this.toastMSG.dismiss();
        this.toastMSG = null;
        await this.updateMetadata();
    }

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

    // Get the Metadata from storage
    getMetadata(): Promise<Metadata> {
        return this.storage.get('metadata')
            .then((val) => {
                return {
                    settings: {
                        gps: val ? val.settings.gps : true,
                        radius: val ? val.settings.radius : 5,
                        timestamp: val ? val.settings.timestamp : " : ",
                        ranges: val ? val.settings.ranges : { temperature: 5 },
                        location: this.metadata.settings.location ? this.metadata.settings.location : (val && val.settings.location ? val.settings.location : null),
                        zoomLevel: val.settings.zoomLevel ? val.settings.zoomLevel : 13,
                        mapView: this.metadata.settings.mapView ? this.metadata.settings.mapView : null
                    },
                    senseBoxes: this.metadata.senseBoxes ? this.metadata.senseBoxes : (val && val.senseBoxes ? val.senseBoxes : null),
                    closestSenseBox: this.metadata.closestSenseBox ? this.metadata.closestSenseBox : (val && val.closestSenseBox ? val.closestSenseBox : null),
                    notifications: this.metadata.notifications ? this.metadata.notifications : []
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

    // Watch the user position
    subscription = this.geolocation.watchPosition()
        .subscribe(pos => {
            console.log('Watching GPS position');
            if (pos.coords) {
                let location = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
                // let location = new L.LatLng(7.5961, 51.9695);
                // necessary to re-define this.settings to trigger ngOnChanges in sensify.map.ts
                this.metadata.settings.location = location;
                this.updateBoxes();
            }
        });

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
