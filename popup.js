/**
 * Popup Controller for the Live Currency Converter Extension
 * Handles UI interactions, settings management, and content script injection
 */

// Configuration constants
const CONFIG = {
  DEFAULTS: {
    enabled: true,
    processingFee: false,
    tariff: false,
    tariffPercentage: 16.5,
    fromCurrency: "JPY",
    toCurrency: "USD",
    urlFilterMode: "disabled", // "disabled", "allowlist", "blocklist"
    allowlistUrls: ["ebay.com", "amazon.com", "aliexpress.com"],
    blocklistUrls: ["chrome://", "chrome-extension://"],
    selectorFilterMode: "disabled", // "disabled", "allowlist", "blocklist"
    allowedSelectors: [
      ".price",
      "#price-input",
      "[data-price]",
      ".currency-input",
    ],
    blockedSelectors: [".advertisement", ".ad", "#popup", ".modal"],
  },
  STORAGE_KEYS: [
    "enabled",
    "processingFee",
    "tariff",
    "tariffPercentage",
    "fromCurrency",
    "toCurrency",
    "urlFilterMode",
    "allowlistUrls",
    "blocklistUrls",
    "selectorFilterMode",
    "allowedSelectors",
    "blockedSelectors",
  ],
  MESSAGES: {
    PING: "ping",
    TOGGLE_ENABLED: "toggleEnabled",
    CURRENCY_CHANGED: "currencyChanged",
    PROCESSING_FEE_CHANGED: "processingFeeChanged",
    TARIFF_CHANGED: "tariffChanged",
    TARIFF_PERCENTAGE_CHANGED: "tariffPercentageChanged",
    URL_FILTER_CHANGED: "urlFilterChanged",
    SELECTOR_FILTER_CHANGED: "selectorFilterChanged",
  },
};

/**
 * Utility class for common operations
 */
class PopupUtils {
  /**
   * Send message to content script in active tab
   * @param {Object} message - Message to send
   * @returns {Promise<any>} Response from content script
   */
  static async sendMessageToActiveTab(message) {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0]) {
        return await chrome.tabs.sendMessage(tabs[0].id, message);
      }
    } catch (error) {
      console.log("Could not notify content script:", error.message);
    }
    return null;
  }

  /**
   * Update toggle UI state
   * @param {Element} toggle - Toggle element
   * @param {boolean} enabled - Whether toggle should be active
   */
  static updateToggleState(toggle, enabled) {
    if (!toggle) return;

    if (enabled) {
      toggle.classList.add("active");
    } else {
      toggle.classList.remove("active");
    }
  }

  /**
   * Get toggle state from element
   * @param {Element} toggle - Toggle element
   * @returns {boolean} Current toggle state
   */
  static getToggleState(toggle) {
    return toggle?.classList.contains("active") || false;
  }

  /**
   * Validate percentage input
   * @param {string|number} value - Percentage value to validate
   * @returns {boolean} Whether value is valid
   */
  static validatePercentage(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  }
}

class PopupController {
  constructor() {
    this.elements = this.initializeElements();
    this.init();
  }

  /**
   * Initialize DOM elements
   * @returns {Object} Object containing all DOM element references
   */
  initializeElements() {
    const elementIds = [
      "enableToggle",
      "processingFeeToggle",
      "tariffToggle",
      "tariffPercentage",
      "rateValue",
      "rateDescription",
      "lastUpdated",
      "fromCurrency",
      "toCurrency",
      "swapCurrencies",
      "urlModeDisabled",
      "urlModeAllowlist",
      "urlModeBlocklist",
      "allowlistUrls",
      "blocklistUrls",
      "allowlistContainer",
      "blocklistContainer",
      "advancedToggle",
      "advancedContent",
      "selectorModeDisabled",
      "selectorModeAllowlist",
      "selectorModeBlocklist",
      "allowedSelectors",
      "blockedSelectors",
      "allowedSelectorsContainer",
      "blockedSelectorsContainer",
    ];

    const elements = {};
    elementIds.forEach((id) => {
      elements[id] = document.getElementById(id);
      if (!elements[id]) {
        console.warn(`Element with id '${id}' not found`);
      }
    });

    return elements;
  }

