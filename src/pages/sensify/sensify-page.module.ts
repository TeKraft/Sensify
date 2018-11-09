import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { SensifyPage } from './sensify-page';
import { SensifyComponentModule } from '../../app/sensify-components/sensify-component.module';

@NgModule({
    declarations: [
        SensifyPage,
    ],
    imports: [
        IonicPageModule.forChild(SensifyPage),
        SensifyComponentModule,
    ]
})
export class SensifyPageModule { }
