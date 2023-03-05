import protobuf from 'protobufjs';

function toProtBufTime(date) {
    const ms = date.getTime() - Date.UTC(2000, 0, 1);
    return ms;
}

export class ProtoBufService {
    #root;

    constructor() {
        this.#root = protobuf.loadSync('external_interface/message.proto');
    }

    createConnectRequestMsg(pin) {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const ConnectRequest = this.#root.lookupType('tylohelo.Connect_request');
        const ExternalUnitFeatures = this.#root.lookupType('tylohelo.External_unit_features');
        const profileEnum = this.#root.lookupEnum('tylohelo.Connection_types.profile_t');

        const message = ExternalToSauna.create({
            connectRequest: ConnectRequest.create({
                profile: profileEnum.values.PROFILE_HOME_AUTOMATION_SYSTEM,
                pin,
                applicationDescription: Uint32Array.from('TylöHelo MQTT-HA bridge', c => c.charCodeAt(0)),
                externalUnitFeatures: ExternalUnitFeatures.create({
                    connectRejectDoorSwitch: true
                })
            })
        });

        console.log('[OUT] connectRequest');
        return ExternalToSauna.encode(message).finish();
    }

    createAnnouncementRequestMsg() {
        const AnnouncementRequest = this.#root.lookupType('tylohelo.Announcement_request');
        const profileEnum = this.#root.lookupEnum('tylohelo.Connection_types.profile_t');

        const message = AnnouncementRequest.create({
            profile: profileEnum.values.PROFILE_HOME_AUTOMATION_SYSTEM
        });

        console.log('[OUT] announcementRequest');
        return AnnouncementRequest.encode(message).finish();
    }

    createDisconnectRequestMsg() {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const DisconnectRequest = this.#root.lookupType('tylohelo.Disconnect_request');

        const message = ExternalToSauna.create({
            disconnectRequest: DisconnectRequest.create({})
        });

        console.log('[OUT] disconnectRequest');
        return ExternalToSauna.encode(message).finish();
    }

    createFavoriteMsg(newValues) {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const FavoritePost = this.#root.lookupType('tylohelo.Favorite_post');

        const message = ExternalToSauna.create({
            favorite: newValues.map(v => FavoritePost.create(v))
        });

        console.log('[OUT] favorite');
        return ExternalToSauna.encode(message).finish();
    }

    startFavoriteMsg(index) {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const IntegerValue = this.#root.lookupType('tylohelo.Integer_value_change_request');
        const valueEnum = this.#root.lookupEnum('tylohelo.Integer_value_change_request.value_t');

        const message = ExternalToSauna.create({
            integerValue: [
                IntegerValue.create({
                    valueType: valueEnum.values.START_FAVORITE,
                    value: index
                })
            ]
        });

        console.log('[OUT] startFavorite');
        return ExternalToSauna.encode(message).finish();
    }

    createAuxMsg(newValues) {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const AuxRelayPost = this.#root.lookupType('tylohelo.Aux_relay_post');

        const message = ExternalToSauna.create({
            auxRelay: newValues.map(v => AuxRelayPost.create(v))
        });

        console.log('[OUT] aux');
        return ExternalToSauna.encode(message).finish();
    }

    createTargetTempMsg(newTemp) {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const IntegerValue = this.#root.lookupType('tylohelo.Integer_value_change_request');
        const valueEnum = this.#root.lookupEnum('tylohelo.Integer_value_change_request.value_t');

        const message = ExternalToSauna.create({
            integerValue: [
                IntegerValue.create({
                    valueType: valueEnum.values.TARGET_TEMPERATURE,
                    value: newTemp
                })
            ]
        });

        console.log('[OUT] targetTemp');
        return ExternalToSauna.encode(message).finish();
    }

    createBathtimeMsg(newTime) {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const IntegerValue = this.#root.lookupType('tylohelo.Integer_value_change_request');
        const valueEnum = this.#root.lookupEnum('tylohelo.Integer_value_change_request.value_t');

        const message = ExternalToSauna.create({
            integerValue: [
                IntegerValue.create({
                    valueType: valueEnum.values.BATH_TIME,
                    value: newTime
                })
            ]
        });

        console.log('[OUT] bathTime');
        return ExternalToSauna.encode(message).finish();
    }


    createTargetHumidityMsg(newHumidity) {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const IntegerValue = this.#root.lookupType('tylohelo.Integer_value_change_request');
        const valueEnum = this.#root.lookupEnum('tylohelo.Integer_value_change_request.value_t');

        const message = ExternalToSauna.create({
            integerValue: [
                IntegerValue.create({
                    valueType: valueEnum.values.TARGET_HUMIDITY,
                    value: newHumidity
                })
            ]
        });

        console.log('[OUT] targetHumidity');
        return ExternalToSauna.encode(message).finish();
    }

