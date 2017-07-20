// UPDATED VERSION OF https://github.com/chadsmith/node-liftmaster/blob/master/liftmaster.js

const request = require('request-promise-native');

class MyQ {
  constructor(username, password) {
    this.userAgent = 'Chamberlain/3.73';
    this.brandId = '2';
    this.apiVersion = '4.1';
    this.culture = "en";
    this.endpoint = 'https://myqexternal.myqdevice.com';
    this.appId = 'NWknvuBd7LoFHfXmKNMBcgajXtZEgKUh4V7WNzMidrpUUluDpVYVZx+xT4PCM5Kx';
    this.garageDoorIds = [2, 5, 7, 17];
    this.username = username;
    this.password = password;
  };

  login() {
    return request({
      method: 'POST',
      uri: this.endpoint + '/api/v4/User/Validate',
      headers: {
        "User-Agent": this.userAgent,
        BrandId: this.brandId,
        ApiVersion: this.apiVersion,
        Culture: this.culture,
        MyQApplicationId: this.appId
      },
      body: {
        username: this.username,
        password: this.password
      },
      json: true
    }).then((response) => {
      const result = {
        success: response.SecurityToken? true : false
      };
      if (result.success) {
        this.securityToken = response.SecurityToken;
        result.token = this.securityToken;
      } else {
        result.error = response.ErrorMessage;
      }
      return result;
    }).catch((err) => {
      throw err;
    });
  };

  getDoors() {
    return request({
      method: 'GET',
      uri: this.endpoint + '/api/v4/userdevicedetails/get',
      body: {
        ApplicationId: this.appId,
        SecurityToken: this.securityToken
      },
      qs: {
        appId: this.appId,
        SecurityToken: this.securityToken
      },
      json: true
    }).then((response) => {
      this.doors = [];
      for (let device of response.Devices) {
        if (this.garageDoorIds.includes(device.MyQDeviceTypeId)) {
          const door = {
            id: device.MyQDeviceId,
            type: device.MyQDeviceTypeName
          };
          for (let attribute of device.Attributes) {
            if (attribute.AttributeDisplayName === 'desc') {
              door.name = attribute.Value;
            }
            if (attribute.AttributeDisplayName === 'doorstate') {
              door.state = attribute.Value;
              door.updated = attribute.UpdatedTime;
            }
          }
          this.doors.push(door);
        }
      }
      const result = {
        success: true,
        doors: this.doors
      };
      return result;
    }).catch((err) => {
      throw err;
    });
  };

  getDoorState(deviceId) {
    return request({
      method: 'GET',
      uri: this.endpoint + '/Device/getDeviceAttribute',
      qs: {
        appId: this.appId,
        securityToken: this.securityToken,
        devId: deviceId,
        name: 'doorstate'
      },
      json: true
    }).then((response) => {
      this.devices.forEach((device) => {
        if (device.id === deviceId) {
          device.state = response.AttributeValue;
          device.updated = response.UpdatedTime;
          return device;
        }
      });
    }).catch((err) => {
      throw err;
    });
  };

  setDoorState(deviceId, state) {
    return request({
      method: 'PUT',
      uri: this.endpoint + '/Device/setDeviceAttribute',
      body: {
        DeviceId: deviceId,
        ApplicationId: this.appId,
        AttributeName: 'desireddoorstate',
        AttributeValue: state,
        securityToken: this.securityToken
      },
      json: true
    }).then((response) => {
      setTimeout(() => {
        return this._loopDoorState(deviceId);
      }, 1000);
    }).catch((err) => {
      throw err;
    });
  };

  _loopDoorState(deviceId) {
    return this.getDoorState(deviceId)
      .then((response) => {
        if (response.state == 4 || response.state == 5) {
          setTimeout(() => {
            return this._loopDoorState(deviceId)
          }, 5000);
        } else {
          return response;
        }
      }).catch((err) => {
        throw err;
      });
  };
};

module.exports = MyQ;