import { Component, Input, OnChanges } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Platform } from 'ionic-angular';
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
    public date: String;

    constructor(public mySensifyPage:SensifyPage,public platform: Platform, public navCtrl: NavController, public navParams: NavParams) {
        this.setCurrentDate();
        // TODO: take mySenseBox from metadata.settings and not from API request again
        this.mySensifyPage.getMetadata();
        // this.currBox = this.metadata.settings.mySenseBox ? this.metadata.settings.mySenseBox : this.api.getclosestSenseBoxTest(boxes, pos.coords);
    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad SensifyStartPage');
    }
    
    setCurrentDate(){
        var currentDate = new Date()
        var day = currentDate.getDate()
        var month = currentDate.getMonth() + 1 //January is 0!
        var year = currentDate.getFullYear()
        console.log(day + "." + month + "." + year);
        this.date = "Today: "+day + "." + month + "." + year;
    }

    ngOnChanges(changes) {
        if (changes.metadata.currentValue.closestSenseBox) {
            this.currBox = this.metadata.closestSenseBox;
        }
    }
}
