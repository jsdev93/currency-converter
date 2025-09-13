// Background script for currency conversion
class CurrencyService {
  constructor() {
    this.exchangeRates = new Map(); // Store rates for different currency pairs
    this.lastFetch = new Map();
    this.cacheDuration = 5 * 60 * 1000; // 5 minutes cache
    this.apiKey = "free"; // Using free tier, no API key needed
    this.baseApiUrl = "https://api.exchangerate-api.com/v4/latest";
  }

  async getExchangeRate(fromCurrency = "JPY", toCurrency = "USD") {
    const now = Date.now();
    const pairKey = `${fromCurrency}_${toCurrency}`;

    // Check if we have cached data that's still valid
    const cachedRate = this.exchangeRates.get(pairKey);
    const lastFetchTime = this.lastFetch.get(pairKey);

    if (
      cachedRate &&
      lastFetchTime &&
      now - lastFetchTime < this.cacheDuration
    ) {
      return cachedRate;
    }

    try {
      const url = `${this.baseApiUrl}/${fromCurrency}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const rate = data.rates[toCurrency];

      if (!rate) {
        throw new Error(`No rate found for ${fromCurrency} to ${toCurrency}`);
      }

      // Cache the rate
      this.exchangeRates.set(pairKey, rate);
      this.lastFetch.set(pairKey, now);

      // Store in Chrome storage for persistence
      const storageKey = `rate_${pairKey}`;
      const fetchKey = `fetch_${pairKey}`;
      await chrome.storage.local.set({
        [storageKey]: rate,
        [fetchKey]: now,
      });

      console.log(`Exchange rate updated for ${pairKey}:`, rate);
      return rate;
    } catch (error) {
      console.error("Failed to fetch exchange rate:", error);

      // Try to get from storage as fallback
      const storageKey = `rate_${pairKey}`;
      const fetchKey = `fetch_${pairKey}`;
      const stored = await chrome.storage.local.get([storageKey, fetchKey]);

      if (stored[storageKey]) {
        const rate = stored[storageKey];
        this.exchangeRates.set(pairKey, rate);
        this.lastFetch.set(pairKey, stored[fetchKey]);
        return rate;
      }

      // Default fallback rates
      const fallbackRates = {
        JPY_USD: 0.0067,
        USD_JPY: 149.25,
        EUR_USD: 1.1,
        USD_EUR: 0.91,
        GBP_USD: 1.27,
        USD_GBP: 0.79,
      };

      return fallbackRates[pairKey] || 1.0;
    }
  }

  async initialize() {
    // Load cached rates from storage on startup
    const keys = await chrome.storage.local.get();

    // Restore cached rates
    for (const [key, value] of Object.entries(keys)) {
      if (key.startsWith("rate_")) {
        const pairKey = key.replace("rate_", "");
        this.exchangeRates.set(pairKey, value);
      }
      if (key.startsWith("fetch_")) {
        const pairKey = key.replace("fetch_", "");
        this.lastFetch.set(pairKey, value);
      }
    }

    // Get fresh rate for default pair
    await this.getExchangeRate();
  }
}

const currencyService = new CurrencyService();

// Initialize on startup
currencyService.initialize();

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getExchangeRate") {
    const fromCurrency = request.fromCurrency || "JPY";
    const toCurrency = request.toCurrency || "USD";

    currencyService
      .getExchangeRate(fromCurrency, toCurrency)
      .then((rate) => {
        sendResponse({ rate: rate, fromCurrency, toCurrency });
      })
      .catch((error) => {
        sendResponse({ error: error.message });
      });
    return true; // Will respond asynchronously
  }

  if (request.action === "convertCurrency") {
    const fromCurrency = request.fromCurrency || "JPY";
    const toCurrency = request.toCurrency || "USD";
    const amount = request.amount || request.jpyAmount; // Support both names

    currencyService
      .getExchangeRate(fromCurrency, toCurrency)
      .then((rate) => {
        const convertedAmount = amount * rate;
        sendResponse({
          fromAmount: amount,
          toAmount: convertedAmount,
          fromCurrency: fromCurrency,
          toCurrency: toCurrency,
          rate: rate,
          // Legacy support
          jpyAmount: request.jpyAmount,
          usdAmount: request.jpyAmount ? request.jpyAmount * rate : undefined,
        });
      })
      .catch((error) => {
        sendResponse({ error: error.message });
      });
    return true; // Will respond asynchronously
  }
});

// Periodic update (every 5 minutes)
setInterval(() => {
  currencyService.getExchangeRate();
}, 5 * 60 * 1000);