  /**
   * Initialize the popup controller
   */
  async init() {
    try {
      await this.loadSettings();
      await this.loadExchangeRate();
      this.setupEventListeners();
    } catch (error) {
      console.error("Failed to initialize popup:", error);
      this.displayError("Failed to initialize extension");
    }
  }

  /**
   * Load settings from storage and update UI
   */
  async loadSettings() {
    try {
      const settings = await chrome.storage.local.get(CONFIG.STORAGE_KEYS);
      const settingsWithDefaults = { ...CONFIG.DEFAULTS, ...settings };

      this.applySettingsToUI(settingsWithDefaults);
      this.updateRateDescription();
    } catch (error) {
      console.error("Failed to load settings:", error);
      this.displayError("Failed to load settings");
    }
  }

  /**
   * Apply loaded settings to UI elements
   * @param {Object} settings - Settings object
   */
  applySettingsToUI(settings) {
    const {
      enabled,
      processingFee,
      tariff,
      tariffPercentage,
      fromCurrency,
      toCurrency,
      urlFilterMode,
      allowlistUrls,
      blocklistUrls,
      selectorFilterMode,
      allowedSelectors,
      blockedSelectors,
    } = settings;

    this.updateToggle(enabled);
    this.updateProcessingFeeToggle(processingFee);
    this.updateTariffToggle(tariff);

    if (this.elements.tariffPercentage) {
      this.elements.tariffPercentage.value = tariffPercentage;
    }
    if (this.elements.fromCurrency) {
      this.elements.fromCurrency.value = fromCurrency;
    }
    if (this.elements.toCurrency) {
      this.elements.toCurrency.value = toCurrency;
    }

    // Apply URL management settings
    this.updateUrlFilterMode(urlFilterMode);
    this.updateUrlLists(allowlistUrls, blocklistUrls);

    // Apply selector management settings
    this.updateSelectorFilterMode(selectorFilterMode);
    this.updateSelectorLists(allowedSelectors, blockedSelectors);
  }

