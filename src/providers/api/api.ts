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

    public metadata: Metadata;

    constructor(public http: HttpClient) {
    }

    public async getSenseBoxes(userLocation: L.LatLng, radius: number) {
        let senseboxes: SenseBox[] = [];
        let boxes: SenseBox[] = await this.getSenseBoxesInBB(userLocation, radius);
        let currDate = this.getCurrentDate();
        let todayDate = currDate.today;
        if(todayDate.substring(6, 7) == "-"){
            todayDate = todayDate.substring(0, 5) + "0" + todayDate.substring(5);
        }
        for (const element of boxes) {
            let box = await this.getSenseBoxByID(element._id);
            if (box.updatedAt) {
                let updatedAt = box.updatedAt.substring(0, 10);
                let dateUpdate = new Date(box.updatedAt.toString());
                if (todayDate == updatedAt) {
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
        let currentMonth;
        if ((date.getUTCMonth() + 1) < 10) {
            currentMonth = "0" + (date.getUTCMonth() + 1);
        } else {
            currentMonth = date.getUTCMonth() + 1;
        }
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
                updatedCategory: null,
                isVerified: null
            };
            return box;
        }).toPromise().then((box: SenseBox) => {
            return box;
        })
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
        let dLatSouthEast = -offset / earthRadius;
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
            let todayDate = currDate.today;
            if(todayDate.substring(6, 7) == "-"){
                todayDate = todayDate.substring(0, 5) + "0" + todayDate.substring(5);
            }
            if (boxes.length > 0 || boxes[0] !== null) {
                boxes.forEach((box, i) => {
                    if (box !== null) {
                        if (box.updatedAt) {
                            let updatedAt = box.updatedAt.substring(0, 10);
                            let distance = userLocation.distanceTo(box.location);
                            if (distance < minDistance && todayDate == updatedAt && box.isVerified) {
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
                    //When minDistance is still MAX_VALUE and boxes.length was not zero => No Box with values from today found, therefor closest Box is searched
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
}
