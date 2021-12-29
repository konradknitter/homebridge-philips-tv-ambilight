import {
    AccessoryConfig,
    AccessoryPlugin,
    API,
    CharacteristicGetCallback,
    CharacteristicSetCallback,
    CharacteristicValue,
    HAP,
    Logging,
    Service,
} from 'homebridge';

import request from 'request';
import wol from 'wake_on_lan';

let hap: HAP;

export = (api: API) => {
    hap = api.hap;
    api.registerAccessory('PhilipsTVAmbilight', PhilipsTVAmbilightAccessory);
};


class PhilipsTVAmbilightAccessory implements AccessoryPlugin {
    private readonly log: Logging;
    private readonly name: string;
    private readonly config: AccessoryConfig;
    private readonly service: Service;

    private brightness = 0;
    private hue = 0;
    private saturation = 0;

    constructor(log: Logging, config: AccessoryConfig, api: API) {
        this.log = log;
        this.name = config.name;
        this.config = config;

        // create a new Lightbulb service
        this.service = new hap.Service.Lightbulb(this.name, this.name);

        // create handlers for required characteristics
        this.service.getCharacteristic(api.hap.Characteristic.On)
            .on('get', this.handleOnGet.bind(this))
            .on('set', this.handleOnSet.bind(this));

        this.service.getCharacteristic(api.hap.Characteristic.Brightness)
            .on('get', this.fetchBrightness.bind(this))
            .on('set', this.setBrightness.bind(this));

        this.service.getCharacteristic(api.hap.Characteristic.Saturation)
            .on('get', this.fetchSaturation.bind(this))
            .on('set', this.setSaturation.bind(this));
    
        this.service.getCharacteristic(api.hap.Characteristic.Hue)
            .on('get', this.fetchHue.bind(this))
            .on('set', this.setHue.bind(this));
    }

    identify(): void {
        this.log('Identify!');
    }

    getServices(): Service[] {
        return [this.service];
    }

    fetchBrightness(callback: CharacteristicGetCallback) {
        request(this.buildRequest('lounge', 'GET', ''), function (this, error, response, body) {
            if (response) {
                if (response.statusCode === 200) {
                    this.log.debug('fetchBrightness: ' + body);
                    this.brightness = JSON.parse(body).color.brightness;
                    callback(null, this.brightness);
                    return;
                }
            }
            callback(null, 0);
        }.bind(this));
    }

    setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.log.debug('setBrightness value: ' + value);
        var correctedValue = Math.round(Number(value)*2.55);
        this.brightness = correctedValue;
        this.log.debug('setBrightness corrected value: ' + correctedValue);
        const request_body = {
            'color': {
                'hue': this.hue,
                'saturation': this.saturation,
                'brightness': correctedValue,
            },
            'colordelta':{
                'hue': 0,
                'saturation': 0,
                'brightness': 0,
            },
        };
        request(this.buildRequest('lounge', 'POST', JSON.stringify(request_body)), function (this, error, response) {
            if (response) {
                this.log.debug('setBrightness: ' + response.statusCode);
                if (response.statusCode === 200) {
                    callback(null, value);
                    return;
                }
            }
            callback(null, 0);
        }.bind(this));
    }

    setSaturation(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.log.debug('setSaturation: ' + value);
        this.saturation = Number(value);
        const request_body = {
            'color': {
                'hue': this.hue,
                'saturation': Number(value),
                'brightness': this.brightness,
            },
            'colordelta':{
                'hue': 0,
                'saturation': 0,
                'brightness': 0,
            },
        };
        request(this.buildRequest('lounge', 'POST', JSON.stringify(request_body)), function (this, error, response) {
            if (response) {
                this.log.debug('setSaturation, statusCode: ' + response.statusCode);
                if (response.statusCode === 200) {
                    callback(null);
                    return;
                }
            }
            callback(null, 0);
        }.bind(this));
    }

    setHue(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        this.log.debug('setHue: ' + value);
        this.hue = Number(value);
        const request_body = {
            'color': {
                'hue': value,
                'saturation': this.saturation,
                'brightness': this.brightness,
            },
            'colordelta':{
                'hue': 0,
                'saturation': 0,
                'brightness': 0,
            },
        };
        request(this.buildRequest('lounge', 'POST', JSON.stringify(request_body)), function (this, error, response) {
            if (response) {
                this.log.debug('setHue, statusCode: ' + response.statusCode);
                if (response.statusCode === 200) {
                    callback(null, value);
                    return;
                }
            }
            callback(null, 0);
        }.bind(this));
    }

    fetchSaturation(callback: CharacteristicGetCallback) {
        request(this.buildRequest('lounge', 'GET', ''), function (this, error, response, body) {
            if (response) {
                if (response.statusCode === 200) {
                    this.log.debug('fetchSaturation: ' + body);
                    this.saturation = JSON.parse(body).color.saturation;
                    callback(null, this.saturation);
                    return;
                }
            }
            callback(null, 0);
        }.bind(this));
    }

    fetchHue(callback: CharacteristicGetCallback) {
        request(this.buildRequest('lounge', 'GET', ''), function (this, error, response, body) {
            if (response) {
                if (response.statusCode === 200) {
                    this.log.debug('fetchHue: ' + body);
                    this.hue = JSON.parse(body).color.hue;
                    callback(null, this.hue);
                    return;
                }
            }
            callback(null, 0);
        }.bind(this));
    }

    buildRequest(url: string, method: string, body: string) {
        return {
            url: 'http://' + this.config.ip + ':1925/ambilight/' + url,
            method: method,
            body: body,
            rejectUnauthorized: false,
            timeout: 1000,
            followAllRedirects: true,
            forever: true,
        };
    }

    handleOnGet(callback: CharacteristicGetCallback) {
        request(this.buildRequest('power', 'GET', ''), function (this, error, response, body) {
            if (response) {
                if (response.statusCode === 200) {
                    if (body) {
                        const powerstate = JSON.parse(body);
                        if ('On' === powerstate.power) {
                            callback(null, true);
                            return;
                        }
                        this.log.debug('Device ' + this.config.name + ' is standby. ' + body);
                        callback(null, false);
                    } else {
                        this.log.debug('Device ' + this.config.name + ' is offline. ' + response.statusCode);
                        callback(null, false);
                    }
                }
            } else {
                this.log.debug('Device ' + this.config.name + ' is offline. ' + error);
                callback(null, false);
            }
        }.bind(this));
        return this;
    }

    handleOnSet(value: CharacteristicValue, callback: CharacteristicSetCallback) {
        let request_body = {};
        if (value) {
            request_body = {'power': 'On'};
        } else {
            request_body = {'power': 'Off'};
        }
        request(this.buildRequest('power', 'POST', JSON.stringify(request_body)), function (this, error, response) {
            if (response) {
                if (response.statusCode === 200) {
                    callback(null, value);
                }
            } else {
                this.log.debug('Device ' + this.config.name + ' is offline. ' + error);
                this.wakeOnLan();
                callback(null, false);
            }
        }.bind(this));
        return this;
    }

    wakeOnLan() {
        if (!this.config.macAddress) {
            return;
        }
        this.log.debug('Trying to wake ' + this.config.name + ' on ' + this.config.macAddress);
        wol.wake(this.config.macAddress);
    }
}
