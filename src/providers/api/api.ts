import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map';
import { SenseBox, Metadata } from '../model';
import * as L from "leaflet";

interface CurrentDate {
	today: String;
	week: Date
}

@Injectable()
export class ApiProvider {

	private API_URL = 'https://api.opensensemap.org';
	//private API_URL = 'https://api.testing.opensensemap.org';

	public metadata: Metadata;

	constructor(public http: HttpClient) { }

	getData() {
		return this.http.get(`${this.API_URL}/boxes/5b0d436fd40a290019ef444d`);
	}

	public async getSenseBoxes(userLocation: L.LatLng, radius: number) {
		let senseboxes: SenseBox[] = [];
		let boxes: SenseBox[] = await this.getSenseBoxesInBB(userLocation, radius);
		let currDate = this.getCurrentDate();
		for (const element of boxes) {
			let box = await this.getSenseBoxByID(element._id);
			if (box.updatedAt) {
				let updatedAt = box.updatedAt.substring(0, 10);
				let dateUpdate = new Date(box.updatedAt.toString());
				if (currDate.today == updatedAt) {
					box.updatedCategory = "today";
				} else if (currDate.week.getTime() < dateUpdate.getTime()) {
					box.updatedCategory = "thisWeek";
				} else {
					box.updatedCategory = "tooOld";
				}
			} else {
				box.updatedCategory = "tooOld";
			}
			senseboxes.push(box);
		}
		return senseboxes;
	}


