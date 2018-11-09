import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import { SenseBox } from '../model';
import * as L from "leaflet";

@Injectable()
export class ApiProvider {

	private API_URL = 'https://api.opensensemap.org';
	//private API_URL = 'https://api.testing.opensensemap.org';
	private sumTemp: any = 0;
	private nSensors: any = 0;

	constructor(public http: HttpClient) {
		console.log('Hello ApiProvider Provider');
	}

	getData() {
		return this.http.get(`${this.API_URL}/boxes/5b0d436fd40a290019ef444d`);
	}

	getSenseBoxes() {
		return this.http.get(`${this.API_URL}/boxes?exposure=outdoor,mobile,unknown`);
	}

	getAllSenseBoxes() {
		return this.http.get(`${this.API_URL}/boxes?exposure=outdoor,unknown`);
	}

	getBboxCoordinates(userLocation: L.LatLng, radius : number): number[]{
		let coordinates : number[] = [];
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

	getSenseBoxesInBB(userLocation : L.LatLng, radius: number): Promise<SenseBox[]>{
		let coordinates = this.getBboxCoordinates(userLocation, radius);
		let closestSenseBoxes : SenseBox[] = [];
		let coordinatesString = coordinates.join(",");

		return this.http.get(`${this.API_URL}/boxes?exposure=outdoor,unknown&bbox=`+coordinatesString).map(res => {
			let allBoxes: any = res;
			allBoxes.forEach(element => {
				let boxLocation: L.LatLng = new L.LatLng(element.currentLocation.coordinates[1], element.currentLocation.coordinates[0]);
				let distance: number = boxLocation.distanceTo(userLocation) / 1000; // distanceTo is in 'meters'
				// filter necessary because filter is a circle, not a rectangle
				if (distance <= radius) {
					let box: SenseBox = {
						name: element.name,
						location: boxLocation,
						model: element.model,
						grouptag: element.grouptag,
						description: element.description,
						createdAt: element.createdAt,
						updatedAt: element.updatedAt,
						sensors: element.sensors,
						_id: element._id
					}
				closestSenseBoxes.push(box);
				}
			});
			return closestSenseBoxes;
		}).toPromise().then(closestSenseBoxes => {
			return closestSenseBoxes;
		});
	}

	getClosestSenseBoxes(userLocation: L.LatLng, radius: number): Promise<SenseBox[]> {
		let closestSenseBoxes = [];
		return this.http.get(`${this.API_URL}/boxes?exposure=outdoor, unknown`).map(res => {
			let allBoxes: any = res;
			allBoxes.forEach(element => {
				let boxLocation: L.LatLng = new L.LatLng(element.currentLocation.coordinates[1], element.currentLocation.coordinates[0]);
				let distance: number = boxLocation.distanceTo(userLocation) / 1000; // distanceTo returns meters, not kilometers
				if (distance <= radius) {

					let box: SenseBox = {
						name: element.name,
						location: boxLocation,
						model: element.model,
						grouptag: element.grouptag,
						description: element.description,
						createdAt: element.createdAt,
						updatedAt: element.updatedAt,
						sensors: element.sensors,
						_id: element._id
					}

					closestSenseBoxes.push(box);
				}
			});
			return closestSenseBoxes;
		}).toPromise().then(closestSenseBoxes => {
			return closestSenseBoxes;
		});
	}

	getclosestSenseBox(boxes: SenseBox[], userLocation: L.LatLng): SenseBox {
		// TODO: Error Handling for SenseBox.length = 0
		let index = 0;
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

	getclosestSenseBoxTest(boxes: SenseBox[], userLocation: L.LatLng): SenseBox {
		let index: any = 0;
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

	getBoxMeasurements(box_id: String) {
		let url = this.API_URL + "/boxes/" + box_id + "/sensors";
		return this.http.get(url);
	}

	getMeanTemp(closestBoxes: SenseBox[]): number {
		//dateused to look for sensors that provided measurements of TODAY
		let date = new Date();
		let dayOfMonth = date.getUTCDate();

		closestBoxes.forEach(box => {
			let sensors = box.sensors;
			sensors.forEach(sensor => {
				if (sensor.title == ("Temperatur" || sensor.title == "Temperature") && sensor.lastMeasurement != undefined) {
					//if yes get measurements from that box
					this.getBoxMeasurements(box._id).subscribe(res => {
						let boxMeasurements: any = res;
						boxMeasurements.sensors.forEach(element => {
							if (element.lastMeasurement) {
								//if values are from same day, in a certain interval, add to nSensors (number of used sensors) and sumTemp (sum of all temp values)
								let numMeasurement = parseFloat(element.lastMeasurement.value);
								let valueDate = element.lastMeasurement.createdAt.substring(8, 10);
								if (element.title == "Temperatur" || element.title == "Temperature") {
									if (valueDate == dayOfMonth) {
										if (numMeasurement > -20 && numMeasurement < 40) {
											this.nSensors += 1;
											this.sumTemp += numMeasurement;
										}
									}
								}
							}
						});
					})
				}
			});
		});
		let meanTemp: number = this.sumTemp / this.nSensors;
		return meanTemp;
	}

	//!!!! What should be the return statement? For now, only console output is given. Return statement should be discussed!
	validateSenseBoxTemperature(cBox: SenseBox, cBoxes: SenseBox[], tempRange: number) {
		let closestBox = cBox;
		let closestBoxes = cBoxes;
		let meanTemperature: number = this.getMeanTemp(closestBoxes);
		let range: any = tempRange; // +/- degree celsius

		if (meanTemperature) {
			this.getBoxMeasurements(closestBox._id).subscribe(res => {
				let values: any = res;
				values.sensors.forEach(sensor => {
					if (sensor.title == ("Temperatur" || sensor.title == "Temperature") && sensor.lastMeasurement != undefined) {
						let nearestBoxTemperature: any = parseFloat(sensor.lastMeasurement.value);
						if (meanTemperature - range < nearestBoxTemperature && meanTemperature + range > nearestBoxTemperature) {
							console.log("TEMPERATUR DER AKTUELLEN BOX IST OK");
							console.log("Mittlere Temp aller Boxen von heute:" + meanTemperature + "(+/- " + range + "), Temp der nächsten Box:" + nearestBoxTemperature);
						} else {
							console.log("TEMPERATUR DER AKTUELLEN BOX IS SELTSAM BRUHH");
							console.log("Mittlere Temp aller Boxen von heute:" + meanTemperature + "(+/- " + range + "), Temp der nächsten Box:" + nearestBoxTemperature);
						}
					};
				})
			})
		}
	}
}