// Content script for real-time currency conversion
class CurrencyConverter {
  constructor() {
    this.tooltip = null;
    this.isEnabled = true;
    this.processingFee = false;
    this.tariff = false;
    this.tariffPercentage = 16.5;
    this.currentRate = null;
    this.debounceTimer = null;
    this.fromCurrency = "JPY";
    this.toCurrency = "USD";
    this.lastProcessedText = "";
    this.lastProcessedElement = null;
    this.urlFilterMode = "disabled";
    this.allowlistUrls = [];
    this.blocklistUrls = [];
    this.isUrlAllowed = true; // Default to allowed
    this.selectorFilterMode = "disabled";
    this.allowedSelectors = [];
    this.blockedSelectors = [];
    this.init();
  }

  async init() {
    console.log("🔄 Currency Converter: Initializing...");
    const {
      enabled = true,
      processingFee = false,
      tariff = false,
      tariffPercentage = 16.5,
      fromCurrency = "JPY",
      toCurrency = "USD",
      urlFilterMode = "disabled",
      allowlistUrls = [],
      blocklistUrls = [],
      selectorFilterMode = "disabled",
      allowedSelectors = [],
      blockedSelectors = [],
    } = await chrome.storage.local.get([
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
    ]);

    this.isEnabled = enabled;
    this.processingFee = processingFee;
    this.tariff = tariff;
    this.tariffPercentage = tariffPercentage;
    this.fromCurrency = fromCurrency;
    this.toCurrency = toCurrency;
    this.urlFilterMode = urlFilterMode;
    this.allowlistUrls = allowlistUrls;
    this.blocklistUrls = blocklistUrls;
    this.selectorFilterMode = selectorFilterMode;
    this.allowedSelectors = allowedSelectors;
    this.blockedSelectors = blockedSelectors;

    // Check if current URL is allowed
    this.isUrlAllowed = this.checkUrlAllowed(window.location.href);

    console.log("💱 Currency Converter Settings:", {
      enabled: this.isEnabled,
      processingFee: this.processingFee,
      tariff: this.tariff,
      tariffPercentage: this.tariffPercentage + "%",
      from: this.fromCurrency,
      to: this.toCurrency,
      site: window.location.hostname,
      urlFilterMode: this.urlFilterMode,
      urlAllowed: this.isUrlAllowed,
      selectorFilterMode: this.selectorFilterMode,
      allowedSelectors: this.allowedSelectors,
      blockedSelectors: this.blockedSelectors,
    });

    if (this.isEnabled) {
      this.setupEventListeners();
      this.createTooltip();
    }
  }

  createTooltip() {
    this.tooltip = document.createElement("div");
    this.tooltip.id = "currency-converter-tooltip";
    this.tooltip.className = "currency-tooltip";
    this.tooltip.style.cssText = `
      position: fixed !important;
      background: #1a202c !important;
      color: white !important;
      padding: 10px 14px !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
      opacity: 0 !important;
      transition: opacity 0.2s ease !important;
      border: 2px solid #4299e1 !important;
      backdrop-filter: blur(8px) !important;
      width: auto !important;
      min-width: fit-content !important;
      max-width: 400px !important;
      word-wrap: break-word !important;
    `;
    document.body.appendChild(this.tooltip);
    console.log("✅ Currency Converter: Tooltip created and added to DOM");
  }