  async loadExchangeRate() {
    try {
      // Get rate from background script
      const response = await chrome.runtime.sendMessage({
        action: "getExchangeRate",
        fromCurrency:
          this.elements.fromCurrency?.value || CONFIG.DEFAULTS.fromCurrency,
        toCurrency:
          this.elements.toCurrency?.value || CONFIG.DEFAULTS.toCurrency,
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

  /**
   * Setup event listeners for UI interactions
   */
  setupEventListeners() {
    const eventMap = [
      { element: "enableToggle", event: "click", handler: "handleToggle" },
      {
        element: "processingFeeToggle",
        event: "click",
        handler: "handleProcessingFeeToggle",
      },
      {
        element: "tariffToggle",
        event: "click",
        handler: "handleTariffToggle",
      },
      {
        element: "tariffPercentage",
        event: "input",
        handler: "handleTariffPercentageChange",
      },
      {
        element: "fromCurrency",
        event: "change",
        handler: "handleCurrencyChange",
      },
      {
        element: "toCurrency",
        event: "change",
        handler: "handleCurrencyChange",
      },
      { element: "swapCurrencies", event: "click", handler: "handleSwap" },
      {
        element: "urlModeDisabled",
        event: "change",
        handler: "handleUrlModeChange",
      },
      {
        element: "urlModeAllowlist",
        event: "change",
        handler: "handleUrlModeChange",
      },
      {
        element: "urlModeBlocklist",
        event: "change",
        handler: "handleUrlModeChange",
      },
      {
        element: "allowlistUrls",
        event: "input",
        handler: "handleAllowlistChange",
      },
      {
        element: "blocklistUrls",
        event: "input",
        handler: "handleBlocklistChange",
      },
      {
        element: "advancedToggle",
        event: "click",
        handler: "handleAdvancedToggle",
      },
      {
        element: "selectorModeDisabled",
        event: "change",
        handler: "handleSelectorModeChange",
      },
      {
        element: "selectorModeAllowlist",
        event: "change",
        handler: "handleSelectorModeChange",
      },
      {
        element: "selectorModeBlocklist",
        event: "change",
        handler: "handleSelectorModeChange",
      },
      {
        element: "allowedSelectors",
        event: "input",
        handler: "handleAllowedSelectorsChange",
      },
      {
        element: "blockedSelectors",
        event: "input",
        handler: "handleBlockedSelectorsChange",
      },
    ];

    // Bind all event listeners
    eventMap.forEach(({ element, event, handler }) => {
      if (this.elements[element] && this[handler]) {
        this.elements[element].addEventListener(
          event,
          this[handler].bind(this)
        );
      }
    });

    // Refresh rate when popup becomes visible
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.loadExchangeRate();
      }
    });
  }

  /**
   * Handle main extension toggle
   */
  async handleToggle() {
    await this.handleToggleAction(
      "enabled",
      this.elements.enableToggle,
      CONFIG.MESSAGES.TOGGLE_ENABLED
    );
  }

  /**
   * Generic toggle handler
   * @param {string} storageKey - Storage key to update
   * @param {Element} toggleElement - Toggle UI element
   * @param {string} messageAction - Message action to send
   * @param {Object} additionalData - Additional data to include in message
   */
  async handleToggleAction(
    storageKey,
    toggleElement,
    messageAction,
    additionalData = {}
  ) {
    const currentState = PopupUtils.getToggleState(toggleElement);
    const newState = !currentState;

    try {
      // Save to storage
      await chrome.storage.local.set({ [storageKey]: newState });

      // Update UI
      PopupUtils.updateToggleState(toggleElement, newState);

      // Notify content scripts
      await PopupUtils.sendMessageToActiveTab({
        action: messageAction,
        [storageKey]: newState,
        ...additionalData,
      });
    } catch (error) {
      console.error(`Failed to toggle ${storageKey}:`, error);
    }
  }

  /**
   * Update main toggle UI state
   * @param {boolean} enabled - Whether toggle should be active
   */
  updateToggle(enabled) {
    PopupUtils.updateToggleState(this.elements.enableToggle, enabled);
  }

  /**
   * Handle processing fee toggle
   */
  async handleProcessingFeeToggle() {
    await this.handleToggleAction(
      "processingFee",
      this.elements.processingFeeToggle,
      CONFIG.MESSAGES.PROCESSING_FEE_CHANGED
    );
  }

  /**
   * Update processing fee toggle UI state
   * @param {boolean} enabled - Whether toggle should be active
   */
  updateProcessingFeeToggle(enabled) {
    PopupUtils.updateToggleState(this.elements.processingFeeToggle, enabled);
  }

  /**
   * Handle tariff toggle
   */
  async handleTariffToggle() {
    await this.handleToggleAction(
      "tariff",
      this.elements.tariffToggle,
      CONFIG.MESSAGES.TARIFF_CHANGED
    );
  }

  /**
   * Update tariff toggle UI state
   * @param {boolean} enabled - Whether toggle should be active
   */
  updateTariffToggle(enabled) {
    PopupUtils.updateToggleState(this.elements.tariffToggle, enabled);
  }

  /**
   * Handle tariff percentage input change
   */
  async handleTariffPercentageChange() {
    const percentage = parseFloat(this.elements.tariffPercentage.value);

    // Validate percentage input
    if (!PopupUtils.validatePercentage(percentage)) {
      return; // Don't save invalid values
    }

    try {
      // Save to storage
      await chrome.storage.local.set({ tariffPercentage: percentage });

      // Notify content scripts
      await PopupUtils.sendMessageToActiveTab({
        action: CONFIG.MESSAGES.TARIFF_PERCENTAGE_CHANGED,
        tariffPercentage: percentage,
      });
    } catch (error) {
      console.error("Failed to update tariff percentage:", error);
    }
  }

  /**
   * Display exchange rate in UI
   * @param {number} rate - Exchange rate to display
   */
  displayExchangeRate(rate) {
    if (!this.elements.rateValue) return;

    if (typeof rate === "number" && rate > 0) {
      this.elements.rateValue.textContent = `$${rate.toFixed(6)}`;

      // Show practical example in tooltip
      const exampleJPY = 10000;
      const exampleUSD = exampleJPY * rate;
      this.elements.rateValue.title = `Example: ¥${exampleJPY.toLocaleString()} = $${exampleUSD.toFixed(
        2
      )}`;
    } else {
      this.elements.rateValue.textContent = "Invalid rate";
    }
  }

  /**
   * Display last updated time in UI
   * @param {Date} date - Last update date
   */
  displayLastUpdated(date) {
    if (!this.elements.lastUpdated) return;

    const updateText = this.formatTimeDifference(date);
    this.elements.lastUpdated.textContent = updateText;
    this.elements.lastUpdated.title = `Last updated: ${date.toLocaleString()}`;
  }

  /**
   * Format time difference for display
   * @param {Date} date - Date to compare against now
   * @returns {string} Formatted time difference
   */
  formatTimeDifference(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
      return "Updated just now";
    } else if (diffMinutes < 60) {
      return `Updated ${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return `Updated ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    }
  }

