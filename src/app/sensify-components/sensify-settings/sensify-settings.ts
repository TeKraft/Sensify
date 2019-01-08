import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ActionSheetController, AlertController, ActionSheetButton } from 'ionic-angular';
import { Metadata } from '../../../providers/model';
import { ApiProvider } from '../../../providers/api/api';
import { SensifyPage } from '../../../pages/sensify/sensify-page';
import { helpers } from "../../../pages/sensify/js/helpers";

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

    public senseBoxIDDelete: (string | ActionSheetButton)[] = [];
    public senseBoxIDSelect: (string | ActionSheetButton)[] = [];

    constructor(
        public mySensifyPage: SensifyPage,
        public alertCtrl: AlertController,
        public api: ApiProvider,
        public actionSheetCtrl: ActionSheetController,
        private helpers: helpers
    ) { }

    ionViewDidLoad() {
        console.log('ionViewDidLoad SensifySettingsPage');
    }

    ngOnChanges(changes) {
        this.updateSenseBoxIDs();
    }

    // SETTINGS
    public changeSettings() {
        if (this.newRadius) {
            this.metadata.settings.radius = this.newRadius;
        }
        if (this.newValidationRange) {
            this.metadata.settings.ranges.temperature = this.newValidationRange;
        }
        if (this.newSenseboxID) {
            this.api.getSenseBoxByID(this.newSenseboxID).then(res => {
                if (res) {
                    this.metadata.closestSenseBox = res;
                    this.metadata.settings.mySenseBox = res._id;
                    let idx = this.metadata.settings.mySenseBoxIDs.findIndex(el => el === res._id);
                    if (idx < 0) {
                        this.metadata.settings.mySenseBoxIDs.push(res._id);
                    }

                } else {
                    console.error("SENSEBOX ID IS NOT VALID: Please check it again!")
                }
            })
        }
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
        this.onMetadataChange.emit(this.metadata);    
    }

    /**
     * Function to remove all selected SenseBox IDs.
     */
    deleteSenseBoxIDs() {
        this.helpers.presentToast('Waiting for Closest SenseBox');
        this.api.getclosestSenseBox(this.metadata.senseBoxes, this.metadata.settings.location).then(res => {
            this.metadata.closestSenseBox = res;
            this.newSenseboxID = null;
            this.metadata.settings.mySenseBoxIDs = [];
            delete this.metadata.settings.mySenseBox;
            this.senseBoxIDDelete = [];
            this.senseBoxIDSelect = [];
        });
        this.helpers.toastMSG.dismiss();
        this.helpers.toastMSG = null;
        
        let alert = this.alertCtrl.create({
            title: 'IDs deleted',
            subTitle: 'The SenseBox IDs have been deleted.',
            buttons: ['OK']
        });
        alert.present();
    }

    /**
     * Function to remove a provided ID from the selected SenseBoxes
     * @param id {String} id of the SenseBox that should be removed
     */
    deleteSenseBoxID(id: String) {
        this.helpers.presentToast('Waiting for Closest SenseBox');
        this.api.getclosestSenseBox(this.metadata.senseBoxes, this.metadata.settings.location).then(res => {
            let idx = this.metadata.settings.mySenseBoxIDs.findIndex(el => el === id);
            // splice deleted id from sensebox array
            if (idx >= 0) {
                this.metadata.settings.mySenseBoxIDs.splice(idx, 1);
            } else {
                this.metadata.closestSenseBox = res;
                this.newSenseboxID = null;
                this.metadata.settings.mySenseBoxIDs = [];
                delete this.metadata.settings.mySenseBox;
            }
            // set new sensebox if exists, otherwise set to undefined
            if (id === this.metadata.settings.mySenseBox) {
                if (this.metadata.settings.mySenseBoxIDs.length > 0) {
                    this.metadata.settings.mySenseBox = this.metadata.settings.mySenseBoxIDs[0];
                    this.newSenseboxID = this.metadata.settings.mySenseBox;
                    let sensebox = this.metadata.senseBoxes.find(el => el._id === this.newSenseboxID);
                    if (sensebox) {
                        this.metadata.closestSenseBox = sensebox;
                    }
                } else {
                    this.newSenseboxID = null;
                    this.metadata.settings.mySenseBoxIDs = [];
                    delete this.metadata.settings.mySenseBox;
                }
            }

            this.onMetadataChange.emit(this.metadata);
            let alert = this.alertCtrl.create({
                title: 'ID Removed',
                subTitle: 'The SenseBox ID has been removed.',
                buttons: ['OK']
            });
            alert.present();
        })
        this.helpers.toastMSG.dismiss();
        this.helpers.toastMSG = null;
    }

    /**
     * Function to choose one of the selected SenseBoxes
     * @param id {String} id to be displayed as home SenseBox
     */
    public selectSenseBoxID(id: String) {
        this.metadata.settings.mySenseBox = id;
        let sensebox = this.metadata.senseBoxes.find(el => el._id === id);
        if (sensebox) {
            this.metadata.closestSenseBox = sensebox;
        }
        let alert = this.alertCtrl.create({
            title: 'ID set',
            subTitle: 'The SenseBox ID has been set.',
            buttons: ['OK']
        });
        alert.present();
        this.onMetadataChange.emit(this.metadata);
    }

    /** 
     * Function to create action sheet for choosing selected SenseBox and remove on of all selected SenseBoxes
     */
    public updateSenseBoxIDs() {
        this.senseBoxIDDelete = [];
        this.senseBoxIDSelect = [];

        if (this.metadata.settings.mySenseBoxIDs && this.metadata.settings.mySenseBoxIDs.length > 0) {
            this.metadata.settings.mySenseBoxIDs.forEach(id => {
                const senseBoxDeleteBtn: any = {
                    text: id,
                    handler: () => {
                        this.deleteSenseBoxID(id);
                    }
                }
                this.senseBoxIDDelete.push(senseBoxDeleteBtn);
                const senseBoxIDSelectBtn: any = {
                    text: id,
                    handler: () => {
                        this.selectSenseBoxID(id);
                    }
                }
                this.senseBoxIDSelect.push(senseBoxIDSelectBtn);
            })
        }
    }

    /**
     * Function to open action sheet to select one of all selected SenseBoxes
     */
    public openSenseBoxIDSelection() {
        const actionSheet = this.actionSheetCtrl.create({
            title: 'Select SenseBoxID to display',
            buttons: this.senseBoxIDSelect,
        });
        actionSheet.present();
    }

    /**
     * Function to open action sheet to select one SenseBox which will be removed
     */
    public openSenseBoxIDDelete() {
        const actionSheet = this.actionSheetCtrl.create({
            title: 'Select SenseBoxID to remove',
            buttons: this.senseBoxIDDelete,
        });
        actionSheet.present();
    }
}