import { Component, Input, OnChanges } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Platform } from 'ionic-angular';
import { SenseBox, Metadata, Sensor } from '../../../providers/model';
import { SensifyPage } from '../../../pages/sensify/sensify-page';
import { ActionSheetController } from 'ionic-angular';

@Component({
	selector: 'sensify-page-start',
	templateUrl: 'sensify-start.html',
})
export class SensifyStartPage implements OnChanges {

	@Input()
	public metadata: Metadata;
	public currBox: SenseBox;
	public date: String;
	public sunrise: String;
	public sunset: String;
	public sensors?: Sensor[];
	public bgImage: String;
	public temperature: String;
	public curValue: String;
	public curUnit: String;
	public curName: String;
	public btns: any;

	constructor(public mySensifyPage: SensifyPage, public platform: Platform, public navCtrl: NavController, public navParams: NavParams, public actionSheetCtrl: ActionSheetController) {
		this.sensors = [];
		this.btns = [];

		this.temperature = " - ";

		this.curValue = "...";
		this.curUnit = "";
		this.curName = "";



		this.bgImage = "../../../assets/imgs/TestBckgrd.png";
		this.setCurrentDate();
	}

	openMenu() {
		const actionSheet = this.actionSheetCtrl.create({
			title: 'Select Sensor',
			buttons: this.btns,
		});
		actionSheet.present();
	}

	ngOnChanges(changes) {
		if (changes.metadata.currentValue.closestSenseBox) {
			this.currBox = this.metadata.closestSenseBox;
			this.init();
			this.setSensors();
		}
	}

	public setBackground() {
		var currentDate = new Date();
		var hour = currentDate.getHours();
		var minutes = currentDate.getMinutes();
		var currTime = hour + "." + minutes;
		var sunrise = this.sunrise.replace(":", ".");
		var sunset = this.sunset.replace(":", ".");


		if (this.temperature) {
			if (Number(sunrise) > Number(currTime) || Number(currTime) > Number(sunset)) {    //Nacht
				this.bgImage = "../../../assets/imgs/nightBackground.jpg";
			} else {                                          //Tag
				if (Number(this.temperature.slice(0, -3)) < 0) {
					this.bgImage = "../../../assets/imgs/snowBackground.jpg";
				} else {
					this.bgImage = "../../../assets/imgs/sunnyBackground.jpg";
				}
			}
		}
	}

	public setSensors() {
		this.sensors = [];
		this.btns = [];

		for (var i: number = 0; i < this.currBox.sensors.length; i++) {
			let newBtn: any;
			let sensor = this.currBox.sensors[i];

			if (sensor.lastMeasurement) {

				newBtn = {
					text: sensor.title,
					handler: () => {
						this.curValue = sensor.lastMeasurement.value;
						this.curUnit = sensor.unit;
						this.curName = sensor.title;


					}
				};

				this.sensors.push(sensor);

				if (sensor.title == "Temperatur") {
					this.temperature = sensor.lastMeasurement.value;
					this.curValue = sensor.lastMeasurement.value;
					this.curUnit = sensor.unit;
					this.curName = sensor.title;
				}
			}
			this.btns.push(newBtn);
		}
	}

	public async init() {
		try {
			await this.getSunrise("https://api.sunrise-sunset.org/json?lat=" + this.metadata.settings.location.lat + "&lng=" + this.metadata.settings.location.lng + "&date=today").then(sun => {

				this.sunrise = this.getUTC1(JSON.parse(sun).results.sunrise);
				this.sunset = this.getUTC1(JSON.parse(sun).results.sunset);
				this.setBackground();
			});
		}
		catch (err) {
			console.error(err);
		}
	}

	getUTC1(input: String) {
		var short: String = input.substr(input.length - 2);
		var time = input.slice(0, -6);
		var hour = Number(input.substr(0, input.indexOf(":")));
		var minutes = time.slice((time.indexOf(":") + 1), time.length);

		if (short == "AM") {
			hour = hour + 1;
		} else {
			hour = hour + 13;
		}

		time = hour + ":" + minutes;

		return time;
	}

	getSunrise(url: string): Promise<any> {
		return new Promise<any>(
			function (resolve, reject) {
				const request = new XMLHttpRequest();
				request.onload = function () {

					if (this.status === 200) {
						resolve(this.response);
					} else {
						reject(new Error(this.statusText));
					}
				};
				request.onerror = function () {
					reject(new Error('XMLHttpRequest Error: ' + this.statusText));
				};
				request.open('GET', url);
				request.send();
			});
	}

	ionViewDidLoad() {
		console.log('ionViewDidLoad SensifyStartPage');
	}

	setCurrentDate() {
		var currentDate = new Date()
		var day = currentDate.getDate()
		var month = currentDate.getMonth() + 1 //January is 0!
		var year = currentDate.getFullYear()
		this.date = day + "." + month;// + "." + year;
	}
}