  /**
   * Display error message in UI
   * @param {string} message - Error message to display
   */
  displayError(message) {
    if (this.elements.rateValue) {
      this.elements.rateValue.textContent = "Error";
      this.elements.rateValue.className = "rate-value error";
    }
    if (this.elements.lastUpdated) {
      this.elements.lastUpdated.textContent = message;
    }
  }

  /**
   * Handle currency selection change
   */
  async handleCurrencyChange() {
    if (!this.elements.fromCurrency || !this.elements.toCurrency) {
      return;
    }

    const fromCurrency = this.elements.fromCurrency.value;
    const toCurrency = this.elements.toCurrency.value;

    // Prevent same currency selection
    if (fromCurrency === toCurrency) {
      // Auto-swap to prevent same currency
      if (this.elements.fromCurrency === document.activeElement) {
        // User changed "from", so change "to" to something different
        const alternatives = ["USD", "EUR", "GBP", "JPY"];
        this.elements.toCurrency.value = alternatives.find(
          (curr) => curr !== fromCurrency
        );
      } else {
        // User changed "to", so change "from" to something different
        const alternatives = ["JPY", "USD", "EUR", "GBP"];
        this.elements.fromCurrency.value = alternatives.find(
          (curr) => curr !== toCurrency
        );
      }
    }

    // Save settings
    await chrome.storage.local.set({
      fromCurrency: this.elements.fromCurrency.value,
      toCurrency: this.elements.toCurrency.value,
    });

    this.updateRateDescription();
    await this.loadExchangeRate();

    // Notify content script of currency change
    this.notifyContentScript();
  }

  /**
   * Handle currency swap button click
   */
  async handleSwap() {
    if (!this.elements.fromCurrency || !this.elements.toCurrency) {
      return;
    }

    const fromValue = this.elements.fromCurrency.value;
    const toValue = this.elements.toCurrency.value;

    this.elements.fromCurrency.value = toValue;
    this.elements.toCurrency.value = fromValue;

    await this.handleCurrencyChange();
  }

  /**
   * Update rate description text
   */
  updateRateDescription() {
    if (
      !this.elements.fromCurrency ||
      !this.elements.toCurrency ||
      !this.elements.rateDescription
    ) {
      return;
    }

    const from = this.elements.fromCurrency.value;
    const to = this.elements.toCurrency.value;
    this.elements.rateDescription.textContent = `1 ${from} = ${to}`;
  }

  /**
   * Notify content script of currency changes
   */
  async notifyContentScript() {
    if (!this.elements.fromCurrency || !this.elements.toCurrency) {
      return;
    }

    await PopupUtils.sendMessageToActiveTab({
      action: CONFIG.MESSAGES.CURRENCY_CHANGED,
      fromCurrency: this.elements.fromCurrency.value,
      toCurrency: this.elements.toCurrency.value,
    });
  }