  setupEventListeners() {
    // Listen to input events on all text inputs
    document.addEventListener("input", this.handleInput.bind(this), true);
    document.addEventListener("focus", this.handleFocus.bind(this), true);
    document.addEventListener("blur", this.handleBlur.bind(this), true);
    document.addEventListener("keyup", this.handleKeyUp.bind(this), true);

    // Additional events for complex sites like eBay
    document.addEventListener("change", this.handleInput.bind(this), true);
    document.addEventListener("paste", this.handlePaste.bind(this), true);
    document.addEventListener(
      "propertychange",
      this.handleInput.bind(this),
      true
    ); // IE/old browsers

    // Listen for click events to detect when user clicks in input fields
    document.addEventListener("click", this.handleClick.bind(this), true);

    // Handle dynamic content
    const observer = new MutationObserver(this.handleMutations.bind(this));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["value", "contenteditable", "role"],
    });

    // Fallback polling for problematic sites like eBay
    if (window.location.hostname.includes("ebay")) {
      this.setupEbayFallback();
    }
  }

  setupEbayFallback() {
    console.log("Setting up eBay fallback polling");

    // Poll for active input elements every 500ms
    setInterval(() => {
      const activeElement = document.activeElement;
      // Only check elements that are actually text-input related, not checkboxes/buttons
      if (
        activeElement &&
        this.isTextInputElement(activeElement) &&
        this.isInputElement(activeElement)
      ) {
        this.handleTextChange(activeElement);
      }

      // Also check common eBay input selectors
      const ebayInputs = document.querySelectorAll(
        [
          'input[type="text"]',
          'input[type="search"]',
          ".textbox",
          ".searchbox",
          '[role="textbox"]',
          ".gh-tb", // eBay header search
          ".x-textbox",
          ".form-control",
        ].join(",")
      );

      ebayInputs.forEach((input) => {
        if (input === document.activeElement || input.matches(":focus")) {
          this.handleTextChange(input);
        }
      });
    }, 500);
  }

  handleMutations(mutations) {
    // Re-attach listeners to new input elements
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const inputs = node.querySelectorAll(
            'input[type="text"], input[type="number"], textarea'
          );
          inputs.forEach((input) => {
            // Event listeners are automatically attached through event delegation
          });
        }
      });
    });
  }

  handleInput(event) {
    console.log("🎯 Input event triggered:", {
      enabled: this.isEnabled,
      urlAllowed: this.isUrlAllowed,
      tagName: event.target.tagName,
      className: event.target.className,
      id: event.target.id,
      selectorMode: this.selectorFilterMode,
      allowedSelectors: this.allowedSelectors,
    });

    // Check if extension is enabled and URL is allowed
    if (!this.isEnabled || !this.isUrlAllowed) {
      console.log("❌ Extension disabled or URL not allowed");
      return;
    }

    // Only process valid input elements
    if (this.isInputElement(event.target)) {
      console.log("🔍 Processing input on", window.location.hostname);
      this.handleTextChange(event.target);
    } else {
      console.log("❌ Element failed isInputElement check");
    }
  }

  handleFocus(event) {
    if (!this.isEnabled || !this.isUrlAllowed) {
      return;
    }

    // Only process if it's a text input element first (avoid unnecessary logging on checkboxes, etc.)
    if (
      this.isTextInputElement(event.target) &&
      this.isInputElement(event.target)
    ) {
      this.handleTextChange(event.target);
    }
  }

  handleBlur(event) {
    this.hideTooltip();
  }

  handleKeyUp(event) {
    if (!this.isEnabled || !this.isUrlAllowed) {
      return;
    }

    // Only process if it's a text input element first (avoid unnecessary logging on checkboxes, etc.)
    if (
      this.isTextInputElement(event.target) &&
      this.isInputElement(event.target)
    ) {
      this.handleTextChange(event.target);
    }
  }

  handlePaste(event) {
    // Only process if it's a text input element first (avoid unnecessary logging on checkboxes, etc.)
    if (
      this.isTextInputElement(event.target) &&
      this.isInputElement(event.target)
    ) {
      // Wait for paste to complete, then process
      setTimeout(() => {
        this.handleTextChange(event.target);
      }, 10);
    }
  }

  handleClick(event) {
    // Only process if it's a text input element first (avoid unnecessary logging on checkboxes, etc.)
    if (
      this.isTextInputElement(event.target) &&
      this.isInputElement(event.target)
    ) {
      // Check if there's already text in the field
      setTimeout(() => {
        this.handleTextChange(event.target);
      }, 10);
    }
  }

  handleTextChange(element) {
    // Check if extension is enabled and URL is allowed
    if (!this.isEnabled || !this.isUrlAllowed) {
      return;
    }

    // IMPORTANT: Check if this element should be processed based on our filters
    if (!this.isInputElement(element)) {
      console.log("🚫 Element rejected by filters in handleTextChange:", {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
      });
      return;
    }

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.processText(element);
    }, 300); // Increased debounce time to reduce excessive calls
  }

  isInputElement(element) {
    if (!element || !element.tagName) return false;

    // If selector filtering is enabled with specific selectors, ONLY use selector matching
    if (
      this.selectorFilterMode === "allowlist" &&
      this.allowedSelectors.length > 0
    ) {
      const result = this.allowedSelectors.some((selector) =>
        this.elementMatchesSelector(element, selector)
      );

      // Debug: Only log for actual input-like elements to reduce noise
      if (result) {
        console.log("✅ Element ALLOWED:", {
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          matchedSelectors: this.allowedSelectors.filter((selector) =>
            this.elementMatchesSelector(element, selector)
          ),
        });
      } else if (this.isBasicInputElement(element)) {
        // Only log rejections for actual input elements to reduce console spam
        console.log("❌ Input Element REJECTED by selector filters:", {
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          allowedSelectors: this.allowedSelectors,
        });
      }

      return result;
    }

    if (
      this.selectorFilterMode === "blocklist" &&
      this.blockedSelectors.length > 0
    ) {
      // For blocklist mode with selectors, still need basic input check first
      let isBasicInput = this.isBasicInputElement(element);
      if (!isBasicInput) return false;

      // Then check if it's NOT in the blocked selectors
      return !this.blockedSelectors.some((selector) =>
        this.elementMatchesSelector(element, selector)
      );
    }

    // Default behavior: basic input detection + optional selector filtering
    let isInput = this.isBasicInputElement(element);
    if (!isInput) {
      return false;
    }

    // Apply selector filtering if enabled (for disabled mode or empty selector lists)
    return this.checkElementAgainstSelectors(element);
  }

  /**
   * Check if element is a basic input element (original logic)
   * @param {Element} element - Element to check
   * @returns {boolean} Whether element is a basic input
   */
  isBasicInputElement(element) {
    // Standard input elements
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      return true;
    }

    // Contenteditable elements
    if (element.contentEditable === "true" || element.contentEditable === "") {
      return true;
    }

    // eBay and other sites often use divs with specific roles or classes
    if (
      element.getAttribute &&
      (element.getAttribute("role") === "textbox" ||
        element.getAttribute("role") === "input" ||
        element.getAttribute("contenteditable") === "true" ||
        element.classList.contains("textbox") ||
        element.classList.contains("input") ||
        element.classList.contains("search") ||
        element.classList.contains("searchbox") ||
        // eBay specific classes (common patterns)
        element.classList.contains("textInput") ||
        element.classList.contains("form-control") ||
        element.classList.contains("x-textbox"))
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if element is specifically a text input element (excludes checkboxes, radio buttons, etc.)
   * @param {Element} element - Element to check
   * @returns {boolean} Whether element is a text input
   */
  isTextInputElement(element) {
    if (!element || !element.tagName) return false;

    // Text-based input elements only
    if (element.tagName === "INPUT") {
      const type = element.type?.toLowerCase() || "text";
      // Only allow text-based input types, exclude checkboxes, radio buttons, etc.
      return [
        "text",
        "search",
        "url",
        "tel",
        "email",
        "password",
        "number",
      ].includes(type);
    }

    // Textarea is always text-based
    if (element.tagName === "TEXTAREA") {
      return true;
    }

    // Contenteditable elements
    if (element.contentEditable === "true" || element.contentEditable === "") {
      return true;
    }

    // Elements with text-based roles
    if (element.getAttribute && element.getAttribute("role") === "textbox") {
      return true;
    }

    return false;
  }

  extractAmount(text) {
    // Extract any number from the text
    // First check for numbers with currency symbols (higher priority)
    const currencyPatterns = [
      /[$€£¥₹₩]\s*([0-9,]+(?:\.[0-9]{1,2})?)/g, // $1,000 or €1000.50
      /([0-9,]+(?:\.[0-9]{1,2})?)\s*[円₹₩]/g, // 1000円 or 1,000₹
      /([0-9,]+(?:\.[0-9]{1,2})?)\s*(USD|EUR|GBP|JPY|CNY|KRW|CAD|AUD|CHF|SGD)/gi, // 1000 USD
      /(USD|EUR|GBP|JPY|CNY|KRW|CAD|AUD|CHF|SGD)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, // USD 1000
    ];

    // Check currency patterns first
    for (const pattern of currencyPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const numericMatch = matches[0].match(/([0-9,]+(?:\.[0-9]{1,2})?)/);
        if (numericMatch) {
          const amount = parseFloat(numericMatch[1].replace(/,/g, ""));
          if (!isNaN(amount) && amount > 0) {
            return amount;
          }
        }
      }
    }

    // Extract ANY number from the text (treat as selected "from" currency by default)
    const numberPattern = /([0-9,]+(?:\.[0-9]{1,2})?)/g;
    const matches = [...text.matchAll(numberPattern)];

    if (matches.length > 0) {
      // Get the last number in the text (most recent typing)
      const lastMatch = matches[matches.length - 1];
      const amount = parseFloat(lastMatch[1].replace(/,/g, ""));

      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }

    return null;
  }
  async processText(element) {
    if (!this.isEnabled) {
      this.hideTooltip();
      return;
    }

    if (!element) {
      this.hideTooltip();
      return;
    }

    // Get text content from element - handle different input types
    let textContent = "";
    if (element.value !== undefined) {
      textContent = element.value;
    } else if (element.textContent !== undefined) {
      textContent = element.textContent;
    } else if (element.innerText !== undefined) {
      textContent = element.innerText;
    }

    if (!textContent || textContent.trim() === "") {
      this.hideTooltip();
      return;
    }

    // Prevent duplicate processing of same text
    if (
      textContent === this.lastProcessedText &&
      element === this.lastProcessedElement
    ) {
      return;
    }

    this.lastProcessedText = textContent;
    this.lastProcessedElement = element;

    const amount = this.extractAmount(textContent);

    if (amount) {
      console.log(
        `💱 Converting ${amount} ${this.fromCurrency} to ${this.toCurrency}`
      );
      try {
        const response = await chrome.runtime.sendMessage({
          action: "convertCurrency",
          amount: amount,
          fromCurrency: this.fromCurrency,
          toCurrency: this.toCurrency,
        });

        if (!response) {
          console.warn("No response from background script");
          return;
        }

        if (response.error) {
          console.warn("Currency conversion error:", response.error);
          return;
        }

        this.showTooltip(element, amount, response.toAmount, response.rate);
      } catch (error) {
        // Handle extension context invalidation gracefully
        if (
          error.message &&
          error.message.includes("Extension context invalidated")
        ) {
          console.log(
            "Extension was reloaded - currency conversion temporarily unavailable"
          );
          this.hideTooltip();
          return;
        }

        // Handle other connection errors
        if (
          error.message &&
          (error.message.includes("Could not establish connection") ||
            error.message.includes("Receiving end does not exist"))
        ) {
          console.log(
            "Background script not available - extension may need reload"
          );
          this.hideTooltip();
          return;
        }

        console.warn("Failed to convert currency:", error);
      }
    } else {
      this.hideTooltip();
    }
  }

  showTooltip(element, fromAmount, toAmount, rate) {
    console.log("🎯 showTooltip called:", {
      tooltipExists: !!this.tooltip,
      element: element?.tagName,
      fromAmount,
      toAmount,
      rate,
    });

    if (!this.tooltip) {
      console.warn("❌ Tooltip element not found - recreating");
      this.createTooltip();
      if (!this.tooltip) return;
    }

    const rect = element.getBoundingClientRect();
    console.log("📍 Element position:", rect);
    const formattedFrom = this.formatCurrency(fromAmount, this.fromCurrency);

    // Apply processing fee and tariff if enabled
    let finalToAmount = toAmount;
    let baseAmount = toAmount;
    let processingFeeAmount = 0;
    let tariffAmount = 0;

    if (this.processingFee) {
      processingFeeAmount = toAmount * 0.05; // 5% processing fee
      finalToAmount += processingFeeAmount;
    }

    if (this.tariff) {
      tariffAmount = baseAmount * (this.tariffPercentage / 100); // Custom tariff percentage on base amount
      finalToAmount += tariffAmount;
    }

    const formattedTo = this.formatCurrency(finalToAmount, this.toCurrency);

    let tooltipContent = `
      <div style="font-weight: 600; margin-bottom: 2px;">
        ${formattedFrom} → ${formattedTo}
      </div>
      <div style="font-size: 12px; opacity: 0.8;">
        Rate: 1 ${this.fromCurrency} = ${rate.toFixed(6)} ${this.toCurrency}
      </div>`;

    // Show fee and tariff breakdown if any are enabled
    if (this.processingFee || this.tariff) {
      const formattedBase = this.formatCurrency(baseAmount, this.toCurrency);
      let breakdownText = `Base: ${formattedBase}`;

      if (this.processingFee) {
        const formattedFee = this.formatCurrency(
          processingFeeAmount,
          this.toCurrency
        );
        breakdownText += ` + Fee: ${formattedFee} (5%)`;
      }

      if (this.tariff) {
        const formattedTariff = this.formatCurrency(
          tariffAmount,
          this.toCurrency
        );
        breakdownText += ` + Tariff: ${formattedTariff} (${this.tariffPercentage}%)`;
      }

      tooltipContent += `
      <div style="font-size: 11px; opacity: 0.7; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 4px;">
        ${breakdownText}
      </div>`;
    }

    this.tooltip.innerHTML = tooltipContent;

    // Ensure tooltip is in DOM
    if (!document.body.contains(this.tooltip)) {
      console.log("⚠️ Tooltip not in DOM, re-adding");
      document.body.appendChild(this.tooltip);
    }

    // Position tooltip (using fixed positioning now)
    const tooltipRect = this.tooltip.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 5;

    // Adjust if tooltip goes off screen
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    if (top + tooltipRect.height > window.innerHeight) {
      top = rect.top - tooltipRect.height - 5;
    }

    this.tooltip.style.left = left + "px";
    this.tooltip.style.top = top + "px";
    this.tooltip.style.opacity = "1";

    console.log("✅ Tooltip positioned:", {
      left: left + "px",
      top: top + "px",
      opacity: this.tooltip.style.opacity,
      content: this.tooltip.innerHTML.length,
      visible: this.tooltip.offsetHeight > 0,
      inDOM: document.body.contains(this.tooltip),
    });
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.opacity = "0";
    }
  }

  formatCurrency(amount, currency) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currency === "JPY" ? 0 : 2,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount);
  }

  /**
   * Check if the current URL is allowed based on filter settings
   * @param {string} url - URL to check
   * @returns {boolean} Whether URL is allowed
   */
  checkUrlAllowed(url) {
    if (this.urlFilterMode === "disabled") {
      return true;
    }

    const domain = this.extractDomain(url);

    if (this.urlFilterMode === "allowlist") {
      // If allowlist is empty, allow all
      if (!this.allowlistUrls.length) {
        return true;
      }
      // Check if domain matches any allowlist pattern
      return this.allowlistUrls.some((pattern) =>
        this.matchesPattern(domain, pattern)
      );
    }

    if (this.urlFilterMode === "blocklist") {
      // Check if domain matches any blocklist pattern
      return !this.blocklistUrls.some((pattern) =>
        this.matchesPattern(domain, pattern)
      );
    }

    return true;
  }

  /**
   * Extract domain from URL
   * @param {string} url - Full URL
   * @returns {string} Domain portion
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase();
    } catch (error) {
      console.log("Failed to parse URL:", url);
      return url.toLowerCase();
    }
  }

  /**
   * Check if domain matches URL pattern (supports wildcards)
   * @param {string} domain - Domain to check
   * @param {string} pattern - Pattern to match against
   * @returns {boolean} Whether domain matches pattern
   */
  matchesPattern(domain, pattern) {
    // Handle direct protocol matches (like chrome://)
    if (pattern.includes("://")) {
      return window.location.href
        .toLowerCase()
        .startsWith(pattern.toLowerCase());
    }

    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .toLowerCase()
      .replace(/\./g, "\\.") // Escape dots
      .replace(/\*/g, ".*"); // Convert * to .*

    const regex = new RegExp(`^${regexPattern}$`);

    // Check if domain matches pattern or is a subdomain of pattern
    return (
      regex.test(domain) || domain.endsWith("." + pattern.replace(/^\*\./, ""))
    );
  }

  /**
   * Update URL filter settings
   * @param {Object} settings - New URL filter settings
   */
  updateUrlFilter(settings) {
    this.urlFilterMode = settings.urlFilterMode || "disabled";
    this.allowlistUrls = settings.allowlistUrls || [];
    this.blocklistUrls = settings.blocklistUrls || [];

    // Re-check current URL
    this.isUrlAllowed = this.checkUrlAllowed(window.location.href);

    console.log("URL filter updated:", {
      mode: this.urlFilterMode,
      allowed: this.isUrlAllowed,
      allowlist: this.allowlistUrls,
      blocklist: this.blocklistUrls,
    });

    // Hide tooltip if URL is no longer allowed
    if (!this.isUrlAllowed) {
      this.hideTooltip();
    }
  }

  /**
   * Check element against selector filters
   * @param {Element} element - Element to check
   * @returns {boolean} Whether element should be processed
   */
  checkElementAgainstSelectors(element) {
    if (this.selectorFilterMode === "disabled") {
      return true;
    }

    if (this.selectorFilterMode === "allowlist") {
      // If allowlist is empty, allow all elements
      if (!this.allowedSelectors.length) {
        return true;
      }
      // Check if element matches any allowed selector
      return this.allowedSelectors.some((selector) =>
        this.elementMatchesSelector(element, selector)
      );
    }

    if (this.selectorFilterMode === "blocklist") {
      // Check if element matches any blocked selector
      return !this.blockedSelectors.some((selector) =>
        this.elementMatchesSelector(element, selector)
      );
    }

    return true;
  }

  /**
   * Check if element matches a CSS selector
   * @param {Element} element - Element to check
   * @param {string} selector - CSS selector
   * @returns {boolean} Whether element matches selector
   */
  elementMatchesSelector(element, selector) {
    try {
      return element.matches(selector);
    } catch (error) {
      console.warn("Invalid selector:", selector, error);
      return false;
    }
  }

  /**
   * Update selector filter settings
   * @param {Object} settings - New selector filter settings
   */
  updateSelectorFilter(settings) {
    this.selectorFilterMode = settings.selectorFilterMode || "disabled";
    this.allowedSelectors = settings.allowedSelectors || [];
    this.blockedSelectors = settings.blockedSelectors || [];

    console.log("Selector filter updated:", {
      mode: this.selectorFilterMode,
      allowedSelectors: this.allowedSelectors,
      blockedSelectors: this.blockedSelectors,
    });

    // Hide tooltip since filtering may have changed
    this.hideTooltip();
  }
}

