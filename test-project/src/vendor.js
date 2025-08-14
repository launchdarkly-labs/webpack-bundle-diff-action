// Vendor bundle - simulates third-party dependencies
import _ from 'lodash';

// Simulate a vendor library
const VendorLib = {
  // Use lodash to ensure it gets bundled
  utilities: {
    debounce: _.debounce,
    throttle: _.throttle,
    cloneDeep: _.cloneDeep,
    merge: _.merge,
    pick: _.pick,
    omit: _.omit
  },
  
  // Mock API client
  apiClient: {
    baseUrl: 'https://api.example.com',
    
    async get(endpoint, options = {}) {
      return this._request('GET', endpoint, null, options);
    },
    
    async post(endpoint, data, options = {}) {
      return this._request('POST', endpoint, data, options);
    },
    
    _request(method, endpoint, data, options) {
      // Simulate API request
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            status: 200,
            data: { method, endpoint, data, timestamp: Date.now() }
          });
        }, Math.random() * 100);
      });
    }
  },
  
  // Mock analytics
  analytics: {
    track(event, properties = {}) {
      console.log('Analytics event:', event, properties);
      return Promise.resolve();
    },
    
    identify(userId, traits = {}) {
      console.log('Analytics identify:', userId, traits);
      return Promise.resolve();
    }
  }
};

export default VendorLib;