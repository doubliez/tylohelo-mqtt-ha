export class ComService {
    #udpService;
    #protoBufService;
    #saunaService;
    #dataService;
    #messageHandlerService;
    #mqttService;
    #autoConnect = false;
    #keepAlives = {};
    #portToSaunaId = {};
    #initialDiscovery = {};

    constructor(
        udpService,
        protoBufService,
        saunaService,
        dataService,
        messageHandlerService,
        mqttService,
        autoConnect
    ) {
        this.#udpService = udpService;
        this.#protoBufService = protoBufService;
        this.#saunaService = saunaService;
        this.#dataService = dataService;
        this.#messageHandlerService = messageHandlerService;
        this.#mqttService = mqttService;
        this.#autoConnect = autoConnect;

        // TODO: support multiple ports for multiple saunas
        this.#udpService.startListen(51112);
        this.#udpService.on('packetReceivedEvent', pack => {
            this.onPacketReceived(pack);
        });
        // Broadcast listen to detect saunas
        this.#listenForSaunas();
        // Triggers for MQTT
        this.#listenForTriggers();
        // MQTT commands
        this.#listenForCommands();
        // MQTT states
        this.#listenForStateChanges();
    }

    #listenForSaunas() {
        this.#udpService.startListenBroadcast(54377);
        this.#udpService.on('packetReceivedBroadcastEvent', pack => {
            this.onPacketReceivedBroadcast(pack);
        });
    }

    #listenForTriggers() {
        this.#messageHandlerService.on('triggerMqttDiscovery', saunaId => {
            // Don't send before initial discovery has been sent after connect
            if (!this.#initialDiscovery[saunaId] || !this.#initialDiscovery[saunaId].sent) {
                return;
            }
            const sauna = this.#saunaService.getSauna(saunaId);
            if (sauna) {
                const data = this.#dataService.data[saunaId];
                this.#mqttService.publishDiscovery(sauna, data, false);
            }
        });
    }

    #listenForCommands() {
        this.#mqttService.on('setMode', (saunaId, mode) => {
            switch (mode) {
            case 'off':
                this.setSaunaState(saunaId, 10);
                break;
            case 'heat':
                this.setSaunaState(saunaId, 11);
                break;
            case 'auto': // standby
                this.setSaunaState(saunaId, 12);
                break;
            }
        });
        this.#mqttService.on('setTargetTemperature', (saunaId, targetTemperature) => {
            this.setTargetTemperature(saunaId, targetTemperature);
        });
        this.#mqttService.on('setTargetHumidity', (saunaId, targetHumidity) => {
            this.setTargetHumidity(saunaId, targetHumidity);
        });
        this.#mqttService.on('ackError', saunaId => {
            const message = this.#dataService.data[saunaId].userMessage;
            // ack only TYPE_OK (11) and TYPE_ERROR (13)
            // that are not answered yet (answer 20)
            if (message && [11, 13].includes(message.messageType) && message.answer === 20) {
                message.answer = 21; // OK
                this.setUserMessage(saunaId, message);
            }
        });
        this.#mqttService.on('setLight', (saunaId, light) => {
            this.setLighting(saunaId, light === 'ON');
        });
    }

    #listenForStateChanges() {
        this.#onMsg('saunaState', (sauna, state) => {
            switch (state) {
            case 10:
                this.#mqttService.publish(sauna, 'mode', 'off');
                this.#mqttService.publish(sauna, 'state', 'None');
                break;
            case 11:
                this.#mqttService.publish(sauna, 'mode', 'heat');
                this.#mqttService.publish(sauna, 'state', 'on');
                break;
            case 12:
                this.#mqttService.publish(sauna, 'mode', 'auto');
                this.#mqttService.publish(sauna, 'state', 'standby');
                break;
            case 13:
                this.#mqttService.publish(sauna, 'mode', 'off');
                this.#mqttService.publish(sauna, 'state', 'dryup');
                break;
            case 14:
                this.#mqttService.publish(sauna, 'mode', 'off');
                this.#mqttService.publish(sauna, 'state', 'cleanup');
                break;
            case 15:
                this.#mqttService.publish(sauna, 'mode', 'off');
                this.#mqttService.publish(sauna, 'state', 'descaling');
                break;
            }
        });
        this.#onMsg('targetTemperature', (sauna, temperature) => {
            this.#mqttService.publish(sauna, 'target-temperature', temperature);
        });
        this.#onMsg('targetHumidity', (sauna, humidity) => {
            this.#mqttService.publish(sauna, 'target-humidity', humidity);
        });
        this.#onMsg('temperature', (sauna, temperature) => {
            this.#mqttService.publish(sauna, 'temperature', temperature);
        });
        this.#onMsg('humidity', (sauna, humidity) => {
            this.#mqttService.publish(sauna, 'humidity', humidity);
        });
        this.#onMsg('door', (sauna, door) => {
            this.#mqttService.publish(sauna, 'door', door);
        });
        this.#onMsg('error', (sauna, error) => {
            this.#mqttService.publish(sauna, 'error', JSON.stringify(error));
            if (error.message && [19, 20].includes(error.message.identity)) {
                // 19 => Door open for too long
                // 20 => Door open
                this.#mqttService.publish(sauna, 'door', 'ON');
            }
            if (error.state === 'OFF') {
                // Assume door is closed, but there is no way to know...
                this.#mqttService.publish(sauna, 'door', 'OFF');
            }
        });
        this.#onMsg('light', (sauna, light) => {
            this.#mqttService.publish(sauna, 'light', light);
        });
        this.#onMsg('standbyOffsetTemperature', (sauna, temp) => {
            this.#mqttService.publish(sauna, 'standby-offset-temp', temp);
        });
        this.#onMsg('tankWaterTemperature', (sauna, temp) => {
            this.#mqttService.publish(sauna, 'tank-water-temp', temp);
        });
        this.#onMsg('tankStandbyTemperature', (sauna, temp) => {
            this.#mqttService.publish(sauna, 'tank-standby-temp', temp);
        });
        this.#onMsg('waterLevel', (sauna, waterLevel) => {
            switch (waterLevel) {
            case 10:
                this.#mqttService.publish(sauna, 'water-level', 'Low');
                break;
            case 11:
                this.#mqttService.publish(sauna, 'water-level', 'Mid');
                break;
            case 12:
                this.#mqttService.publish(sauna, 'water-level', 'High');
                break;
            case 13:
                this.#mqttService.publish(sauna, 'water-level', 'Unknown');
                break;
            }
        });
        this.#onMsg('bathTime', (sauna, bathTime) => {
            this.#mqttService.publish(sauna, 'bath-time', bathTime);
        });
        this.#onMsg('runTimeLeft', (sauna, runTimeLeft) => {
            this.#mqttService.publish(sauna, 'run-time-left', runTimeLeft);
        });
    }

    #onMsg(type, callback) {
        this.#messageHandlerService.on(type, (saunaId, ...args) => {
            const sauna = this.#saunaService.getSauna(saunaId);
            if (!sauna) {
                console.warn(`[MQTT state change] Sauna not found ${saunaId}!`);
                return;
            }
            callback(sauna, ...args);
        });
    }

    sendAnnouncementRequest() {
        const msg = this.#protoBufService.createAnnouncementRequestMsg();
        this.#udpService.sendPacketOnBroadcastSocket(msg, 54378);
    }

    setTargetTemperature(saunaId, newTemp) {
        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.createTargetTempMsg(newTemp);
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[setTargetTemperature] Not connected to sauna ${saunaId}!`);
        }
    }

    setFavorites(saunaId, newValues) {
        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.createFavoriteMsg(newValues);
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[setFavorites] Not connected to sauna ${saunaId}!`);
        }
    }

    startFavorite(saunaId, index) {
        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.startFavoriteMsg(index);
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[setFavorites] Not connected to sauna ${saunaId}!`);
        }
    }

    setAux(saunaId, newValues) {
        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.createAuxMsg(newValues);
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[setAux] Not connected to sauna ${saunaId}!`);
        }
    }

    setBathtime(saunaId, newValues) {
        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.createBathtimeMsg(newValues);
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[setBathtime] Not connected to sauna ${saunaId}!`);
        }
    }

    sendCharacterTableRequest(saunaId) {
        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.createRequestCharacterTableMsg();
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[sendCharacterTableRequest] Not connected to sauna ${saunaId}!`);
        }
    }

    sendHumidityTableRequest(saunaId) {
        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.createRequestHumidityTableMsg();
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[sendHumidityTableRequest] Not connected to sauna ${saunaId}!`);
        }
    }

    sendTemperatureTableRequest(saunaId) {
        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.createRequestTemperatureTableMsg();
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[sendTemperatureTableRequest] Not connected to sauna ${saunaId}!`);
        }
    }

    setTargetHumidity(saunaId, newHumidity) {
        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.createTargetHumidityMsg(newHumidity);
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[setTargetHumidity] Not connected to sauna ${saunaId}!`);
        }
    }

    setSaunaState(saunaId, newState) {
        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.createSaunaStateMsg(newState);
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[setSaunaState] Not connected to sauna ${saunaId}!`);
        }
    }

    setLighting(saunaId, newState) {
        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.createLightingMsg(newState);
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[setLighting] Not connected to sauna ${saunaId}!`);
        }
    }

    setUserMessage(saunaId, updatedMessage) {
        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.createUserMessageMsg(updatedMessage);
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[setUserMessage] Not connected to sauna ${saunaId}!`);
        }
    }

    saveCalendarItem(saunaId, calendarItem) {
        // Only date programs: Index 1..21:  Date programs.
        if (calendarItem.index < 1 || calendarItem.index > 21) {
            console.error(`[saveCalendarItem] Invalid calendarItem index ${calendarItem.index}!`);
            return;
        }

        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.createCalendarMsg(calendarItem);
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[saveCalendarItem] Not connected to sauna ${saunaId}!`);
        }
    }

    deleteCalendarItem(saunaId, calendarItem) {
        // Only date programs: Index 1..21:  Date programs.
        if (calendarItem.index < 1 || calendarItem.index > 21) {
            console.error(`[deleteCalendarItem] Invalid calendarItem index ${calendarItem.index}!`);
            return;
        }

        calendarItem.valid = false;

        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna && sauna.connected) {
            const msg = this.#protoBufService.createCalendarMsg(calendarItem);
            this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
        } else {
            console.warn(`[deleteCalendarItem] Not connected to sauna ${saunaId}!`);
        }
    }

    onPacketReceivedBroadcast(pack) {
        const announcementMsg = this.#protoBufService.decodeBroadcastMessage(pack.data);
        if (!announcementMsg.port) {
            console.error('No port in announcement message!');
            return;
        }
        const sauna = this.updateAvailableSaunas(announcementMsg, pack.fromIp);
        this.#mqttService.publish(sauna, 'available', true);

        if (!this.#autoConnect) {
            console.log(`Auto-Connect OFF - Not connecting to sauna ${sauna.systemId} (${sauna.systemName})`);
        }
        if (!sauna.connected && this.#autoConnect) {
            this.connect(sauna.systemId);
        }
    }

    connect(saunaId) {
        // TODO: support multiple saunas/different ports
        if (this.#portToSaunaId[51112] && this.#portToSaunaId[51112] !== saunaId) {
            throw new Error('Connect to multiple saunas not supported yet!');
        }
        this.#portToSaunaId[51112] = saunaId;
        this.stopKeepAlive(saunaId);
        this.#dataService.resetData(saunaId);

        const sauna = this.#saunaService.getSauna(saunaId);
        console.log(`Connecting to sauna ${sauna.systemId} (${sauna.systemName})...`);
        const conreq = this.#protoBufService.createConnectRequestMsg(sauna.pin);

        this.#udpService.sendPacket(conreq, sauna.ip, sauna.port);

        // MQTT discovery
        if (!this.#initialDiscovery[saunaId]) {
            this.#initialDiscovery[saunaId] = {};
        }
        clearTimeout(this.#initialDiscovery[saunaId].timeoutObj);
        this.#initialDiscovery[saunaId].sent = false;

        this.#initialDiscovery[saunaId].timeoutObj = setTimeout(() => {
            const sauna = this.#saunaService.getSauna(saunaId);
            if (sauna) {
                const data = this.#dataService.data[saunaId];
                this.#mqttService.publishDiscovery(sauna, data);
                this.#initialDiscovery[saunaId].sent = true;
            }
        }, 10000);
    }

    disconnect(saunaId, fromSauna = false) {
        const sauna = this.#saunaService.getSauna(saunaId);
        if (sauna) {
            this.stopKeepAlive(saunaId);
            if (fromSauna) {
                console.log(`Sauna ${sauna.systemId} (${sauna.systemName}) told us we are not connected...`);
            } else {
                console.log(`Disconnecting from sauna ${sauna.systemId} (${sauna.systemName})...`);
                const disconreq = this.#protoBufService.createDisconnectRequestMsg();
                this.#udpService.sendPacket(disconreq, sauna.ip, sauna.port);
            }

            this.#saunaService.updateSauna({
                systemId: saunaId,
                connected: false
            });
            this.#dataService.resetData(saunaId);

            this.#mqttService.publish(sauna, 'connected', false);
        }
    }

    updateAvailableSaunas(msg, ip) {
        return this.#saunaService.updateSauna({
            ip: ip,
            port: msg.port,
            brand: msg.brand,
            rcbProduct: msg.rcbProduct,
            systemName: String.fromCharCode.apply(null, msg.systemName),
            systemId: msg.systemId,
            lastMsgTime: new Date(),
            available: true,
            systemType: msg.systemType
        });
    }

    onPacketReceived(pack) {
        // TODO: handle multiple saunas/different ports
        const saunaId = this.#portToSaunaId[51112];
        if (!saunaId) {
            // Probably received from previous connection (after restart)
            // ignore
            console.warn('Received packet for unknown sauna, waiting for announcement...');
            return;
        }
        const msg = this.#protoBufService.decodeMessage(pack.data);

        if (msg.connectReply) {
            this.handleConnectReply(msg);
            return;
        }

        if (msg.noConnection) {
            this.disconnect(saunaId, true);
            return;
        }

        if (msg.keepAlive) {
            this.handleKeepAliveReply(saunaId);
            return;
        }
        this.#messageHandlerService.handle(saunaId, msg);
        return;
    }

    handleConnectReply(msg) {
        const sauna = this.#saunaService.getSauna(msg.connectReply.systemId);
        if (msg.connectReply.status === 10) {
            sauna.systemId = msg.connectReply.systemId;
            sauna.communicationTimeOut = msg.connectReply.communicationTimeOut;
            sauna.communicationLostTimeOut = msg.connectReply.communicationLostTimeOut;
            sauna.status = msg.connectReply.status;
            sauna.connected = true;
            sauna.applicationDescription = String.fromCharCode.apply(null, msg.connectReply.applicationDescription);
            sauna.applicationVersion = String.fromCharCode.apply(null, msg.connectReply.applicationVersion);
            sauna.systemType = msg.connectReply.systemType;

            this.#saunaService.updateSauna(sauna);

            this.startkeepAlive(sauna);

            // Request char table
            this.sendCharacterTableRequest(sauna.systemId);

            // Request temperature/humidity table
            this.sendHumidityTableRequest(sauna.systemId);
            this.sendTemperatureTableRequest(sauna.systemId);

            this.#mqttService.publish(sauna, 'connected', true);
        } else {
            console.error(`Connection to sauna ${sauna.systemId} failed with status ${msg.connectReply.status}!`);
        }
    }

    startkeepAlive(sauna) {
        if (!this.#keepAlives[sauna.systemId]) {
            this.#keepAlives[sauna.systemId] = {
                seqNumber: 0
            };
        }
        this.stopKeepAlive(sauna.systemId);

        const keepAliveInterval = sauna.communicationTimeOut / 2;
        console.log(`Sending KeepAlive to ${sauna.systemId} every ${keepAliveInterval}s`);

        this.#keepAlives[sauna.systemId].intervalObj = setInterval(() => {
            this.sendKeepAlive(sauna.systemId);
        }, keepAliveInterval * 1000);
    }

    stopKeepAlive(saunaId) {
        console.log(`Stop KeepAlive for ${saunaId}`);
        if (this.#keepAlives[saunaId]) {
            clearInterval(this.#keepAlives[saunaId].intervalObj);
            delete this.#keepAlives[saunaId].intervalObj;
        }
    }

    sendKeepAlive(saunaId) {
        const sauna = this.#saunaService.getSauna(saunaId);
        const msg = this.#protoBufService.createKeepAliveMsg(
            ++this.#keepAlives[saunaId].seqNumber
        );
        this.#udpService.sendPacket(msg, sauna.ip, sauna.port);
    }

    handleKeepAliveReply(saunaId) {
        const sauna = this.#saunaService.getSauna(saunaId);

        clearTimeout(this.#keepAlives[saunaId].timeoutObj);
        this.#keepAlives[saunaId].timeoutObj = setTimeout(() => {
            this.disconnect(saunaId);
        }, sauna.communicationLostTimeOut * 1000);
    }
}
