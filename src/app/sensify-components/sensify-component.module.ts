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
import { SensifyWelcomePage } from './sensify-welcome/sensify-welcome';

@NgModule({
  declarations: [
    SensifyStartPage,
    SensifyMapPage,
    SensifyAboutPage,
    SensifySettingsPage,
    SensifyNotificationsPage,
    SensifyWelcomePage
  ],
  imports: [
    IonicPageModule.forChild(SensifyStartPage),
    IonicPageModule.forChild(SensifyMapPage),
    IonicPageModule.forChild(SensifyAboutPage),
    IonicPageModule.forChild(SensifySettingsPage),
    IonicPageModule.forChild(SensifyNotificationsPage),
    IonicPageModule.forChild(SensifyWelcomePage),
    LeafletModule,
    LeafletModule.forRoot(),
  //  ApiProvider
  ],
  providers: [
    Geolocation,
    LocalNotifications,
  //  ApiProvider
  ],
  exports: [
    SensifyStartPage,
    SensifyMapPage,
    SensifyAboutPage,
    SensifySettingsPage,
    SensifyNotificationsPage,
    SensifyWelcomePage  
  ]
})
export class SensifyComponentModule {}
