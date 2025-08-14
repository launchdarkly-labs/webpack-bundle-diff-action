import { lodashHelper } from './utils/lodash-helper.js';
import { mathUtils } from './utils/math.js';
import { domManipulation } from './utils/dom.js';

// Test change: Add a large data structure to increase bundle size
const LARGE_TEST_DATA = {
  countries: [
    'United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru',
    'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Switzerland',
    'China', 'Japan', 'India', 'Australia', 'South Korea', 'Thailand', 'Vietnam', 'Singapore',
    'Russia', 'Ukraine', 'Poland', 'Czech Republic', 'Hungary', 'Romania', 'Bulgaria', 'Croatia'
  ],
  cities: [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio',
    'London', 'Paris', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Vienna', 'Prague', 'Warsaw',
    'Tokyo', 'Beijing', 'Mumbai', 'Sydney', 'Seoul', 'Bangkok', 'Ho Chi Minh City', 'Jakarta',
    'Moscow', 'Kiev', 'Istanbul', 'Cairo', 'Lagos', 'Johannesburg', 'Cape Town', 'Nairobi'
  ],
  features: {
    analytics: true,
    notifications: true,
    realTimeUpdates: true,
    advancedReporting: true,
    multiLanguageSupport: true,
    darkModeToggle: true,
    responsiveDesign: true,
    accessibilityFeatures: true
  }
};

// Main application entry point
class WebpackBundleDiffApp {
  constructor() {
    this.version = '1.0.0';
    this.initialized = false;
  }

  init() {
    console.log('Initializing Webpack Bundle Diff App v' + this.version);
    
    // Use various utilities to create different bundle chunks
    const processedData = lodashHelper.processArray([1, 2, 3, 4, 5]);
    const calculation = mathUtils.fibonacci(10);
    const element = domManipulation.createElement('div', 'test-content');
    
    // Use the large test data to increase bundle size
    const testData = LARGE_TEST_DATA;
    console.log('Loaded test data with', testData.countries.length, 'countries');
    
    this.initialized = true;
    return {
      processedData,
      calculation,
      element,
      testData,
      timestamp: new Date().toISOString()
    };
  }

  getStatus() {
    return {
      initialized: this.initialized,
      version: this.version,
      modules: ['lodash-helper', 'math', 'dom']
    };
  }
}

// Export for potential use in other modules
export default WebpackBundleDiffApp;

// Initialize if running directly
if (typeof window !== 'undefined') {
  window.WebpackBundleDiffApp = WebpackBundleDiffApp;
  const app = new WebpackBundleDiffApp();
  window.appInstance = app.init();
}