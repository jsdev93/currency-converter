// Popup script for the currency converter extension

class PopupController {
  constructor() {
    this.enableToggle = document.getElementById("enableToggle");
    this.rateValue = document.getElementById("rateValue");
    this.rateDescription = document.getElementById("rateDescription");
    this.lastUpdated = document.getElementById("lastUpdated");
    this.fromCurrency = document.getElementById("fromCurrency");
    this.toCurrency = document.getElementById("toCurrency");
    this.swapButton = document.getElementById("swapCurrencies");

    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadExchangeRate();
    this.setupEventListeners();
  }

  async loadSettings() {
    try {
      const {
        enabled = true,
        fromCurrency = "JPY",
        toCurrency = "USD",
      } = await chrome.storage.local.get([
        "enabled",
        "fromCurrency",
        "toCurrency",
      ]);

      this.updateToggle(enabled);
      this.fromCurrency.value = fromCurrency;
      this.toCurrency.value = toCurrency;
      this.updateRateDescription();
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }

  async loadExchangeRate() {
    try {
      // Get rate from background script
      const response = await chrome.runtime.sendMessage({
        action: "getExchangeRate",
        fromCurrency: this.fromCurrency.value,
        toCurrency: this.toCurrency.value,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.rate) {
        this.displayExchangeRate(response.rate);
      } else {
        throw new Error("No exchange rate received");
      }

      // Get last update time from storage
      const { lastFetch } = await chrome.storage.local.get(["lastFetch"]);
      if (lastFetch) {
        this.displayLastUpdated(new Date(lastFetch));
      }
    } catch (error) {
      console.error("Failed to load exchange rate:", error);
      this.displayError("Failed to load exchange rate");
    }
  }

  setupEventListeners() {
    this.enableToggle.addEventListener("click", this.handleToggle.bind(this));
    this.fromCurrency.addEventListener(
      "change",
      this.handleCurrencyChange.bind(this)
    );
    this.toCurrency.addEventListener(
      "change",
      this.handleCurrencyChange.bind(this)
    );
    this.swapButton.addEventListener("click", this.handleSwap.bind(this));

    // Refresh rate when popup opens
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.loadExchangeRate();
      }
    });
  }

  async handleToggle() {
    const isCurrentlyEnabled = this.enableToggle.classList.contains("active");
    const newState = !isCurrentlyEnabled;

    try {
      // Save to storage
      await chrome.storage.local.set({ enabled: newState });

      // Update UI
      this.updateToggle(newState);

      // Notify content scripts
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        chrome.tabs
          .sendMessage(tabs[0].id, {
            action: "toggleEnabled",
            enabled: newState,
          })
          .catch((error) => {
            // Content script might not be loaded yet, that's okay
            console.log("Could not notify content script:", error.message);
          });
      }
    } catch (error) {
      console.error("Failed to toggle setting:", error);
    }
  }

  updateToggle(enabled) {
    if (enabled) {
      this.enableToggle.classList.add("active");
    } else {
      this.enableToggle.classList.remove("active");
    }
  }

  displayExchangeRate(rate) {
    if (typeof rate === "number" && rate > 0) {
      this.rateValue.textContent = `$${rate.toFixed(6)}`;

      // Also show a practical example
      const exampleJPY = 10000;
      const exampleUSD = exampleJPY * rate;
      this.rateValue.title = `Example: ¥${exampleJPY.toLocaleString()} = $${exampleUSD.toFixed(
        2
      )}`;
    } else {
      this.rateValue.textContent = "Invalid rate";
    }
  }

  displayLastUpdated(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    let updateText;
    if (diffMinutes < 1) {
      updateText = "Updated just now";
    } else if (diffMinutes < 60) {
      updateText = `Updated ${diffMinutes} min${
        diffMinutes === 1 ? "" : "s"
      } ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      updateText = `Updated ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    }

    this.lastUpdated.textContent = updateText;
    this.lastUpdated.title = `Last updated: ${date.toLocaleString()}`;
  }

  displayError(message) {
    this.rateValue.textContent = "Error";
    this.rateValue.className = "rate-value error";
    this.lastUpdated.textContent = message;
  }

  async handleCurrencyChange() {
    const fromCurrency = this.fromCurrency.value;
    const toCurrency = this.toCurrency.value;

    // Prevent same currency selection
    if (fromCurrency === toCurrency) {
      // Auto-swap to prevent same currency
      if (this.fromCurrency === document.activeElement) {
        // User changed "from", so change "to" to something different
        const alternatives = ["USD", "EUR", "GBP", "JPY"];
        this.toCurrency.value = alternatives.find(
          (curr) => curr !== fromCurrency
        );
      } else {
        // User changed "to", so change "from" to something different
        const alternatives = ["JPY", "USD", "EUR", "GBP"];
        this.fromCurrency.value = alternatives.find(
          (curr) => curr !== toCurrency
        );
      }
    }

    // Save settings
    await chrome.storage.local.set({
      fromCurrency: this.fromCurrency.value,
      toCurrency: this.toCurrency.value,
    });

    this.updateRateDescription();
    await this.loadExchangeRate();

    // Notify content script of currency change
    this.notifyContentScript();
  }

  async handleSwap() {
    const fromValue = this.fromCurrency.value;
    const toValue = this.toCurrency.value;

    this.fromCurrency.value = toValue;
    this.toCurrency.value = fromValue;

    await this.handleCurrencyChange();
  }

  updateRateDescription() {
    const from = this.fromCurrency.value;
    const to = this.toCurrency.value;
    this.rateDescription.textContent = `1 ${from} = ${to}`;
  }

  async notifyContentScript() {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        chrome.tabs
          .sendMessage(tabs[0].id, {
            action: "currencyChanged",
            fromCurrency: this.fromCurrency.value,
            toCurrency: this.toCurrency.value,
          })
          .catch(() => {
            // Content script might not be loaded, that's okay
          });
      }
    } catch (error) {
      console.log("Could not notify content script:", error.message);
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new PopupController();
});
