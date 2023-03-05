export class CalendarService {
    #preferredBathTime = 180;
    #calendarListBySauna = {};
    #currentCalItemBySauna = {};
    #dataService;

    constructor(dataService) {
        this.#dataService = dataService;
    }

    getCalendarList(saunaId) {
        if (!this.#calendarListBySauna[saunaId]) {
            this.#calendarListBySauna[saunaId] = [];
        }
        return this.#calendarListBySauna[saunaId];
    }

    getCalendarItem(saunaId, index) {
        if (!this.#calendarListBySauna[saunaId]) {
            this.#calendarListBySauna[saunaId] = [];
        }
        return this.#calendarListBySauna[saunaId][index];
    }

    getCalendarList24H(saunaId) {
        if (!this.#calendarListBySauna[saunaId]) {
            this.#calendarListBySauna[saunaId] = [];
        }
        this.#calendarListBySauna[saunaId].forEach(item => {
            item.realEndTime = item.endTime;
            if (item.favorite) {
                item.favoriteItem = this.#dataService.data[saunaId].favourites.find(fav =>
                    fav.index === item.favorite
                );

                item.favoriteName = String.fromCharCode(null, item.favoriteItem.name);

                item.realEndTime = new Date(item.activationTime.getTime() + item.favoriteItem.bathTime * 60 * 1000);
            }
        });

        const list = this.#calendarListBySauna[saunaId].filter(item => {
            if (!item.valid) {
                return false;
            }
            if (item.index < 1 || item.index > 21) {
                return false;
            }
            const now = new Date(this.#dataService.data[saunaId].saunaTime.getTime());
            const nowPlus24 = new Date(this.#dataService.data[saunaId].saunaTime.getTime());
            nowPlus24.setDate(nowPlus24.getDate() + 1);

            if (item.activationTime > now && item.activationTime < nowPlus24) {
                return true;
            }

            if (item.realEndTime > now && item.realEndTime < nowPlus24) {
                return true;
            }

            if (item.endTime < now && item.activationTime > nowPlus24) {
                return true;
            }

            return false;
        });

        return list.sort((a, b) => {
            if (a.activationTime < b.activationTime)
                return -1;
            else if (a.activationTime > b.activationTime)
                return 1;
            else
                return 0;
        });
    }

    getPreferredGap(saunaId) {
        const availableGaps = this.findTimeGaps24H(saunaId);
        if (availableGaps.length < 1) {
            return null;
        }

        let selectedGap = availableGaps.findLast(gap =>
            gap.bathTime >= this.#preferredBathTime
        );

        if (!selectedGap) {
            const sortedBybathTime = availableGaps.sort((a, b) => {
                if (a.bathTime < b.bathTime)
                    return -1;
                else if (a.bathTime > b.bathTime)
                    return 1;
                else
                    return 0;
            });

            selectedGap = sortedBybathTime.at(-1);
        }

        if (selectedGap.bathTime === 1440) {
            // Set noon gap
            const now = new Date(this.#dataService.data[saunaId].saunaTime.getTime());
            const noon = new Date(this.#dataService.data[saunaId].saunaTime.getTime());
            noon.setHours(12);
            noon.setMinutes (0);
            noon.setSeconds(0);

            if (now > noon) {
                noon.setDate(noon.getDate() + 1);
            }

            selectedGap.start = noon;
            selectedGap.end = new Date(noon.getTime() + this.#preferredBathTime * 60 * 1000);
            selectedGap.bathTime = this.#preferredBathTime;
        }

        if (selectedGap.bathTime > this.#preferredBathTime) {
            selectedGap.bathTime = this.#preferredBathTime;
        }
        if (selectedGap) {
            selectedGap.bathTime = Math.floor(selectedGap.bathTime);
        }

        return selectedGap;
    }

    verifyCalendarTime(saunaId, calendarItem) {
        const availableGaps = this.findTimeGaps24H(saunaId);

        let valid = false;
        availableGaps.forEach(gap => {
            if (gap.start.getTime() <= calendarItem.activationTime.getTime() && gap.end.getTime() >= calendarItem.endtime.getTime()) {
                valid = true;
            }
        });
        return valid;
    }

    findTimeGaps24H(saunaId) {
        const list = this.getCalendarList24H(saunaId);
        const now = new Date(this.#dataService.data[saunaId].saunaTime.getTime());
        const nowPlus24 = new Date(this.#dataService.data[saunaId].saunaTime.getTime());
        nowPlus24.setDate(nowPlus24.getDate() + 1);
        const gap = { start: now, end: nowPlus24 };
        let gaps = [];
        gaps.push(gap);

        list.forEach(calItem => {
            gaps = this.splitGaps(gaps, calItem);
        });

        // Set bathTime for gaps
        gaps.forEach(gap => {
            gap.bathTime = (gap.end.getTime() - gap.start.getTime()) / (60 * 1000);
        });
        return gaps;
    }

    splitGaps(gaps, calItem) {
        // Check if gaps if Affected by calendar item

        // Remove gaps coverred by calendar item
        gaps = gaps.filter(gap =>
            !(gap.start.getTime() >= calItem.activationTime.getTime() && gap.end.getTime() <= calItem.endTime.getTime())
        );

        let newGap = null;
        gaps.forEach(gap => {

            // Gap starts after endtime or end before starttime
            if (gap.start.getTime() >= calItem.endTime.getTime() || gap.end.getTime() <= calItem.activationTime.getTime()) {
                return; // not affected
            } else if (gap.start.getTime() <= calItem.activationTime.getTime() && gap.end.getTime() >= calItem.endTime.getTime()) {
                // Gap starts before starttime and ends after endtime
                // Split gap
                newGap = { start: new Date(calItem.endTime.getTime()) , end: gap.end };
                gap.end = calItem.activationTime;

            } else if (gap.start.getTime() <= calItem.activationTime.getTime() && gap.end.getTime() <= calItem.endTime.getTime()) {
                // Gap starts before starttime and ends before endtime
                // Cut end of gap
                gap.end = new Date(calItem.activationTime.getTime());

            } else if (gap.start.getTime() >= calItem.activationTime.getTime() && gap.end.getTime() >= calItem.endTime.getTime()) {
                // Gap starts after starttime and ends after endtime
                // Cut start of gap
                gap.start = new Date(calItem.endTime.getTime());
            }

        });

        if (newGap) {
            gaps.push(newGap);
        }
        return gaps;
    }

    updateCalendarItem(saunaId, calendarItem) {
        if (!this.#calendarListBySauna[saunaId]) {
            this.#calendarListBySauna[saunaId] = [];
        }
        this.#calendarListBySauna[saunaId][calendarItem.index] = calendarItem;
    }

    getNewCalenderItem(saunaId) {
        const index = this.getFirstFreeIndex(saunaId);
        if (!index) {
            return null;
        }

        const gap = this.getPreferredGap(saunaId);
        if (!gap) {
            return null;
        }

        const calItem = {};
        calItem.activationTime = gap.start;
        calItem.endTime = gap.end;
        calItem.bathTime = gap.bathTime;
        calItem.index = index;
        calItem.standby = false;
        calItem.startMode = 2;
        calItem.humiditySetPoint = this.#dataService.data[saunaId].targetHumidity;
        calItem.temperatureSetPoint = this.#dataService.data[saunaId].targetTemperature;
        calItem.valid = true;
        calItem.favorite = null;

        if (gap.bathTime > this.#preferredBathTime) {
            // Move time to middle of gap
            const diffMs = (gap.bathTime - this.#preferredBathTime)*60*1000;
            calItem.activationTime = new Date(calItem.activationTime.getTime() + diffMs);
            calItem.endTime = new Date(calItem.endTime.getTime() + diffMs);
        }

        return calItem;
    }

    getFirstFreeIndex(saunaId) {
        if (!this.#calendarListBySauna[saunaId]) {
            this.#calendarListBySauna[saunaId] = [];
        }
        if (this.#calendarListBySauna[saunaId].length < 22) {
            return null;
        }
        for (let i = 1; i < 22; i++) {
            if (!this.valid(saunaId, this.#calendarListBySauna[saunaId][i])) {
                return i;
            }
        }
        return null;
    }

    valid(saunaId, item) {
        if (!item.valid) {
            return false;
        }
        const now = new Date(this.#dataService.data[saunaId].saunaTime);

        if (item.endTime.getTime() < now.getTime()) {
            return false;
        }

        return true;
    }

    getCurrentCalItem(saunaId, id) {
        if (this.#currentCalItemBySauna[saunaId]) {
            return this.#currentCalItemBySauna[saunaId];
        }

        if (id) {
            const cal = this.getCalendarItem(saunaId, id);
            this.#currentCalItemBySauna[saunaId] = JSON.parse(JSON.stringify(cal));
            this.#currentCalItemBySauna[saunaId].activationTime = new Date(this.#currentCalItemBySauna[saunaId].activationTime);
            this.#currentCalItemBySauna[saunaId].endTime = new Date(this.#currentCalItemBySauna[saunaId].endTime);
            return this.#currentCalItemBySauna[saunaId];
        }

        this.#currentCalItemBySauna[saunaId] = this.getNewCalenderItem(saunaId);
        this.#currentCalItemBySauna[saunaId].thingsHaveChanged = true;
        return this.#currentCalItemBySauna[saunaId];
    }

    clearCurrentCalItem(saunaId) {
        delete this.#currentCalItemBySauna[saunaId];
    }
}
