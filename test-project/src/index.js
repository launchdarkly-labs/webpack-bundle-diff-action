import { lodashHelper } from './utils/lodash-helper.js';
import { mathUtils } from './utils/math.js';
import { domManipulation } from './utils/dom.js';

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
    
    this.initialized = true;
    return {
      processedData,
      calculation,
      element,
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