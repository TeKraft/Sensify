import { Component, ViewChild } from '@angular/core';
import { NavController, NavParams, Slides } from 'ionic-angular';
import { SensifyPage } from '../../../pages/sensify/sensify-page';

@Component({
    selector: 'sensify-page-welcome',
    templateUrl: 'sensify-welcome.html'
})
export class SensifyWelcomePage {
    @ViewChild(Slides) welcomeSlides: Slides;

    public state: String;

    constructor(
        public navCtrl: NavController,
        public navParams: NavParams
    ) {
        this.state = 'x';
    }

    toHomePage() {
        this.navCtrl.setRoot(SensifyPage);
    }

    slideMoved() {
        if (this.welcomeSlides.getActiveIndex() >= this.welcomeSlides.getPreviousIndex())
            this.state = 'rightSwipe';
        else
            this.state = 'leftSwipe';
    }
}