  /**
   * Update URL filter mode UI and visibility
   * @param {string} mode - Filter mode: 'disabled', 'allowlist', 'blocklist'
   */
  updateUrlFilterMode(mode) {
    // Update radio buttons
    if (this.elements.urlModeDisabled) {
      this.elements.urlModeDisabled.checked = mode === "disabled";
    }
    if (this.elements.urlModeAllowlist) {
      this.elements.urlModeAllowlist.checked = mode === "allowlist";
    }
    if (this.elements.urlModeBlocklist) {
      this.elements.urlModeBlocklist.checked = mode === "blocklist";
    }

    // Show/hide appropriate containers
    if (this.elements.allowlistContainer) {
      this.elements.allowlistContainer.style.display =
        mode === "allowlist" ? "block" : "none";
    }
    if (this.elements.blocklistContainer) {
      this.elements.blocklistContainer.style.display =
        mode === "blocklist" ? "block" : "none";
    }
  }

  /**
   * Update URL lists in textareas
   * @param {Array} allowlistUrls - Array of allowed URLs
   * @param {Array} blocklistUrls - Array of blocked URLs
   */
  updateUrlLists(allowlistUrls, blocklistUrls) {
    if (this.elements.allowlistUrls && Array.isArray(allowlistUrls)) {
      this.elements.allowlistUrls.value = allowlistUrls.join("\n");
    }
    if (this.elements.blocklistUrls && Array.isArray(blocklistUrls)) {
      this.elements.blocklistUrls.value = blocklistUrls.join("\n");
    }
  }

  /**
   * Handle URL filter mode change
   */
  async handleUrlModeChange(event) {
    const mode = event.target.value;

    try {
      // Save to storage
      await chrome.storage.local.set({ urlFilterMode: mode });

      // Update UI
      this.updateUrlFilterMode(mode);

      // Notify content scripts
      await this.notifyUrlFilterChange();
    } catch (error) {
      console.error("Failed to update URL filter mode:", error);
    }
  }

  /**
   * Handle allowlist URL changes
   */
  async handleAllowlistChange() {
    if (!this.elements.allowlistUrls) return;

    const urlText = this.elements.allowlistUrls.value;
    const urls = this.parseUrlList(urlText);

    try {
      await chrome.storage.local.set({ allowlistUrls: urls });
      await this.notifyUrlFilterChange();
    } catch (error) {
      console.error("Failed to update allowlist:", error);
    }
  }

  /**
   * Handle blocklist URL changes
   */
  async handleBlocklistChange() {
    if (!this.elements.blocklistUrls) return;

    const urlText = this.elements.blocklistUrls.value;
    const urls = this.parseUrlList(urlText);

    try {
      await chrome.storage.local.set({ blocklistUrls: urls });
      await this.notifyUrlFilterChange();
    } catch (error) {
      console.error("Failed to update blocklist:", error);
    }
  }

  /**
   * Parse URL list from textarea input
   * @param {string} urlText - Raw text input from textarea
   * @returns {Array} Cleaned array of URL patterns
   */
  parseUrlList(urlText) {
    return urlText
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
  }

  /**
   * Notify content script of URL filter changes
   */
  async notifyUrlFilterChange() {
    const settings = await chrome.storage.local.get([
      "urlFilterMode",
      "allowlistUrls",
      "blocklistUrls",
    ]);

    await PopupUtils.sendMessageToActiveTab({
      action: "urlFilterChanged",
      urlFilterMode: settings.urlFilterMode,
      allowlistUrls: settings.allowlistUrls,
      blocklistUrls: settings.blocklistUrls,
    });
  }

  /**
   * Handle advanced settings toggle
   */
  handleAdvancedToggle() {
    if (!this.elements.advancedToggle || !this.elements.advancedContent) return;

    const isExpanded = this.elements.advancedContent.style.display !== "none";

    if (isExpanded) {
      this.elements.advancedContent.style.display = "none";
      this.elements.advancedToggle.classList.remove("expanded");
    } else {
      this.elements.advancedContent.style.display = "block";
      this.elements.advancedToggle.classList.add("expanded");
    }
  }

