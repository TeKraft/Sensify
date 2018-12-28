import { Component, Input } from '@angular/core';
import { Metadata } from "../../../providers/model";

@Component({
  selector: 'sensify-page-notifications',
  templateUrl: 'sensify-notifications.html'
})
export class SensifyNotificationsPage {

  @Input()
  public metadata: Metadata;
  public bgImage:String;


  constructor() {
    this.bgImage = "../../../assets/imgs/TestBckgrd.png";
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad SensifyNotificationsPage');
  }
}
