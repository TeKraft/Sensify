import { Injectable } from "@angular/core";
import { SenseBox } from '../../../providers/model';

@Injectable()
export class validation {

    constructor() {
    }

    //Returns the mean sensor value of all closest Boxes (between -Current Day ONLY!!)
    getMeanValue(sensorName: String, senseBoxes: SenseBox[]) {
        let sum: number = 0;
        let numberOfSensors = 0;
        let mean: number;
        //needed to check for same day measurements
        let date = new Date();
        let currentDay = date.getUTCDate();
        let currentMonth = date.getUTCMonth() + 1;  //January is 0
        let currentYear = date.getUTCFullYear();

        //check all closest boxes
        senseBoxes.forEach(box => {
            //check all sensors
            if (box) {
                box.sensors.forEach(sensor => {
                    //if sensor title is equal to searched sensor
                    if (sensor.title == sensorName && sensor.lastMeasurement && sensor.lastMeasurement.createdAt) {
                        let measurements = sensor.lastMeasurement;

                        //Get Year, Month, Day of lastMeasurements for checking
                        let creationDay = Number(measurements.createdAt.substring(8, 10));
                        let creationMonth = Number(measurements.createdAt.substring(5, 7));
                        let creationYear = Number(measurements.createdAt.substring(0, 4));

                        //check if last measurement is from same day, same month, same year
                        if (creationDay == currentDay && creationMonth == currentMonth && creationYear == currentYear) {
                            sum += Number(measurements.value);
                            numberOfSensors++;
                        }
                    }
                });
            }
        });
        //Division by zero handling
        if (numberOfSensors === 0) {
            console.error("VALIDATION ERROR: Could not validate. No Sensors or no measurements from today found.");
            return 0;
        } else {
            mean = sum / numberOfSensors;
            return mean;
        }
    }

    //Checks if closestSenseBox has the sensor that you want to validate
    senseBoxHasSensor(sensorName: String, closestBox: SenseBox) {
        let res = false;
        if (closestBox) {
            closestBox.sensors.forEach(sensor => {
                let title: String = sensor.title;
                if (sensorName === title) res = true;
            });
        }
        return res;
    }

    //
    /**
     * Function for validating a sensor measurement by comparing it to the mean value of the closest SenseBox measurements (+/- some range).
     * @param sensorName    {String}    Name of the Sensor, for instance: "Temperatur".
     * @param closestBox    {SenseBox}    SenseBox the user is connected to.
     * @param senseBoxes    {SenseBox[]}Array of all SenseBoxes inside certain radius    .
     * @param range        {number}    Validation range.
     * @return {boolean}                True, if value is inside range.
     */
    sensorIsValid(sensorName: String, closestBox: SenseBox, senseBoxes: SenseBox[], range: number) {
        let valiValue = false;
        //Check if closestBox even has the given sensor
        if (this.senseBoxHasSensor(sensorName, closestBox)) {
            //Get mean of all closest Boxes (same sensor and same day)
            let mean = this.getMeanValue(sensorName, senseBoxes);
            //validate and return
            valiValue = this.validateValue(sensorName, mean, closestBox, range);
        }
        return (valiValue);
    };

    //Checks if sensor value form sensebox is inside the range of mean values of all closest boxes (+/- validation range)
    validateValue(sensorName: String, mean: number, closestBox: SenseBox, range: number) {
        let boxValue: number;
        //get closest box value for validation
        closestBox.sensors.forEach(sensor => {
            if (sensor.title === sensorName) {
                if (!sensor.lastMeasurement) {
                    return false;
                }
                boxValue = Number(sensor.lastMeasurement.value);
            }
        });
        //if boxvalue is inside range, return true, else false
        if (mean - range <= boxValue && boxValue <= mean + range) {
            return true;
        } else {
            return false;
        }
    }

}