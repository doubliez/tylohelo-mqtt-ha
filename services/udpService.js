import { EventEmitter } from 'node:events';
import dgram from 'node:dgram';

export class UdpService extends EventEmitter {
    #server;
    #broadcastServer;

    startListen(port, callback) {
        if (this.#server) {
            this.#server.close(() => {
                console.log('UDP server closed (startListen)');
                this.#server = undefined;
                this.openPort(port, callback);
            });
        } else {
            this.openPort(port, callback);
        }
    }

    startListenBroadcast(port, callback) {
        if (this.#broadcastServer) {
            this.#broadcastServer.close(() => {
                console.log('UDP broadcast server closed (startListenBroadcast)');
                this.#broadcastServer = undefined;
                this.openPortBroadcast(port, callback);
            });
        } else {
            this.openPortBroadcast(port, callback);
        }
    }

    openPort(port, callback) {
        this.#server = dgram.createSocket('udp4');
        this.#server.on('error', err => {
            console.error('UDP server error:', err);
            this.#server.close();
            this.#server = undefined;
        });
        this.#server.on('message', (msg, rinfo) => {
            this.#onReceive(msg, rinfo, 'server');
        });
        this.#server.on('listening', () => {
            const address = this.#server.address();
            console.log(`UDP server listening on ${address.address}:${address.port}`);
        });
        this.#server.bind(port, callback);
    }

    openPortBroadcast(port, callback) {
        this.#broadcastServer = dgram.createSocket('udp4');
        this.#broadcastServer.on('error', err => {
            console.error('UDP broadcast server error:', err);
            this.#broadcastServer.close();
            this.#broadcastServer = undefined;
        });
        this.#broadcastServer.on('message', (msg, rinfo) => {
            this.#onReceive(msg, rinfo, 'broadcastServer');
        });
        this.#broadcastServer.on('listening', () => {
            const address = this.#broadcastServer.address();
            console.log(`UDP broadcast server listening on ${address.address}:${address.port}`);
        });
        this.#broadcastServer.bind(port, () => {
            this.#broadcastServer.setBroadcast(true);
            callback && callback();
        });
    }

    close() {
        this.stopListen();
        this.stopListenBroadcast();
    }

    stopListen() {
        if (this.#server) {
            this.#server.close(() => {
                console.log('UDP server closed');
                this.#server = undefined;
            });
        }
    }

    stopListenBroadcast() {
        if (this.#broadcastServer) {
            this.#broadcastServer.close(() => {
                console.log('UDP broadcast server closed');
                this.#broadcastServer = undefined;
            });
        }
    }

    sendPacket(data, ip, port) {
        this.#server.send(data, port, ip, err => {
            if (err) {
                console.error('UDP send error:', err);
            }
        });
    }

    sendPacketOnBroadcastSocket(data, port) {
        this.#broadcastServer.send(data, port, '255.255.255.255', err => {
            if (err) {
                console.error('UDP broadcast send error:', err);
            }
        });
    }

    #onReceive(msg, rinfo, type) {
        const pack = {
            fromIp: rinfo.address,
            fromPort: rinfo.port,
            data: msg
        };
        if (type === 'server') {
            this.emit('packetReceivedEvent', pack);
        } else if (type === 'broadcastServer') {
            this.emit('packetReceivedBroadcastEvent', pack);
        }
    }
}
