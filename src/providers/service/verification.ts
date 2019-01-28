import { Injectable } from "@angular/core";
import { SenseBox } from '../model';

@Injectable()
export class verification {

    constructor() {
    }

    /**
     *  Function for getting the current date, seperated into day, month and year.
     *  @return Object with current day, month and year.
     */
    setCurrentDate(){
        let date = new Date();
        let currentDay = date.getUTCDate();
        let currentMonth = date.getUTCMonth() + 1;  //January is 0
        let currentYear = date.getUTCFullYear();
        return {
            currentDay:currentDay,
            currentMonth:currentMonth,
            currentYear:currentYear
        }
    };

    /**
     * Function for dividing the createdAt string from the SenseBoxes to seperate the day, month and year.
     * @param measurements Object with the date of the measurements and the valmeasured value.
     * @return Object with date of the given measurement, given in day, month and year.
     */
    getMeasurementDate(measurements:any){
        let creationDay = Number(measurements.createdAt.substring(8, 10));
        let creationMonth = Number(measurements.createdAt.substring(5, 7));
        let creationYear = Number(measurements.createdAt.substring(0, 4));
        return {
            day:creationDay,
            month:creationMonth,
            year:creationYear
        }
    }

    /**
     * Function for verifying if a given value is equal.
     * @param mean Mean value of all surrounding SenseBoxes with the same sensor as the boxValue.
     * @param range Verification range.
     * @param boxValue SenseBox sensor value.
     * @return Boolean, indicating if the given value is in the verification range.
     */
    valueInVerificationRange(mean:number, range:number, boxValue:number){
        const upperLimit = mean + range;
        const lowerLimit = mean - range;

        if (lowerLimit <= boxValue && boxValue <= upperLimit) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Function for calculating the mean sensor value for a given sensor name and a set of SenseBoxes.
     * First, the existence of the sensor in the given SenseBox is verified.
     * After verifying that the measurements from those sensors are up to date, the mean of all sensor values 
     * is calculated and returned. 
     * @param sensorName Name of the sensor for which the mean value has to be calculated.
     * @param senseBoxes Array of SenseBoxes.
     * @return Mean value of all sensors that match the given sensor type and that have values that are up to date. If there are no senseboxes, 0 is returned.
     */
    getMeanValue(sensorName:String, senseBoxes:SenseBox[]) {
        let sum:number = 0;
        let numberOfSensors = 0;
        let mean:number;
        //needed to check for same day measurements
        const today = this.setCurrentDate();
        //check all closest boxes
        senseBoxes.forEach(box => {
            //No Boxes found check
            if (box) {
                box.sensors.forEach(sensor => {
                    //if sensor title is equal to searched sensor
                    if (sensor.title == sensorName && sensor.lastMeasurement && sensor.lastMeasurement.createdAt) {
                        let measurements = sensor.lastMeasurement;
                        let measurementDate = this.getMeasurementDate(measurements)
                        //check if last measurement is from same day, same month, same year
                        if (measurementDate.day == today.currentDay && measurementDate.month == today.currentMonth && measurementDate.year == today.currentYear) {
                            sum += Number(measurements.value);
                            numberOfSensors++;
                        }
                    }
                });
            }
        });
        //Division by zero handling
        if (numberOfSensors === 0) {
            console.error("VALIDATION ERROR:Could not verify. No Sensors or no measurements from today found.");
            alert("Validation Error!")
            return 0;
        } else {
            mean = sum / numberOfSensors;
            return mean;
        }
    }

    /**
     * Function for verifying the existence of a given sensor in a given SenseBox.
     * @param sensorName Name of the sensor
     * @param closestBox SenseBox for which the existence has to be verified.
     * @return Boolean, which indicates the existence of absence of the given sensor in the given SenseBox.
     */
    senseBoxHasSensor(sensorName:String, closestBox:SenseBox) {
        let res = false;
        if (closestBox) {
            closestBox.sensors.forEach(sensor => {
                let title:String = sensor.title;
                if (sensorName === title) res = true;
            });
        }
        return res;
    }

    //
    /**
     * Function for verifying a sensor measurement by comparing it to the mean value of the closest SenseBox measurements (+/- a set range).
     * @param sensorName  Name of the Sensor, for instance:"Temperatur".
     * @param closestBox  SenseBox the user is connected to.
     * @param senseBoxes  Array of all SenseBoxes inside certain radius    .
     * @param range       Verification range.
     * @return True, if value is inside range.
     */
    sensorIsVerified(sensorName:String, closestBox:SenseBox, senseBoxes:SenseBox[], range:number) {
        let valiValue = false;
        //Check if closestBox even has the given sensor
        if (this.senseBoxHasSensor(sensorName, closestBox)) {
            //Get mean of all closest Boxes (same sensor and same day)
            let mean = this.getMeanValue(sensorName, senseBoxes);
            //verify and return
            valiValue = this.verifyValue(sensorName, mean, closestBox, range);
        }
        return (valiValue);
    };

    /**
     * Function for verifying the latest measurement of a given sensor in a given SenseBox.
     * The value is verified if the mean value of all surrounding boxes, +/- a given range, includes the value to be verified.
     * @param sensorName Name of the sensor.
     * @param mean Mean value, of the same sensors, of all the surrounding SenseBoxes.
     * @param closestBox The current SenseBox for which the last sensor measurement has to be verified.
     * @param range Pre-set or user-set range round the mean for which a value is verified or not.
     * @return Boolean, indicating if the value of the given sensor if verified.
     */
    verifyValue(sensorName:String, mean:number, closestBox:SenseBox, range:number) {
        let boxValue:number;
        //get closest box value for verification
        closestBox.sensors.forEach(sensor => {
            if (sensor.title === sensorName) {
                if (!sensor.lastMeasurement) {
                    return false;
                }
                boxValue = Number(sensor.lastMeasurement.value);
            }
        });
       //if boxvalue is inside range, return true, else false
       return this.valueInVerificationRange(mean, range, boxValue);
    }
}