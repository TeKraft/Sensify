import { Component } from '@angular/core';

@Component({
    selector: 'sensify-page-about',
    templateUrl: 'sensify-about.html',
})
export class SensifyAboutPage {

    constructor() {}
    
    ionViewDidLoad() {
        console.log('ionViewDidLoad SensifyAboutPage');
    }

    openUrl(){
        window.open('https://github.com/vgorte/openSenseApp', '_system');
    }
}
