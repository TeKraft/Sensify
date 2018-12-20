import { Component, Input } from '@angular/core';
import { Metadata } from "../../../providers/model";

@Component({
  selector: 'sensify-page-notifications',
  templateUrl: 'sensify-notifications.html'
})
export class SensifyNotificationsPage {

  @Input()
  public metadata: Metadata;

  constructor() {}

  ionViewDidLoad() {
    console.log('ionViewDidLoad SensifyNotificationsPage');
  }
}
