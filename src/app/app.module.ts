import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { SplashScreen } from '@ionic-native/splash-screen';
import { StatusBar } from '@ionic-native/status-bar';
import { LocalNotifications } from '@ionic-native/local-notifications';
import { NativeGeocoder } from '@ionic-native/native-geocoder';
import { IonicStorageModule } from '@ionic/storage';

import { LeafletModule } from "@asymmetrik/ngx-leaflet";

import { Sensify } from './app.component';
import { ApiProvider } from '../providers/api/api';
import { helpers } from '../providers/service/helpers';
import { verification } from '../providers/service/verification';

@NgModule({
    declarations: [
        Sensify
    ],
    imports: [
        HttpClientModule,
        BrowserModule,
        IonicModule.forRoot(Sensify),
        LeafletModule,
        IonicStorageModule.forRoot()
    ],
    bootstrap: [IonicApp],
    entryComponents: [
        Sensify
    ],
    providers: [
        StatusBar,
        SplashScreen,
        { provide: ErrorHandler, useClass: IonicErrorHandler },
        ApiProvider,
        LocalNotifications,
        NativeGeocoder,
        helpers,
        verification
    ]
})
export class AppModule { }
