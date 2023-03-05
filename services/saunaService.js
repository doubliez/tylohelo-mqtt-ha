export class SaunaService {
    #saunas = {};

    constructor() {
        setInterval(() => {
            this.timedUpdate();
        }, 3000);
    }

    timedUpdate() {
        for (const saunaId in this.#saunas) {
            const sauna = this.#saunas[saunaId];
            if (!sauna.lastMsgTime) {
                sauna.available = false;
            } else {
                const timeDiff = Math.abs(new Date().getTime() - sauna.lastMsgTime.getTime());
                const diffSec = Math.ceil(timeDiff / 1000);
                if (sauna.available && diffSec > 20) {
                    sauna.available = false;
                }
            }
        }
    }

    getSauna(id) {
        return this.#saunas[id];
    }

    getSaunas() {
        return this.#saunas;
    }

    updateSauna(saunaData) {
        if (!this.#saunas[saunaData.systemId]) {
            this.#saunas[saunaData.systemId] = {};
        }
        Object.assign(this.#saunas[saunaData.systemId], saunaData);

        if (!this.#saunas[saunaData.systemId].systemType) {
            this.#saunas[saunaData.systemId].systemType = 20;
        }
        if (this.#saunas[saunaData.systemId].rcbProduct === 30 || this.#saunas[saunaData.systemId].systemType === 22) {
            this.#saunas[saunaData.systemId].showHumidity = true;
        }
        if (!this.#saunas[saunaData.systemId].pin) {
            this.#saunas[saunaData.systemId].pin = '0000';
        }

        //BRAND_TYLO = 40;
        //BRAND_HELO = 41;
        //BRAND_FINNLEO = 42;
        //BRAND_AMEREC = 43;
        switch (this.#saunas[saunaData.systemId].brand) {
        case 40:
            this.#saunas[saunaData.systemId].brandName = 'Tylö';
            break;
        case 41:
            this.#saunas[saunaData.systemId].brandName = 'Helo';
            break;
        case 42:
            this.#saunas[saunaData.systemId].brandName = 'Finnlea';
            break;
        case 43:
            this.#saunas[saunaData.systemId].brandName = 'Amerec';
            break;
        default:
            this.#saunas[saunaData.systemId].brandName = 'Unknown';
            break;
        }

        //RCB_COMBI_MANUAL = 30;
        //RCB_COMBI_AUTO = 31;
        //RCB_STEAM_PRIVATE = 32;
        //RCB_STEAM_PRIVATE_AUTO = 33;
        //RCB_STEAM_PUBLIC = 34;
        //RCB_STEAM_USA = 35;
        //RCB_BOX_ADDON = 36;
        //RCB_SAUNA = 37;
        //RCB_SAUNA_LOW = 38;  // Provided for future extension of control board low functionality.
        //RCB_SAUNA_IR = 39;
        //RCB_OTHER = 40;  // Control product board type could not be determined.
        switch (this.#saunas[saunaData.systemId].rcbProduct) {
        case 30:
            this.#saunas[saunaData.systemId].typeName = 'Combi manual';
            break;
        case 31:
            this.#saunas[saunaData.systemId].typeName = 'Combi auto';
            break;
        case 32:
            this.#saunas[saunaData.systemId].typeName = 'Steam private';
            break;
        case 33:
            this.#saunas[saunaData.systemId].typeName = 'Steam private auto';
            break;
        case 34:
            this.#saunas[saunaData.systemId].typeName = 'Steam public';
            break;
        case 35:
            this.#saunas[saunaData.systemId].typeName = 'Steam public/private Manual Empty';
            break;
        case 36:
            this.#saunas[saunaData.systemId].typeName = 'Sauna box addon';
            break;
        case 37:
            this.#saunas[saunaData.systemId].typeName = 'Sauna';
            break;
        case 38:
            this.#saunas[saunaData.systemId].typeName = 'Sauna low';
            break;
        case 39:
            this.#saunas[saunaData.systemId].typeName = 'Sauna IR';
            break;
        case 40:
        default:
            this.#saunas[saunaData.systemId].typeName = 'Unknown';
            break;
        }

        switch (this.#saunas[saunaData.systemId].systemType) {
        case 21:
            this.#saunas[saunaData.systemId].typeName = 'Multisteam';
            break;
        case 22:
            this.#saunas[saunaData.systemId].typeName = 'Tylarium';
            break;
        default:
            break;
        }

        return this.#saunas[saunaData.systemId];
    }

    removeSauna(id) {
        delete this.#saunas[id];
    }
}
