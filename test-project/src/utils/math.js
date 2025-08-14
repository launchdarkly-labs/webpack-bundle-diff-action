export const mathUtils = {
  fibonacci(n) {
    if (n <= 1) return n;
    
    const sequence = [0, 1];
    for (let i = 2; i <= n; i++) {
      sequence[i] = sequence[i - 1] + sequence[i - 2];
    }
    return sequence;
  },
  
  factorial(n) {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  },
  
  isPrime(n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) {
        return false;
      }
    }
    return true;
  },
  
  generatePrimes(limit) {
    const primes = [];
    for (let i = 2; i <= limit; i++) {
      if (this.isPrime(i)) {
        primes.push(i);
      }
    }
    return primes;
  },
  
  statistics(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const sum = numbers.reduce((acc, n) => acc + n, 0);
    const mean = sum / numbers.length;
    
    return {
      sum,
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      min: Math.min(...numbers),
      max: Math.max(...numbers),
      range: Math.max(...numbers) - Math.min(...numbers),
      variance: numbers.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / numbers.length
    };
  }
};