// Initialize the converter
let currencyConverter;

// Function to safely initialize the converter
function initializeCurrencyConverter() {
  try {
    if (!currencyConverter) {
      currencyConverter = new CurrencyConverter();
    }
  } catch (error) {
    console.log("Failed to initialize currency converter:", error.message);
    // Retry after a short delay
    setTimeout(initializeCurrencyConverter, 1000);
  }
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCurrencyConverter);
} else {
  initializeCurrencyConverter();
}

// Listen for extension reload and reinitialize
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !currencyConverter) {
    console.log(
      "Page became visible - checking if extension needs reinitialization"
    );
    initializeCurrencyConverter();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "ping") {
      sendResponse({ success: true, active: !!currencyConverter });
      return true;
    }

    if (request.action === "toggleEnabled") {
      if (currencyConverter) {
        currencyConverter.isEnabled = request.enabled;
        console.log("Extension toggle changed to:", request.enabled);
        if (!request.enabled) {
          currencyConverter.hideTooltip();
        }
      }
      sendResponse({ success: true });
    }

    if (request.action === "currencyChanged") {
      if (currencyConverter) {
        currencyConverter.fromCurrency = request.fromCurrency;
        currencyConverter.toCurrency = request.toCurrency;
        // Hide current tooltip since currency changed
        currencyConverter.hideTooltip();
      }
      sendResponse({ success: true });
    }

    if (request.action === "processingFeeChanged") {
      if (currencyConverter) {
        currencyConverter.processingFee = request.processingFee;
        console.log("Processing fee changed to:", request.processingFee);
        // Hide current tooltip to refresh with new fee calculation
        currencyConverter.hideTooltip();
      }
      sendResponse({ success: true });
    }

    if (request.action === "tariffChanged") {
      if (currencyConverter) {
        currencyConverter.tariff = request.tariff;
        console.log("Tariff changed to:", request.tariff);
        // Hide current tooltip to refresh with new tariff calculation
        currencyConverter.hideTooltip();
      }
      sendResponse({ success: true });
    }

    if (request.action === "tariffPercentageChanged") {
      if (currencyConverter) {
        currencyConverter.tariffPercentage = request.tariffPercentage;
        console.log(
          "Tariff percentage changed to:",
          request.tariffPercentage + "%"
        );
        // Hide current tooltip to refresh with new percentage
        currencyConverter.hideTooltip();
      }
      sendResponse({ success: true });
    }

    if (request.action === "urlFilterChanged") {
      if (currencyConverter) {
        currencyConverter.updateUrlFilter({
          urlFilterMode: request.urlFilterMode,
          allowlistUrls: request.allowlistUrls,
          blocklistUrls: request.blocklistUrls,
        });
      }
      sendResponse({ success: true });
    }

    if (request.action === "selectorFilterChanged") {
      if (currencyConverter) {
        currencyConverter.updateSelectorFilter({
          selectorFilterMode: request.selectorFilterMode,
          allowedSelectors: request.allowedSelectors,
          blockedSelectors: request.blockedSelectors,
        });
      }
      sendResponse({ success: true });
    }
  } catch (error) {
    console.log("Error handling message:", error.message);
    sendResponse({ success: false, error: error.message });
  }

  return true; // Keep message channel open for async response
});

