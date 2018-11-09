import { ApiProvider } from './../../providers/api/api';
import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';


@IonicPage()
@Component({
    selector: 'page-sense-box',
    templateUrl: 'sense-box.html',
})
export class SenseBoxPage {

    boxData: any;
    allBoxes: any;
    closesz
    closestBoxes: any;

    constructor(public navCtrl: NavController, public navParams: NavParams, private api: ApiProvider) {
    }

    ionViewDidLoad() {
        console.log('ionViewDidLoad SenseBoxPage');
    }

    getData() {
        this.api.getData().subscribe(res => {
            console.log(res);
            this.boxData = res;
        })

    }

    getSenseBoxes() {
        this.api.getSenseBoxes().subscribe(res => {
            this.allBoxes = res;
        })
    }

}
