import * as mqtt from 'mqtt';
import slugify from 'slugify';
import { EventEmitter } from 'node:events';

export class MqttService extends EventEmitter {
    #client;
    #topicPrefix = 'tylohelo-mqtt-ha/';

    constructor(url) {
        super();
        this.#client = mqtt.connect(url, {
            will: {
                topic: `${this.#topicPrefix}available`,
                payload: 'false'
            }
        });

        this.#client.on('connect', () => {
            this.#initSubscriptions();
            this.#client.publish(`${this.#topicPrefix}available`, 'true', { retain: true });
        });

        this.#client.on('message', (topic, message) => {
            this.#onMessage(topic, message);
        });
    }

    publish(sauna, partialTopic, message, options) {
        const bn = slugify(sauna.brandName, { lower: true });
        const tn = slugify(sauna.typeName, { lower: true });
        const id = sauna.systemId;

        const topic = `${this.#topicPrefix}${bn}-${tn}/${id}/${partialTopic}`;

        this.#client.publish(topic, `${message}`, options);
    }

    publishDiscovery(sauna, data, startup = true) {
        const bn = slugify(sauna.brandName, { lower: true });
        const tn = slugify(sauna.typeName, { lower: true });
        const id = sauna.systemId;

        const topicPrefix = `${this.#topicPrefix}${bn}-${tn}/${id}/`;

        const device = {
            manufacturer: sauna.brandName,
            model: sauna.typeName,
            identifiers: [
                bn,
                `${bn}-${tn}`
            ],
            name: sauna.brandName + ' ' + sauna.typeName,
            sw_version: sauna.applicationVersion
        };

        const availability = [
            {
                topic: `${this.#topicPrefix}available`,
                payload_available: 'true',
                payload_not_available: 'false'
            },
            {
                topic: `${topicPrefix}available`,
                payload_available: 'true',
                payload_not_available: 'false'
            },
            {
                topic: `${topicPrefix}connected`,
                payload_available: 'true',
                payload_not_available: 'false'
            }
        ];

        const climate = {
            unique_id: slugify(`${bn}-${tn}-${id}`),
            name: sauna.systemName,
            device,
            icon: 'mdi:radiator',
            availability,
            availability_mode: 'all',
            modes: [
                'off',
                'heat',
                'auto' // standby
            ],
            mode_state_topic: `${topicPrefix}mode`,
            mode_command_topic: `${topicPrefix}mode/set`,
            preset_modes: [
                'on',
                'standby',
                'dryup',
                'cleanup',
                'descaling'
            ],
            preset_mode_state_topic: `${topicPrefix}state`,
            // preset_mode_command_topic is required but we don't use it
            // preset_modes are just used to show the actual sauna state
            preset_mode_command_topic: `${topicPrefix}state/set`,
            temperature_unit: data.temperatureUnit === 11 ? 'F' : 'C',
            current_temperature_topic: `${topicPrefix}temperature`,
            current_temperature_template: data.temperatureUnit === 11 ?
                '{{ value | float / 5 + 32 }}' :
                '{{ value | float / 9 }}',
            temperature_state_topic: `${topicPrefix}target-temperature`,
            temperature_state_template: data.temperatureUnit === 11 ?
                '{{ value | float / 5 + 32 }}' :
                '{{ value | float / 9 }}',
            temperature_command_topic: `${topicPrefix}target-temperature/set`,
            temperature_command_template: data.temperatureUnit === 11 ?
                '{{ (value | float - 32) * 5 | round(0) }}' :
                '{{ value | float * 9 | round(0) }}',
            current_humidity_topic: `${topicPrefix}humidity`,
            target_humidity_state_topic: `${topicPrefix}target-humidity`,
            target_humidity_command_topic: `${topicPrefix}target-humidity/set`,
            initial: data.temperatureUnit === 11 ? 194 : 90,
            min_temp: data.temperatureUnit === 11 ?
                data.lowerLimitTemperature / 5 + 32 :
                data.lowerLimitTemperature / 9,
            max_temp: data.temperatureUnit === 11 ?
                data.upperLimitTemperature / 5 + 32 :
                data.upperLimitTemperature / 9,
            min_humidity: 0,
            max_humidity: data.maxHumidityTable[data.targetTemperature / 9]
        };

        this.#client.publish(`homeassistant/climate/${climate.unique_id}/config`, JSON.stringify(climate), { retain: true });

        if (!startup) {
            // Only climate needs to be updated based on current data
            // Other discovery messages are only sent on startup
            return;
        }

        const binarySensors = [
            {
                unique_id: slugify(`${bn}-${tn}-${id}-door`),
                name: sauna.systemName + ' Door',
                device,
                device_class: 'door',
                availability,
                availability_mode: 'all',
                state_topic: `${topicPrefix}door`
            },
            {
                unique_id: slugify(`${bn}-${tn}-${id}-error`),
                name: sauna.systemName + ' Error',
                device,
                device_class: 'problem',
                availability,
                availability_mode: 'all',
                state_topic: `${topicPrefix}error`,
                value_template: '{{ value_json.state }}',
                json_attributes_topic: `${topicPrefix}error`,
                json_attributes_template: '{{ value_json.message | tojson }}'
            }
        ];

        for (const bs of binarySensors) {
            this.#client.publish(`homeassistant/binary_sensor/${bs.unique_id}/config`, JSON.stringify(bs), { retain: true });
        }

        const buttons = [
            {
                unique_id: slugify(`${bn}-${tn}-${id}-error-ack`),
                name: sauna.systemName + ' Error Ack',
                device,
                availability,
                availability_mode: 'all',
                command_topic: `${topicPrefix}error/ack`
            }
        ];

        for (const b of buttons) {
            this.#client.publish(`homeassistant/button/${b.unique_id}/config`, JSON.stringify(b), { retain: true });
        }

        const light = {
            unique_id: slugify(`${bn}-${tn}-${id}-light`),
            name: sauna.systemName + ' Light',
            device,
            availability,
            availability_mode: 'all',
            state_topic: `${topicPrefix}light`,
            command_topic: `${topicPrefix}light/set`
        };

        this.#client.publish(`homeassistant/light/${light.unique_id}/config`, JSON.stringify(light), { retain: true });

        const sensors = [
            {
                unique_id: slugify(`${bn}-${tn}-${id}-temperature`),
                name: sauna.systemName + ' Temperature',
                device,
                device_class: 'temperature',
                unit_of_measurement: '°C',
                availability,
                availability_mode: 'all',
                state_topic: `${topicPrefix}temperature`,
                value_template: '{{ value | float / 9 }}'
            },
            {
                unique_id: slugify(`${bn}-${tn}-${id}-humidity`),
                name: sauna.systemName + ' Humidity',
                device,
                device_class: 'humidity',
                unit_of_measurement: '%',
                availability,
                availability_mode: 'all',
                state_topic: `${topicPrefix}humidity`
            },
            {
                unique_id: slugify(`${bn}-${tn}-${id}-standby-offset-temp`),
                name: sauna.systemName + ' Standby Offset Temp',
                device,
                device_class: 'temperature',
                unit_of_measurement: '°C',
                availability,
                availability_mode: 'all',
                state_topic: `${topicPrefix}standby-offset-temp`,
                value_template: '{{ value | float / 9 }}'
            },
            {
                unique_id: slugify(`${bn}-${tn}-${id}-tank-water-temp`),
                name: sauna.systemName + ' Tank Water Temp',
                device,
                device_class: 'temperature',
                unit_of_measurement: '°C',
                availability,
                availability_mode: 'all',
                state_topic: `${topicPrefix}tank-water-temp`,
                value_template: '{{ value | float / 9 }}'
            },
            {
                unique_id: slugify(`${bn}-${tn}-${id}-tank-standby-temp`),
                name: sauna.systemName + ' Tank Standby Temp',
                device,
                device_class: 'temperature',
                unit_of_measurement: '°C',
                availability,
                availability_mode: 'all',
                state_topic: `${topicPrefix}tank-standby-temp`,
                value_template: '{{ value | float / 9 }}'
            },
            {
                unique_id: slugify(`${bn}-${tn}-${id}-water-level`),
                name: sauna.systemName + ' Water Level',
                device,
                device_class: 'enum',
                availability,
                availability_mode: 'all',
                state_topic: `${topicPrefix}water-level`
            },
            {
                unique_id: slugify(`${bn}-${tn}-${id}-bath-time`),
                name: sauna.systemName + ' Bath Time',
                device,
                availability,
                availability_mode: 'all',
                state_topic: `${topicPrefix}bath-time`,
                unit_of_measurement: 'min'
            },
            {
                unique_id: slugify(`${bn}-${tn}-${id}-run-time-left`),
                name: sauna.systemName + ' Run Time Left',
                device,
                availability,
                availability_mode: 'all',
                state_topic: `${topicPrefix}run-time-left`,
                unit_of_measurement: 'min'
            }
        ];

        for (const s of sensors) {
            this.#client.publish(`homeassistant/sensor/${s.unique_id}/config`, JSON.stringify(s), { retain: true });
        }
    }

    #initSubscriptions() {
        // subscribe command topics
        this.#client.subscribe(`${this.#topicPrefix}+/+/mode/set`);
        this.#client.subscribe(`${this.#topicPrefix}+/+/target-temperature/set`);
        this.#client.subscribe(`${this.#topicPrefix}+/+/target-humidity/set`);
        this.#client.subscribe(`${this.#topicPrefix}+/+/error/ack`);
        this.#client.subscribe(`${this.#topicPrefix}+/+/light/set`);
    }

    #onMessage(topic, message) {
        message = message.toString();
        const match = topic.match(/\/({[a-z0-9-]+})\//i);
        if (!match) {
            console.warn(`Sauna ID not found in MQTT topic [${topic}] - ignoring`);
            return;
        }

        const saunaId = match[1];

        if (topic.endsWith('/mode/set')) {
            this.emit('setMode', saunaId, message);
        } else if (topic.endsWith('/target-temperature/set')) {
            this.emit('setTargetTemperature', saunaId, message);
        } else if (topic.endsWith('/target-humidity/set')) {
            this.emit('setTargetHumidity', saunaId, message);
        } else if (topic.endsWith('/error/ack')) {
            this.emit('ackError', saunaId, message);
        } else if (topic.endsWith('/light/set')) {
            this.emit('setLight', saunaId, message);
        }
    }
}
