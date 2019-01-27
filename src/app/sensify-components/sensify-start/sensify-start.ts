import {Component, EventEmitter, Input, OnChanges, Output, ViewChild} from '@angular/core';
import {ActionSheetButton, ActionSheetController, NavController, NavParams, Platform} from 'ionic-angular';
import { SenseBox, Metadata, Sensor } from '../../../providers/model';
import { SensifyPage } from '../../../pages/sensify/sensify-page';
import { Chart } from 'chart.js';
import { ApiProvider } from '../../../providers/api/api';

@Component({
    selector: 'sensify-page-start',
    templateUrl: 'sensify-start.html',
})

export class SensifyStartPage implements OnChanges {

    @Input()
    public metadata: Metadata;

    @Output()
    public onMetadataChange: EventEmitter<Metadata> = new EventEmitter();

    public currBox: SenseBox;
    public date: String;
    public sunrise: String;
    public sunset: String;
    public sensors?: Sensor[];
    public bgImage: String;
    public temperature: String;
    public uv: String;
    public curValue: String;
    public curUnit: String;
    public curName: String;
    public btns: any;
  
    public status:boolean;

    @ViewChild('canvas') canvas;
    chart: any;

    public boxes: (string | ActionSheetButton)[] = [];

    constructor(
        public api: ApiProvider,
        public mySensifyPage: SensifyPage,
        public platform: Platform,
        public navCtrl: NavController,
        public navParams: NavParams,
        public actionSheetCtrl: ActionSheetController
        ) {

        this.sensors = [];
        this.btns = [];

        this.temperature = " - ";
        this.uv = "1000";

        this.curValue = "...";
        this.curUnit = "";
        this.curName;

        this.status = false;

        this.bgImage = "../../../assets/imgs/background.png";
        this.setCurrentDate();
    }

    openMenu() {
        if(this.status){
            this.visualizeCharts();
        }

        let filteredBtns = [];
        
        for(var i: number = 0; i < this.btns.length; i++){
            if(this.btns[i]){
                filteredBtns.push(this.btns[i]);
            }
        }
        const actionSheet = this.actionSheetCtrl.create({
            title: 'Select Sensor',
            buttons: filteredBtns,
        });
        actionSheet.present();
    }