  /**
   * Update selector filter mode UI and visibility
   * @param {string} mode - Filter mode: 'disabled', 'allowlist', 'blocklist'
   */
  updateSelectorFilterMode(mode) {
    // Update radio buttons
    if (this.elements.selectorModeDisabled) {
      this.elements.selectorModeDisabled.checked = mode === "disabled";
    }
    if (this.elements.selectorModeAllowlist) {
      this.elements.selectorModeAllowlist.checked = mode === "allowlist";
    }
    if (this.elements.selectorModeBlocklist) {
      this.elements.selectorModeBlocklist.checked = mode === "blocklist";
    }

    // Show/hide appropriate containers
    if (this.elements.allowedSelectorsContainer) {
      this.elements.allowedSelectorsContainer.style.display =
        mode === "allowlist" ? "block" : "none";
    }
    if (this.elements.blockedSelectorsContainer) {
      this.elements.blockedSelectorsContainer.style.display =
        mode === "blocklist" ? "block" : "none";
    }
  }

  /**
   * Update selector lists in textareas
   * @param {Array} allowedSelectors - Array of allowed CSS selectors
   * @param {Array} blockedSelectors - Array of blocked CSS selectors
   */
  updateSelectorLists(allowedSelectors, blockedSelectors) {
    if (this.elements.allowedSelectors && Array.isArray(allowedSelectors)) {
      this.elements.allowedSelectors.value = allowedSelectors.join("\n");
    }
    if (this.elements.blockedSelectors && Array.isArray(blockedSelectors)) {
      this.elements.blockedSelectors.value = blockedSelectors.join("\n");
    }
  }

  /**
   * Handle selector filter mode change
   */
  async handleSelectorModeChange(event) {
    const mode = event.target.value;

    try {
      // Save to storage
      await chrome.storage.local.set({ selectorFilterMode: mode });

      // Update UI
      this.updateSelectorFilterMode(mode);

      // Notify content scripts
      await this.notifySelectorFilterChange();
    } catch (error) {
      console.error("Failed to update selector filter mode:", error);
    }
  }

  /**
   * Handle allowed selectors change
   */
  async handleAllowedSelectorsChange() {
    if (!this.elements.allowedSelectors) return;

    const selectorText = this.elements.allowedSelectors.value;
    const selectors = this.parseSelectorList(selectorText);

    try {
      await chrome.storage.local.set({ allowedSelectors: selectors });
      await this.notifySelectorFilterChange();
    } catch (error) {
      console.error("Failed to update allowed selectors:", error);
    }
  }

  /**
   * Handle blocked selectors change
   */
  async handleBlockedSelectorsChange() {
    if (!this.elements.blockedSelectors) return;

    const selectorText = this.elements.blockedSelectors.value;
    const selectors = this.parseSelectorList(selectorText);

    try {
      await chrome.storage.local.set({ blockedSelectors: selectors });
      await this.notifySelectorFilterChange();
    } catch (error) {
      console.error("Failed to update blocked selectors:", error);
    }
  }

  /**
   * Parse selector list from textarea input
   * @param {string} selectorText - Raw text input from textarea
   * @returns {Array} Cleaned array of CSS selectors
   */
  parseSelectorList(selectorText) {
    return selectorText
      .split("\n")
      .map((selector) => selector.trim())
      .filter((selector) => selector.length > 0)
      .filter((selector) => this.isValidCSSSelector(selector));
  }

  /**
   * Validate CSS selector syntax
   * @param {string} selector - CSS selector to validate
   * @returns {boolean} Whether selector is valid
   */
  isValidCSSSelector(selector) {
    try {
      document.querySelector(selector);
      return true;
    } catch (error) {
      console.warn("Invalid CSS selector:", selector);
      return false;
    }
  }

  /**
   * Notify content script of selector filter changes
   */
  async notifySelectorFilterChange() {
    const settings = await chrome.storage.local.get([
      "selectorFilterMode",
      "allowedSelectors",
      "blockedSelectors",
    ]);

    await PopupUtils.sendMessageToActiveTab({
      action: CONFIG.MESSAGES.SELECTOR_FILTER_CHANGED,
      selectorFilterMode: settings.selectorFilterMode,
      allowedSelectors: settings.allowedSelectors,
      blockedSelectors: settings.blockedSelectors,
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new PopupController();
});
