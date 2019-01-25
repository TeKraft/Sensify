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
    isVerified: Boolean;
}

export interface Settings {
    gps: boolean;
    location?: L.LatLng;
    radius: number;
    mySenseBox?: String;
    mySenseBoxIDs?: String[];
    timestamp: Date;
    ranges: {
        temperature: number;
    };
    thresholds: Thresholds;
    zoomLevel: number;
    mapView: L.LatLng;
    curSensor: Sensor;
}

export interface Thresholds {
    temperature: {
        min: number;
        max: number;
    };
    uvIntensity: {
        max: number;
    }
}

export interface Metadata {
    settings: Settings;
    senseBoxes?: SenseBox[]; // Contains Closest SenseBoxes defined by radius and user location
    closestSenseBox?: SenseBox;
    notifications: ILocalNotification[];
}

export enum NotificationSensorTitles {
    temperature = 'Temperatur',
    uvIntensity = 'UV-Intensität',
    // brightness = 'Beleuchtungsstärke',
    // airpressure = 'Luftdruck',
    // humidity = 'rel. Luftfeuchte'
    // , 'PM2.5', 'PM10', 'Niederschlagsmenge', 'Wolkenbedeckung', 'Windrichtung', 'Windgeschwindigkeit'
}

export enum NotificationThresholdValues {
    temperatureLow = 1,
    temperatureHigh = 25,
    uvIntensityHigh = 300, // test value
    // airpressureHigh
}

export enum NotificationMessages {
    temperatureLow = 'It is very cold today',
    temperatureHigh = 'It is very hot today',
    uvIntensityHigh = 'It is very sunny today',
    // airpressureHigh = 'It is very windy today.'
}
