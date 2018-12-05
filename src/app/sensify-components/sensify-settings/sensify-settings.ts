import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Metadata } from '../../../providers/model';
import { AlertController } from 'ionic-angular';
import { ApiProvider } from '../../../providers/api/api'

import { SensifyPage } from '../../../pages/sensify/sensify-page';


@Component({
    selector: 'sensify-page-settings',
    templateUrl: 'sensify-settings.html'
})
export class SensifySettingsPage {

    @Input()
    public metadata: Metadata;

    @Output()
    public onMetadataChange: EventEmitter<Metadata> = new EventEmitter();

    @Output()
    public onMessageChange: EventEmitter<string> = new EventEmitter();
    
    newRadius: any;
    newValidationRange: any;
    newSenseboxID: any;


    constructor(public mySensifyPage:SensifyPage, public alertCrtl: AlertController, public api : ApiProvider, private alertCtrl: AlertController) {}

    ionViewDidLoad() {
        console.log('ionViewDidLoad SensifySettingsPage');
    }

    //SETTINGS
    //-Think about other setting options that we need
    public changeSettings() {
        if (this.newRadius) {
            this.metadata.settings.radius = this.newRadius;
        }
        if (this.newValidationRange) {
            this.metadata.settings.ranges.temperature = this.newValidationRange;
        }
        if (this.newSenseboxID) {
            //Validate if senseBoxID is a sensebox
            this.api.getSenseBoxByID(this.newSenseboxID).then(res => {
                if(res){
                    this.metadata.closestSenseBox = res;
                    this.metadata.settings.mySenseBox = res._id;
                }else{
                    console.error("SENSEBOX ID IS NOT VALID: Please check it again!")
                }
            })
        }
        // this.mySensifyPage.setMetadata(this.metadata);
        this.onMetadataChange.emit(this.metadata);

        if (this.newRadius || this.newValidationRange || this.newSenseboxID) {
            let alert = this.alertCtrl.create({
                title: 'Saved successfully',
                subTitle: 'Settings are saved successfully',
                buttons: ['OK']
            });
            alert.present();
        } else {
            let alert = this.alertCtrl.create({
                title: 'Nothing changed',
                subTitle: 'There were no settings changed',
                buttons: ['OK']
            });
            alert.present();
        }

        //Reset Input forms after setting change
        this.newRadius = null;
        this.newValidationRange = null;
        this.newSenseboxID = null;
        //this.onMetadataChange.emit(this.metadata);    
    }

    deleteSenseBoxID(){
        delete this.metadata.settings.mySenseBox;
        this.mySensifyPage.toggleSpinner(true, "Waiting for Closest SenseBox...");
        this.api.getclosestSenseBox(this.metadata.senseBoxes, this.metadata.settings.location).then(res => {
            this.metadata.closestSenseBox = res;
            this.mySensifyPage.toggleSpinner(false, "Waiting for Closest SenseBox...");
            if(!this.metadata.settings.mySenseBox){
                let alert = this.alertCtrl.create({
                    title: 'ID Removed',
                    subTitle: 'The SenseBox ID has been removed.',
                    buttons: ['OK']
                });
                alert.present();
            }
        })
    }
}
