import { ILocalNotification } from '@ionic-native/local-notifications';

export interface Sensor {
    title: String;
    unit: String;
    lastMeasurement: {
        value: String;
        createdAt: String;
    };
    sensorType: String;
    id: String;
}

export interface SenseBox {
    name: String;
    location: L.LatLng;
    model: String;
    grouptag: String;
    description: String;
    createdAt: String;
    updatedAt: String;
    sensors: Sensor[];
    _id: String;
    updatedCategory: String;
    isValid: Boolean;
}

export interface Settings {
    gps: boolean;
    location?: L.LatLng;
    radius: number;
    mySenseBox?: String;
    timestamp: Date;
    ranges: {
        temperature: number;
    };
    zoomLevel: number;
    mapView: L.LatLng;
}

export interface Metadata {
    settings: Settings;
    senseBoxes?: SenseBox[]; // Contains Closest SenseBoxes defined by radius and user location
    closestSenseBox?: SenseBox;
    notifications: ILocalNotification[];
}
