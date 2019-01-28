import { Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { NavController, NavParams, Slides } from 'ionic-angular';

@Component({
    selector: 'sensify-page-welcome',
    templateUrl: 'sensify-welcome.html'
})
export class SensifyWelcomePage {
    @ViewChild(Slides) welcomeSlides: Slides;

    @Output()
    public onTabSelectorChange: EventEmitter<String> = new EventEmitter();

    public state: String;

    constructor(
        public navCtrl: NavController,
        public navParams: NavParams
    ) {
        this.state = 'x';
    }

    toHomePage() {
        this.onTabSelectorChange.emit('start');
    }

    slideMoved() {
        if (this.welcomeSlides.getActiveIndex() >= this.welcomeSlides.getPreviousIndex()) {
            this.state = 'rightSwipe';
        } else {
            this.state = 'leftSwipe';
        }
    }
}

