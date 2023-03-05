export class DataService {
    data = {};

    getFacilityTypeName(saunaId) {
        switch (this.data[saunaId].facilityType) {
        case 20:
            return 'Supervised';
        case 21:
            return 'Time Controlled';
        case 22:
            return 'Private';
        case 23:
            return 'Public';
        case 24:
            return 'Unknown';
        default:
            return 'Unknown';
        }
    }

    resetData(saunaId) {
        this.data[saunaId] = {
            // Integer values
            targetTemperature: 0,
            standbyOffsetTemperature: 0,
            externalTemperature: 0,
            lowerLimitTemperature: 0,
            upperLimitTemperature: 0,
            systemLowerLimitTemperature: 0,
            systemUpperLimitTemperature: 0,
            bathTime: 0,
            maxBathTime: 0,
            externalHumidity: 0,
            targetHumidity: 0,
            tankWaterTemperature: 0,
            runTimeLeft: 0,
            timeToAllowedStart: 0,
            tankStandbyTemperature: 0,
            waterLevel: 0,
            region: 0,
            facilityType: 0,
            isLiteVariant: 0,

            // Bool values
            lighting: false,
            standbyEnable: false,
            humiditySensorAvailable: false,
            irEnabled: false,
            delayedStartEnable: false,
            delayedStartRunning: false,
            magneticSensorConnected: false,
            calendarWeekdayProgramDisable: false,

            // User Settings
            temperatureUnit: 10,
            temperaturePresentation: 11,
            humidityPresentation: 11,
            dateFormat: 10,
            timeFormat: 10,
            weekstart: 10,
            language: 202,

            saunaTimediff: 0,

            // Favorites
            favorites: [],

            // User Messages
            userMessage: '',
            showUserMessage: false,

            saunaState: 0,

            // Changed in duration tab.
            hour: 1,
            minute: 30,

            favoriteHour: 1,
            favoriteMinute: 30,

            supportedCharacters: [],

            maxHumidityTable: [],
            maxTemperatureTable: [],

            auxRelaySauna: [],

            saunaTimestamp: new Date('2000-01-01') // UINT64-problem
        };
    }
}
