import { CalendarService } from './services/calendarService.js';
import { ComService } from './services/comService.js';
import { DataService } from './services/dataService.js';
import { MessageHandlerService } from './services/messageHandlerService.js';
import { MqttService } from './services/mqttService.js';
import { ProtoBufService } from './services/protoBufService.js';
import { SaunaService } from './services/saunaService.js';
import { UdpService } from './services/udpService.js';

const MQTT_URL = 'mqtt://iot:IoT-MQTT!@192.168.10.140';

const udpService = new UdpService();
const protoBufService = new ProtoBufService();
const saunaService = new SaunaService();
const dataService = new DataService();
const calendarService = new CalendarService(dataService);
const messageHandlerService = new MessageHandlerService(dataService, calendarService);
const mqttService = new MqttService(MQTT_URL);

new ComService(
    udpService,
    protoBufService,
    saunaService,
    dataService,
    messageHandlerService,
    mqttService,
    true
);
