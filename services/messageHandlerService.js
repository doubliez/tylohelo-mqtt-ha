import { EventEmitter } from 'node:events';

export class MessageHandlerService extends EventEmitter {
    #dataService;
    #calendarService;

    constructor(dataService, calendarService) {
        super();
        this.#dataService = dataService;
        this.#calendarService = calendarService;
    }

    handle(saunaId, msg) {
        if (msg.integerValue && msg.integerValue.length > 0) {
            this.handleIntegerValues(saunaId, msg.integerValue);
        }

        if (msg.enumValue && msg.enumValue.length > 0) {
            this.handleEnumValues(saunaId, msg.enumValue);
        }

        if (msg.booleanValue && msg.booleanValue.length > 0) {
            this.handleBooleanValues(saunaId, msg.booleanValue);
        }

        if (msg.userSetting) {
            this.handleUserSettings(saunaId, msg.userSetting);
        }

        if (msg.favorite && msg.favorite.length > 0) {
            this.handleFavorites(saunaId, msg.favorite);
        }

        if (msg.saunaState) {
            this.handleSaunaState(saunaId, msg.saunaState);
        }

        if (msg.userMessage) {
            this.handleUserMessages(saunaId, msg.userMessage);
        }

        if (msg.auxRelaySauna) {
            this.handleAux(saunaId, msg.auxRelaySauna);
        }

        if (msg.descaling) {
            this.handleDescaling(saunaId, msg.descaling);
        }

        if (msg.calendarProgram && msg.calendarProgram.length > 0) {
            this.handleCalendarMessages(saunaId, msg.calendarProgram);
        }

        if (msg.presentedValue) {
            this.handlePresentedValue(saunaId, msg.presentedValue);
        }

        if (msg.controlBoardSupport) {
            this.handleControlBoardSupport(saunaId, msg.controlBoardSupport);
        }

        // Pop array of valid characters...
        if (msg.saunaFunctionSupport && msg.saunaFunctionSupport.supportedCharacters && msg.saunaFunctionSupport.supportedCharacters.length > 0) {
            msg.saunaFunctionSupport.supportedCharacters.forEach(charCode => {
                this.#dataService.data[saunaId].supportedCharacters.push(String.fromCharCode(charCode));
            });
        }

        // Build array of valid humidity values
        if (msg.saunaFunctionSupport && msg.saunaFunctionSupport.maxHumidity && this.#dataService.data[saunaId].maxHumidityTable.length < 1) {
            this.#dataService.data[saunaId].maxHumidityTable = [];
            msg.saunaFunctionSupport.maxHumidity.forEach(maxValue => {
                this.#dataService.data[saunaId].maxHumidityTable.push(maxValue);
            });
        }

        // Build array of valid temperature values
        if (msg.saunaFunctionSupport && msg.saunaFunctionSupport.maxTemperature && this.#dataService.data[saunaId].maxTemperatureTable.length < 1) {
            this.#dataService.data[saunaId].maxTemperatureTable = [];
            msg.saunaFunctionSupport.maxTemperature.forEach(maxValue => {
                this.#dataService.data[saunaId].maxTemperatureTable.push(maxValue);
            });
        }
    }

    handleSaunaState(saunaId, saunaState) {
        if (saunaState.state && this.#dataService.data[saunaId].saunaState !== saunaState.state) {
            this.#dataService.data[saunaId].saunaState = saunaState.state;
            this.emit('saunaState', saunaId, saunaState.state);
        }
        if (saunaState.time) {
            this.#dataService.data[saunaId].saunaTime = new Date(Date.UTC(2000, 0, 1) + saunaState.time.toNumber());// new Date(saunaState.time.toNumber()); // + new Date().getTimezoneOffset()*1000*60
        }
    }

