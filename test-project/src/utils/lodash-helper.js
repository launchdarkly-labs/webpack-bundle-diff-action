import _ from 'lodash';

export const lodashHelper = {
  processArray(arr) {
    return {
      sorted: _.sortBy(arr),
      grouped: _.groupBy(arr, (n) => n % 2 === 0 ? 'even' : 'odd'),
      chunked: _.chunk(arr, 2),
      sum: _.sum(arr),
      mean: _.mean(arr),
      max: _.max(arr),
      min: _.min(arr)
    };
  },
  
  processObject(obj) {
    return {
      keys: _.keys(obj),
      values: _.values(obj),
      pairs: _.toPairs(obj),
      cleaned: _.omitBy(obj, _.isNil),
      defaults: _.defaultsDeep({}, obj, { default: true })
    };
  },
  
  transformData(data, schema) {
    return _.transform(data, (result, value, key) => {
      if (schema[key]) {
        result[key] = schema[key](value);
      } else {
        result[key] = value;
      }
    }, {});
  }
};