    ngOnChanges(changes) : void {
        if (changes && changes.metadata.currentValue && changes.metadata.currentValue.closestSenseBox) {
            if (this.metadata.settings.curSensor) {
                // this.curName is undefined in setSensors(). It needs to be set, when changes occur.
                this.curName = this.metadata.settings.curSensor.title;
            }
            this.currBox = this.metadata.closestSenseBox;
            this.init();
            this.setSensors();
        }
        this.updateBoxes();
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
                if(Number(this.temperature.slice(0, -3)) <= 0){
                    this.bgImage = "../../../assets/imgs/nightCold_Background.jpg";
                }
            } else {                                          //Tag
                if (Number(this.temperature.slice(0, -3)) <= 0) {
                    this.bgImage = "../../../assets/imgs/snowBackground.jpg";
                } else {

                    if (Number(this.uv) < 700) {
                        this.bgImage = "../../../assets/imgs/cloudBackground.jpg";

                    } else {
                        this.bgImage = "../../../assets/imgs/sunnyBackground.jpg";
                    }
                }
            }
        }
    }

    public setSensors() {
        console.log("set");
        this.sensors = [];
        this.btns = [];
        // check if the current title (sensebox sensor title) exists in the selected sensebox.
        let idx = this.currBox.sensors.findIndex(el => el.title === this.curName);

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
                        this.metadata.settings.curSensor = sensor;
                    }
                };
                this.sensors.push(sensor);

                // always set temperature and uv intensity as globals
                if (sensor.title == "Temperatur") {
                    this.temperature = sensor.lastMeasurement.value;
                }
                if (sensor.title == "UV-Intensität") {
                    this.uv = sensor.lastMeasurement.value;
                }

                // if the selected sensebox has the current selected sensor it is used. otherwise "Temperatur" will be set.
                if (idx >= 0) {
                    if (sensor.title === this.curName) {
                        this.metadata.settings.curSensor = sensor;
                    }
                    if (this.metadata.settings.curSensor) {
                        this.curValue = this.metadata.settings.curSensor.lastMeasurement.value;
                        this.curUnit = this.metadata.settings.curSensor.unit;
                        this.curName = this.metadata.settings.curSensor.title;
                    } else {
                        if (sensor.title == "Temperatur") {
                            this.curValue = sensor.lastMeasurement.value;
                            this.curUnit = sensor.unit;
                            this.curName = sensor.title;
                        }
                    }
                } else {
                    if (sensor.title == "Temperatur") {
                        this.curValue = sensor.lastMeasurement.value;
                        this.curUnit = sensor.unit;
                        this.curName = sensor.title;
                    }
                }

            }
            this.btns.push(newBtn);
        }
    }

    public async updateBoxes() {
        try{
            this.boxes = [];

            if (this.metadata && this.metadata.settings.mySenseBoxIDs && this.metadata.settings.mySenseBoxIDs.length > 0) {
                await Promise.all(this.metadata.settings.mySenseBoxIDs.map(async (id) => {
                    let sb = this.metadata.senseBoxes.find(el => el._id === id);
                    if(!sb){
                        await this.api.getSenseBoxByID(id)
                            .then(box => {
                                sb = box;
                            });
                    }
                    let txt = id;
                    // set SenseBox name as selection text
                    if (sb) {
                        txt = sb.name;
                    }
                    let selected = false;
                    if (this.metadata.closestSenseBox && this.metadata.closestSenseBox._id === id) {
                        selected = true;
                    }
                    const senseBoxIDSelectBtn: any = {
                        text: txt,
                        handler: () => {
                            this.selectSenseBoxID(id);
                        }
                    };
                    this.boxes.push(senseBoxIDSelectBtn);
                }));
            }
        }
        catch (err) {
            console.error(err);
        }
    }

    public selectSenseBoxID(id: String) {
        this.metadata.settings.mySenseBox = id;
        let sensebox = this.metadata.senseBoxes.find(el => el._id === id);
        if (sensebox) {
            this.metadata.closestSenseBox = sensebox;
            this.currBox = sensebox;
            this.setSensors();
            this.setBackground();
        }
        this.onMetadataChange.emit(this.metadata);
    }

    public openSenseBoxIDSelection() {
        const actionSheet = this.actionSheetCtrl.create({
            title: 'Select SenseBox to display',
            buttons: this.boxes,
        });
        actionSheet.present();
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

        return hour + ":" + minutes;
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

    setCurrentDate() {
        var currentDate = new Date()
        var day = currentDate.getDate()
        var month = currentDate.getMonth() + 1 //January is 0!
        this.date = day + "." + month;// + "." + year;
    }

    
    visualizeCharts(){
        if(this.status){
            this.status = false;
            document.getElementById("sensorInformation").style.display = "inline";
            document.getElementById("chart").style.display = "none";
        }else{
            this.status = true;
            document.getElementById("sensorInformation").style.display = "none";
            document.getElementById("chart").style.display = "inline";

            let boxID = this.currBox._id;
            let sensorID:String;

            if(this.metadata.settings.curSensor){
                sensorID = this.metadata.settings.curSensor._id;
            }else{
                for (var i: number = 0; i < this.currBox.sensors.length; i++){
                    if(this.currBox.sensors[i].title == "Temperatur"){          
                        sensorID = this.currBox.sensors[i]._id;
                    }else{
                        sensorID = this.currBox.sensors[0]._id;
                    }
                }
            }
            var currentDate = new Date();
            var day = currentDate.getDate();
            var month = "" + (currentDate.getMonth()); //January is 0!
            var year = currentDate.getFullYear();

            if(month.length <= 1){
                if(month == "0"){
                    month = "12";
                    year = year - 1;
                }else{
                month = "0" + month;
                }
            }

            let fromDate = "" + year + "-" + month + "-" + day + "T" + "00:00:00.678Z";
            var lastMonthData = [];
            var labels = [];

            var chartOptions = {
                scales: {
                    yAxes: [{
                        ticks: {
                            fontColor: "white",
                            fontSize: 14,
                            beginAtZero: true
                        },
                        gridLines: {
                            color: 'rgba(171,171,171,0.5)',
                            lineWidth: 1
                          }
                        
                    }],
                    xAxes: [{
                        ticks: {
                            fontColor: "white",
                            fontSize: 14,
                            beginAtZero: true
                        },
                        gridLines: {
                            display: "none",
                            color: "rgba(0, 0, 0, 0)",
                            lineWidth: 1
                          }
                    }]
                   
                },
                spanGaps: true,
                elements: {
                    point:{
                        radius: 0
                    }
                }
            };

            this.api.getSensorMeasurement(boxID, sensorID, fromDate).then(res => {
                for (var i: number = res.length-1; i > 0; i--) {
                    let curDay = res[i].createdAt.slice(8,10);

                    let cur;

                    if(labels.length>0){                    
                        cur = (labels[labels.length-1]).slice(3,5);
                    }else{
                        cur = null;
                    }              

                    if(curDay == cur){
                        labels.push("");
                        lastMonthData.push(res[i].value);
                    }else{
                        labels.push(res[i].createdAt.slice(5,10));
                        lastMonthData.push(res[i].value);
                    }
                }
                        
                this.chart = new Chart(this.canvas.nativeElement, {
                    type: 'line',                    
                    data: {
                        labels: labels,                        
                        datasets:[{
                            data: lastMonthData,                            
                            pointRadius:0,
                            label: this.curName,
                            borderColor: "#4EAF47",
                            fill: false
                        }]
                    },
                    options: chartOptions
                    
                });
                Chart.defaults.global.defaultFontColor = 'white';
            });

        }
    }
}