    handleIntegerValues(saunaId, values) {
        values.forEach(intVal => {
            switch (intVal.valueType) {
            case 10:
                if (this.#dataService.data[saunaId].targetTemperature !== intVal.value) {
                    this.#dataService.data[saunaId].targetTemperature = intVal.value;
                    this.emit('triggerMqttDiscovery', saunaId);
                    this.emit('targetTemperature', saunaId, intVal.value);
                }
                break;
            case 11:
                if (this.#dataService.data[saunaId].standbyOffsetTemperature !== intVal.value) {
                    this.#dataService.data[saunaId].standbyOffsetTemperature = intVal.value;
                    this.emit('standbyOffsetTemperature', saunaId, intVal.value);
                }
                break;
            case 12:
                if (this.#dataService.data[saunaId].externalTemperature !== intVal.value) {
                    this.#dataService.data[saunaId].externalTemperature = intVal.value;
                    if (this.#dataService.data[saunaId].temperaturePresentation === 11) {
                        this.emit('temperature', saunaId, intVal.value);
                    }
                }
                break;
            case 13:
                this.#dataService.data[saunaId].lowerLimitTemperature = intVal.value;
                break;
            case 14:
                this.#dataService.data[saunaId].upperLimitTemperature = intVal.value;
                break;
            case 15:
                this.#dataService.data[saunaId].systemLowerLimitTemperature = intVal.value;
                break;
            case 16:
                this.#dataService.data[saunaId].systemUpperLimitTemperature = intVal.value;
                break;
            case 17:
                if (this.#dataService.data[saunaId].bathTime !== intVal.value) {
                    this.#dataService.data[saunaId].bathTime = intVal.value;
                    this.#dataService.data[saunaId].hour = Math.floor(this.#dataService.data[saunaId].bathTime / 60);
                    this.#dataService.data[saunaId].minute = this.#dataService.data[saunaId].bathTime % 60;
                    this.emit('bathTime', saunaId, intVal.value);
                }
                break;
            case 18:
                this.#dataService.data[saunaId].maxBathTime = intVal.value;
                break;
            case 19:
                if (this.#dataService.data[saunaId].externalHumidity !== intVal.value) {
                    this.#dataService.data[saunaId].externalHumidity = intVal.value;
                    if (this.#dataService.data[saunaId].humidityPresentation === 11) {
                        this.emit('humidity', saunaId, intVal.value);
                    }
                }
                break;
            case 20:
                if (this.#dataService.data[saunaId].targetHumidity !== intVal.value) {
                    this.#dataService.data[saunaId].targetHumidity = intVal.value;
                    this.emit('targetHumidity', saunaId, intVal.value);
                }
                break;
            case 21:
                if (this.#dataService.data[saunaId].tankWaterTemperature !== intVal.value) {
                    this.#dataService.data[saunaId].tankWaterTemperature = intVal.value;
                    this.emit('tankWaterTemperature', saunaId, intVal.value);
                }
                break;
            case 22:
                if (this.#dataService.data[saunaId].runTimeLeft !== intVal.value) {
                    this.#dataService.data[saunaId].runTimeLeft = intVal.value;
                    this.emit('runTimeLeft', saunaId, intVal.value);
                }
                break;
            case 23:
                this.#dataService.data[saunaId].timeToAllowedStart = intVal.value;
                break;
            case 24:
                if (this.#dataService.data[saunaId].tankStandbyTemperature !== intVal.value) {
                    this.#dataService.data[saunaId].tankStandbyTemperature = intVal.value;
                    this.emit('tankStandbyTemperature', saunaId, intVal.value);
                }
                break;
            default:
            }
        });
    }

    handleEnumValues(saunaId, values) {
        values.forEach(enumVal => {
            if (enumVal.waterLevel && this.#dataService.data[saunaId].waterLevel !== enumVal.waterLevel) {
                this.#dataService.data[saunaId].waterLevel = enumVal.waterLevel;
                this.emit('waterLevel', saunaId, enumVal.waterLevel);
            }

            if (enumVal.region) {
                this.#dataService.data[saunaId].region = enumVal.region;
            }

            if (enumVal.facilityType) {
                this.#dataService.data[saunaId].facilityType = enumVal.facilityType;
            }
        });
    }

    handleFavorites(saunaId, values) {
        if (this.#dataService.data[saunaId].favorites.length < 1) {
            this.#dataService.data[saunaId].favorites = [];
            values.forEach(favourite => {
                this.#dataService.data[saunaId].favorites.push(favourite);
            });
        } else {
            values.forEach(favourite => {
                this.#dataService.data[saunaId].favorites[favourite.index] = favourite;
            });
        }
    }

    handleAux(saunaId, message) {
        if (this.#dataService.data[saunaId].auxRelaySauna.length < 1) {
            this.#dataService.data[saunaId].auxRelaySauna = [];
            message.forEach(aux => {
                this.#dataService.data[saunaId].auxRelaySauna.push(aux);
            });
        } else {
            message.forEach(aux => {
                this.#dataService.data[saunaId].auxRelaySauna[aux.auxRelayPost.index] = aux;
            });
        }
    }

    handleDescaling(saunaId, message) {
        this.#dataService.data[saunaId].auxEnabled = message.enabled;
        this.#dataService.data[saunaId].auxForDescaling = message.auxIndex;
    }

