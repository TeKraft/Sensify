import { Component, Input, OnChanges } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Platform } from 'ionic-angular';
import { ApiProvider } from '../../../providers/api/api';
import { Geolocation } from "@ionic-native/geolocation";
import { NativeGeocoder } from '@ionic-native/native-geocoder';
import { SenseBox, Metadata } from '../../../providers/model';
import { SensifyPage } from '../../../pages/sensify/sensify-page';

@Component({
    selector: 'sensify-page-start',
    templateUrl: 'sensify-start.html',
})
export class SensifyStartPage implements OnChanges {

    @Input()
    public metadata: Metadata;

    public currBox: SenseBox;

    constructor(public mySensifyPage:SensifyPage,public platform: Platform, public navCtrl: NavController, public navParams: NavParams, private api: ApiProvider, private geolocation: Geolocation, private nativeGeocoder: NativeGeocoder) {
        // TODO: take mySenseBox from metadata.settings and not from API request again
        this.mySensifyPage.getMetadata();
        // this.currBox = this.metadata.settings.mySenseBox ? this.metadata.settings.mySenseBox : this.api.getclosestSenseBoxTest(boxes, pos.coords);
    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad SensifyStartPage');
    }
    
    ngOnChanges(changes) {
        if (changes.metadata.currentValue.closestSenseBox) {
            this.currBox = this.metadata.closestSenseBox;
        }
    }
}