// Listen for storage changes as backup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && currencyConverter) {
    if (changes.enabled) {
      currencyConverter.isEnabled = changes.enabled.newValue;
      console.log(
        "Storage change - Extension enabled:",
        changes.enabled.newValue
      );
      if (!changes.enabled.newValue) {
        currencyConverter.hideTooltip();
      }
    }

    if (changes.processingFee) {
      currencyConverter.processingFee = changes.processingFee.newValue;
      console.log(
        "Storage change - Processing fee:",
        changes.processingFee.newValue
      );
      // Refresh tooltip to show updated fee
      currencyConverter.hideTooltip();
    }

    if (changes.tariff) {
      currencyConverter.tariff = changes.tariff.newValue;
      console.log("Storage change - Tariff:", changes.tariff.newValue);
      // Refresh tooltip to show updated tariff
      currencyConverter.hideTooltip();
    }

    if (changes.tariffPercentage) {
      currencyConverter.tariffPercentage = changes.tariffPercentage.newValue;
      console.log(
        "Storage change - Tariff percentage:",
        changes.tariffPercentage.newValue + "%"
      );
      // Refresh tooltip to show updated percentage
      currencyConverter.hideTooltip();
    }

    // Handle URL filter changes
    if (
      changes.urlFilterMode ||
      changes.allowlistUrls ||
      changes.blocklistUrls
    ) {
      const newSettings = {};
      if (changes.urlFilterMode)
        newSettings.urlFilterMode = changes.urlFilterMode.newValue;
      if (changes.allowlistUrls)
        newSettings.allowlistUrls = changes.allowlistUrls.newValue;
      if (changes.blocklistUrls)
        newSettings.blocklistUrls = changes.blocklistUrls.newValue;

      currencyConverter.updateUrlFilter({
        urlFilterMode:
          newSettings.urlFilterMode || currencyConverter.urlFilterMode,
        allowlistUrls:
          newSettings.allowlistUrls || currencyConverter.allowlistUrls,
        blocklistUrls:
          newSettings.blocklistUrls || currencyConverter.blocklistUrls,
      });
    }

    // Handle selector filter changes
    if (
      changes.selectorFilterMode ||
      changes.allowedSelectors ||
      changes.blockedSelectors
    ) {
      const newSettings = {};
      if (changes.selectorFilterMode)
        newSettings.selectorFilterMode = changes.selectorFilterMode.newValue;
      if (changes.allowedSelectors)
        newSettings.allowedSelectors = changes.allowedSelectors.newValue;
      if (changes.blockedSelectors)
        newSettings.blockedSelectors = changes.blockedSelectors.newValue;

      currencyConverter.updateSelectorFilter({
        selectorFilterMode:
          newSettings.selectorFilterMode ||
          currencyConverter.selectorFilterMode,
        allowedSelectors:
          newSettings.allowedSelectors || currencyConverter.allowedSelectors,
        blockedSelectors:
          newSettings.blockedSelectors || currencyConverter.blockedSelectors,
      });
    }
  }
});