    handleUserMessages(saunaId, message) {
        if (message.messageType === 10) {
            this.#dataService.data[saunaId].userMessage = null;
            this.#dataService.data[saunaId].showUserMessage = false;
            this.emit('error', saunaId, {
                state: 'OFF'
            });
        } else {
            this.#dataService.data[saunaId].userMessage = message;
            this.#dataService.data[saunaId].showUserMessage = true;
            message.formattedPanelMessage = String.fromCharCode.apply(null, message.formattedPanelMessage);
            this.emit('error', saunaId, {
                state: 'ON',
                message
            });
        }
    }

    handleBooleanValues(saunaId, values) {
        values.forEach(boolVal => {
            switch (boolVal.valueType) {
            case 10:
                if (this.#dataService.data[saunaId].lighting !== boolVal.value) {
                    this.#dataService.data[saunaId].lighting = boolVal.value;
                    this.emit('light', saunaId, boolVal.value ? 'ON' : 'OFF');
                }
                break;
            case 11:
                this.#dataService.data[saunaId].standbyEnable = boolVal.value;
                break;
            case 12:
                this.#dataService.data[saunaId].humiditySensorAvailable = boolVal.value;
                break;
            case 13:
                this.#dataService.data[saunaId].delayedStartEnable = boolVal.value;
                break;
            case 14:
                this.#dataService.data[saunaId].delayedStartRunning = boolVal.value;
                break;
            case 15:
                if (this.#dataService.data[saunaId].magneticSensorConnected !== boolVal.value) {
                    this.#dataService.data[saunaId].magneticSensorConnected = boolVal.value;
                    this.emit('door', saunaId, boolVal.value ? 'OFF' : 'ON');
                }
                break;
            case 16:
                this.#dataService.data[saunaId].calendarWeekdayProgramDisable = boolVal.value;
                break;
            case 23:
                this.#dataService.data[saunaId].irEnabled = boolVal.value;
                break;
            default:
            }
        });
    }

    handleUserSettings(saunaId, value) {
        if (value.temperatureUnit && this.#dataService.data[saunaId].temperatureUnit !== value.temperatureUnit) {
            this.#dataService.data[saunaId].temperatureUnit = value.temperatureUnit;
            this.emit('triggerMqttDiscovery', saunaId);
        }
        if (value.temperaturePresentation) this.#dataService.data[saunaId].temperaturePresentation = value.temperaturePresentation;
        if (value.humidityPresentation) this.#dataService.data[saunaId].humidityPresentation = value.humidityPresentation;
        if (value.dateFormat) this.#dataService.data[saunaId].dateFormat = value.dateFormat;
        if (value.timeFormat) this.#dataService.data[saunaId].timeFormat = value.timeFormat;
        if (value.weekstart) this.#dataService.data[saunaId].weekstart = value.weekstart;
        if (value.language) this.#dataService.data[saunaId].language = value.language;
    }

    handleCalendarMessages(saunaId, calendarPrograms) {
        calendarPrograms.forEach(item => {
            const cal = this.parseCalenderItem(item);
            this.#calendarService.updateCalendarItem(saunaId, cal);
        });
    }

    parseCalenderItem(item) {
        const calendarItem = {
            activationTime: item.activationTime ? new Date(Date.UTC(2000, 0, 1) + item.activationTime.toNumber()) : null,
            endTime: item.activationTime ? new Date(Date.UTC(2000, 0, 1) + item.activationTime.toNumber() + item.bathTime * 60 * 1000) : null,
            bathTime: item.bathTime,
            favorite: item.favorite,
            humiditySetPoint: item.humiditySetPoint,
            index: item.index,
            standby: item.standby,
            startMode: item.startMode,
            temperatureSetPoint: item.temperatureSetPoint,
            valid: item.valid,
            weekday: item.weekday
        };
        return calendarItem;
    }

    handlePresentedValue(saunaId, val) {
        if (val.temperature && this.#dataService.data[saunaId].presentedTemperature !== val.temperature) {
            this.#dataService.data[saunaId].presentedTemperature = val.temperature;
            if (this.#dataService.data[saunaId].temperaturePresentation === 10) {
                this.emit('temperature', saunaId, val.temperature);
            }
        }
        if (val.humidity && this.#dataService.data[saunaId].presentedHumidity !== val.humidity) {
            this.#dataService.data[saunaId].presentedHumidity = val.humidity;
            if (this.#dataService.data[saunaId].humidityPresentation === 10) {
                this.emit('humidity', saunaId, val.humidity);
            }
        }
    }

    handleControlBoardSupport(saunaId, val) {
        if (val.isLiteVariant) {
            this.#dataService.data[saunaId].isLiteVariant = val.isLiteVariant;
        }
    }
}
