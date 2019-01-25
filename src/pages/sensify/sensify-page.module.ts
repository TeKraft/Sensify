import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { SensifyPage } from './sensify-page';
import { SensifyComponentModule } from '../../app/sensify-components/sensify-component.module';
import { LeafletModule } from "@asymmetrik/ngx-leaflet";

@NgModule({
    declarations: [
        SensifyPage,
    ],
    imports: [
        IonicPageModule.forChild(SensifyPage),
        SensifyComponentModule,
        LeafletModule,
        LeafletModule.forRoot()
    ]
})
export class SensifyPageModule { }