    createRequestCharacterTableMsg() {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const GeneralCommand = this.#root.lookupType('tylohelo.General_command');
        const commandEnum = this.#root.lookupEnum('tylohelo.General_command.command_t');

        const message = ExternalToSauna.create({
            generalCommand: [
                GeneralCommand.create({
                    command: commandEnum.values.SEND_CHARACTER_TABLE
                })
            ]
        });

        console.log('[OUT] requestCharacterTable');
        return ExternalToSauna.encode(message).finish();
    }

    createRequestHumidityTableMsg() {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const GeneralCommand = this.#root.lookupType('tylohelo.General_command');
        const commandEnum = this.#root.lookupEnum('tylohelo.General_command.command_t');

        const message = ExternalToSauna.create({
            generalCommand: [
                GeneralCommand.create({
                    command: commandEnum.values.SEND_MAX_HUMIDITY_TABLE
                })
            ]
        });

        console.log('[OUT] requestHumidityTable');
        return ExternalToSauna.encode(message).finish();
    }

    createUserMessageMsg(updatedMessage) {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');

        const message = ExternalToSauna.create({
            userMessage: updatedMessage
        });

        console.log('[OUT] userMessage');
        return ExternalToSauna.encode(message).finish();
    }

    createRequestTemperatureTableMsg() {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const GeneralCommand = this.#root.lookupType('tylohelo.General_command');
        const commandEnum = this.#root.lookupEnum('tylohelo.General_command.command_t');

        const message = ExternalToSauna.create({
            generalCommand: [
                GeneralCommand.create({
                    command: commandEnum.values.SEND_MAX_TEMPERATURE_TABLE
                })
            ]
        });

        console.log('[OUT] requestTemperatureTable');
        return ExternalToSauna.encode(message).finish();
    }

    createSaunaStateMsg(newState) {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const SaunaState = this.#root.lookupType('tylohelo.Sauna_state_change_request');

        const message = ExternalToSauna.create({
            saunaState: SaunaState.create({
                state: newState
            })
        });

        console.log('[OUT] saunaState');
        return ExternalToSauna.encode(message).finish();
    }

    createLightingMsg(newState) {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const BooleanValue = this.#root.lookupType('tylohelo.Boolean_value_change_request');
        const valueEnum = this.#root.lookupEnum('tylohelo.Boolean_value_change_request.value_t');

        const message = ExternalToSauna.create({
            booleanValue: [
                BooleanValue.create({
                    valueType: valueEnum.values.LIGHTING,
                    value: newState ? 1 : 0
                })
            ]
        });

        console.log('[OUT] lighting');
        return ExternalToSauna.encode(message).finish();
    }

    createCalendarMsg(calendarItem) {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const CalendarProgram = this.#root.lookupType('tylohelo.Calendar_post');
        const startModeEnum = this.#root.lookupEnum('tylohelo.Calendar_post.start_mode_t');

        const message = ExternalToSauna.create({
            calendarProgram: [
                CalendarProgram.create({
                    index: calendarItem.index,
                    valid: calendarItem.valid,
                    activationTime: toProtBufTime(calendarItem.activationTime),
                    bathTime: calendarItem.bathTime,
                    humiditySetPoint: calendarItem.humiditySetPoint,
                    temperatureSetPoint: calendarItem.temperatureSetPoint,
                    weekday: false,
                    startMode: startModeEnum.values.START_MODE_READY_AT,
                    standby: calendarItem.standby,
                    favorite: calendarItem.favorite || 100
                })
            ]
        });

        console.log('[OUT] calendar');
        return ExternalToSauna.encode(message).finish();
    }

    decodeMessage(data) {
        const SaunaToExternal = this.#root.lookupType('tylohelo.Sauna_to_external');
        const message = SaunaToExternal.toObject(SaunaToExternal.decode(data));
        if (message.keepAlive) {
            console.log('[IN] keepAlive');
        } else {
            console.log('[IN]', Object.keys(message).join(','));
        }
        return message;
    }

    decodeBroadcastMessage(data) {
        const Announcement = this.#root.lookupType('tylohelo.Announcement');
        const message = Announcement.toObject(Announcement.decode(data));
        console.log('[ANNOUNCEMENT]', Object.keys(message).join(','));
        return message;
    }

    createKeepAliveMsg(keepAliveSeqNumber) {
        const ExternalToSauna = this.#root.lookupType('tylohelo.External_to_sauna');
        const KeepAlive = this.#root.lookupType('tylohelo.Keep_alive');

        const message = ExternalToSauna.create({
            keepAlive: KeepAlive.create({
                sequenceNumber: keepAliveSeqNumber
            })
        });

        console.log('[OUT] keepAlive');
        return ExternalToSauna.encode(message).finish();
    }
}
