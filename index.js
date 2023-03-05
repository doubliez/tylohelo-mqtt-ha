import { CalendarService } from './services/calendarService.js';
import { ComService } from './services/comService.js';
import { DataService } from './services/dataService.js';
import { MessageHandlerService } from './services/messageHandlerService.js';
import { MqttService } from './services/mqttService.js';
import { ProtoBufService } from './services/protoBufService.js';
import { SaunaService } from './services/saunaService.js';
import { UdpService } from './services/udpService.js';

const MQTT_URL = process.env.MQTT_URL;

const udpService = new UdpService();
const protoBufService = new ProtoBufService();
const mqttService = new MqttService(MQTT_URL);
const saunaService = new SaunaService(mqttService);
const dataService = new DataService();
const calendarService = new CalendarService(dataService);
const messageHandlerService = new MessageHandlerService(dataService, calendarService);

new ComService(
    udpService,
    protoBufService,
    saunaService,
    dataService,
    messageHandlerService,
    mqttService,
    true
);
