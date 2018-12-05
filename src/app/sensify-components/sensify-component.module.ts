import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';

import { LeafletModule } from "@asymmetrik/ngx-leaflet";
import { Geolocation} from "@ionic-native/geolocation";
import { LocalNotifications } from '@ionic-native/local-notifications'

import { SensifyStartPage } from './sensify-start/sensify-start';
import { SensifyMapPage } from './sensify-map/sensify-map';
import { SensifyAboutPage } from './sensify-about/sensify-about';
import { SensifySettingsPage } from './sensify-settings/sensify-settings';
import { SensifyNotificationsPage } from './sensify-notifications/sensify-notifications';


@NgModule({
  declarations: [
    SensifyStartPage,
    SensifyMapPage,
    SensifyAboutPage,
    SensifySettingsPage,
    SensifyNotificationsPage
  ],
  imports: [
    IonicPageModule.forChild(SensifyStartPage),
    IonicPageModule.forChild(SensifyMapPage),
    IonicPageModule.forChild(SensifyAboutPage),
    IonicPageModule.forChild(SensifySettingsPage),
    IonicPageModule.forChild(SensifyNotificationsPage),
    LeafletModule,
    LeafletModule.forRoot()
  ],
  providers: [
    Geolocation,
    LocalNotifications
  ],
  exports: [
    SensifyStartPage,
    SensifyMapPage,
    SensifyAboutPage,
    SensifySettingsPage,
    SensifyNotificationsPage
  ]
})
export class SensifyComponentModule {}