	getCurrentDate(): CurrentDate {
		//Current day in YYYY-MM-DD Format for easy comparison
		let currDate: CurrentDate;
		let date = new Date();
		let tmpDay = date.getUTCDate();
		let currentDay;
		if (tmpDay < 10) {
			currentDay = "0" + tmpDay;
		} else {
      currentDay = tmpDay
    }
		let currentMonth = date.getUTCMonth() + 1;  //January is 0
		let currentYear = date.getUTCFullYear();

		currDate = {
			today: currentYear + "-" + currentMonth + "-" + currentDay,
			week: new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7)
		};
		return currDate;
	}

	getSenseBoxByID(boxID: String): Promise<SenseBox> {
		return this.http.get(`${this.API_URL}/boxes/` + boxID).map(res => {
			let closestBox: any = res;
			let boxLocation: L.LatLng = new L.LatLng(closestBox.currentLocation.coordinates[1], closestBox.currentLocation.coordinates[0]);
			let box: SenseBox = {
				name: closestBox.name,
				location: boxLocation,
				model: closestBox.model,
				grouptag: closestBox.grouptag,
				description: closestBox.description,
				createdAt: closestBox.createdAt,
				updatedAt: closestBox.updatedAt,
				sensors: closestBox.sensors,
				_id: closestBox._id,
				updatedCategory: null
			};
			return box;
		}).toPromise().then((box: SenseBox) => {
			return box;
		})
	}

	getAllSenseBoxes() {
		return this.http.get(`${this.API_URL}/boxes?exposure=outdoor,unknown`);
	}

	static getBboxCoordinates(userLocation: L.LatLng, radius: number): number[] {
		let coordinates: number[] = [];
		//earth radius in meters
		let earthRadius = 6378137;
		//offset in meters
		let offset = radius * 1000;
		//coordinate offsets in radians
		let dLatNorthWest = offset / earthRadius;
		let dLonNorthWest = -offset / (earthRadius * Math.cos(Math.PI * userLocation.lat / 180));
		let dLatSouthEast = - offset / earthRadius;
		let dLonSouthEast = offset / (earthRadius * Math.cos(Math.PI * userLocation.lat / 180));
		//OffsetPosition, decimal degrees
		let lat1 = userLocation.lat + (dLatNorthWest * 180 / Math.PI);
		let lon1 = userLocation.lng + (dLonNorthWest * 180 / Math.PI);
		let lat2 = userLocation.lat + (dLatSouthEast * 180 / Math.PI);
		let lon2 = userLocation.lng + (dLonSouthEast * 180 / Math.PI);
		// Order specifically needs to be 
		// longitude southwest, latitude southwest, longitude northeast, latitude northeast.
		coordinates.push(lon1);
		coordinates.push(lat2);
		coordinates.push(lon2);
		coordinates.push(lat1);

		return coordinates;
	}

	getSenseBoxesInBB(userLocation: L.LatLng, radius: number): Promise<SenseBox[]> {
		let coordinates = ApiProvider.getBboxCoordinates(userLocation, radius);
		let coordinatesString = coordinates.join(",");

		return this.http.get(`${this.API_URL}/boxes?exposure=outdoor,unknown&bbox=` + coordinatesString + '&minimal=true').map(res => {
			let allBoxes: any = res;
			let closestSenseBoxes: any[] = [];
			allBoxes.forEach(element => {
				let boxLocation: L.LatLng = new L.LatLng(element.currentLocation.coordinates[1], element.currentLocation.coordinates[0]);
				let distance: number = boxLocation.distanceTo(userLocation) / 1000; // distanceTo is in 'meters'
				// filter necessary because filter is a circle, not a rectangle
				if (distance <= radius) {
					closestSenseBoxes.push(element);
				}
			});
			return closestSenseBoxes;
		}).toPromise().then((closestSenseBoxes: any[]) => {
			return closestSenseBoxes;
		});
	}

	getclosestSenseBox(boxes: SenseBox[], userLocation: L.LatLng): Promise<SenseBox> {
		return new Promise((resolve, reject) => {
			if (!userLocation) {
				console.error('no userlcoation provided!\ngetClosestSenseBox() has no property userLocation.');
				reject('no userlocation provided');
			}
			let index = 0;
			let minDistance: number = Number.MAX_VALUE;
			let i = 0;
			let currDate = this.getCurrentDate();
			if (boxes.length > 0 || boxes[0] !== null) {
				boxes.forEach((box, i) => {
					if (box !== null) {
						if (box.updatedAt) {
							let updatedAt = box.updatedAt.substring(0, 10);
							let distance = userLocation.distanceTo(box.location);
							if (distance < minDistance && currDate.today == updatedAt) {
								index = i;
								minDistance = distance;
							}
							i++;
						}
					}
				});
				if (minDistance != Number.MAX_SAFE_INTEGER) {
					resolve(boxes[index]);
				} else {
					//When minDistance is still MAX_VALUE and boxes.length was not zero => No Box with values from today found, therefor closst Box is searched
					boxes.forEach(box => {
						let distance = userLocation.distanceTo(box.location);
						if (distance < minDistance) {
							index = i;
							minDistance = distance;
						}
						i++;
					});
					console.error("NO SENSEBOX WITH VALUES FROM TODAY FOUND. USING CLOSEST BOX INSTEAD");
					resolve(boxes[index]);
				}
			} else {
				console.error('no boxes provided!\ngetClosestSenseBox() has no property boxes.');
				reject('No boxes found');
			}
		});
	};

	getclosestSenseBoxTest(boxes: SenseBox[], userLocation: L.LatLng): SenseBox {
		let index: number = 0;
		let minDistance: any = Number.MAX_VALUE;
		let i = 0;
		boxes.forEach(box => {
			let distance = box.location.distanceTo(userLocation);
			if (distance < minDistance) {
				index = i;
				minDistance = distance;
			}
			i++;
		});
		return boxes[index];
	}


	//###################
	// VALIDATION
	//###################

	//
	/**
	 * Function for validating a sensor measurement by comparing it to the mean value of the closest SenseBox measurements (+/- some range).
	 * @param sensorName  	{String}	Name of the Sensor, for instance: "Temperatur".
	 * @param closestBox 	{SenseBox}	SenseBox the user is connected to.
	 * @param senseBoxes 	{SenseBox[]}Array of all SenseBoxes inside certain radius	.
	 * @param range 		{number}	Validation range.
	 * @return {boolean} 				True, if value is inside range.
	 */
	sensorIsValid(sensorName: String, closestBox: SenseBox, senseBoxes: SenseBox[], range: number) {
		//Check if closestBox even has the given sensor
		if (this.senseBoxHasSensor(sensorName, closestBox)) {
			//Get mean of all closest Boxes (same sensor and same day)
			let mean = this.getMeanValue(sensorName, senseBoxes);
			//validate and return 
			return this.validateValue(sensorName, mean, closestBox, range)
		}
	}

	//Checks if closestSenseBox has the sensor that you want to validate
	senseBoxHasSensor(sensorName: String, closestBox: SenseBox) {
		let res = false;
		closestBox.sensors.forEach(sensor => {
			let title: String = sensor.title;
			if (sensorName === title) res = true;
		});
		return res;
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

	//Checks if sensor value form sensebox is inside the range of mean values of all closest boxes (+/- validation range)
	validateValue(sensorName: String, mean: number, closestBox: SenseBox, range: number) {
		let boxValue: number;
		//get closest box value for validation
		closestBox.sensors.forEach(sensor => {
			if (sensor.title === sensorName) {
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
