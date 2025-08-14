import { lodashHelper } from './utils/lodash-helper.js';
import { mathUtils } from './utils/math.js';
import { domManipulation } from './utils/dom.js';

// Test: Add substantial data to verify dogfooding workflow
const VERIFICATION_DATA = {
  features: [
    'Real-time bundle analysis', 'Automated PR comments', 'Bundle budget tracking',
    'Long-term caching impact', 'Webpack stats comparison', 'GitHub Actions integration',
    'Bundle size visualization', 'Performance monitoring', 'Code splitting analysis',
    'Compression reporting', 'Asset optimization', 'Dependency tracking'
  ],
  metrics: {
    totalBundles: 0,
    totalSize: 0,
    compressionRatio: 0,
    cacheHitRate: 0,
    loadTime: 0,
    performanceScore: 0
  },
  configuration: {
    enableAnalytics: true,
    enableCompression: true,
    enableCaching: true,
    enableOptimization: true,
    thresholds: {
      warning: 0.05,
      error: 0.15,
      critical: 0.25
    }
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
    
    // Include verification data to test bundle size increase
    const verificationData = VERIFICATION_DATA;
    console.log('Loaded verification data with', verificationData.features.length, 'features');
    
    this.initialized = true;
    return {
      processedData,
      calculation,
      element,
      verificationData,
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