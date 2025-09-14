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
    this.init();
  }

  async init() {
    console.log("🔄 Currency Converter: Initializing...");

    // Get extension state from storage
    const {
      enabled = true,
      processingFee = false,
      tariff = false,
      tariffPercentage = 16.5,
      fromCurrency = "JPY",
      toCurrency = "USD",
    } = await chrome.storage.local.get([
      "enabled",
      "processingFee",
      "tariff",
      "tariffPercentage",
      "fromCurrency",
      "toCurrency",
    ]);

    this.isEnabled = enabled;
    this.processingFee = processingFee;
    this.tariff = tariff;
    this.tariffPercentage = tariffPercentage;
    this.fromCurrency = fromCurrency;
    this.toCurrency = toCurrency;

    console.log("💱 Currency Converter Settings:", {
      enabled: this.isEnabled,
      processingFee: this.processingFee,
      tariff: this.tariff,
      tariffPercentage: this.tariffPercentage + "%",
      from: this.fromCurrency,
      to: this.toCurrency,
      site: window.location.hostname,
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
      if (activeElement && this.isInputElement(activeElement)) {
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
    // Only log if we're actually processing a valid input element
    if (this.isInputElement(event.target) && this.isEnabled) {
      console.log("🔍 Processing input on", window.location.hostname);
    }
    this.handleTextChange(event.target);
  }

  handleFocus(event) {
    if (this.isInputElement(event.target)) {
      this.handleTextChange(event.target);
    }
  }

  handleBlur(event) {
    this.hideTooltip();
  }

  handleKeyUp(event) {
    if (this.isInputElement(event.target)) {
      this.handleTextChange(event.target);
    }
  }

  handlePaste(event) {
    if (this.isInputElement(event.target)) {
      // Wait for paste to complete, then process
      setTimeout(() => {
        this.handleTextChange(event.target);
      }, 10);
    }
  }

  handleClick(event) {
    if (this.isInputElement(event.target)) {
      // Check if there's already text in the field
      setTimeout(() => {
        this.handleTextChange(event.target);
      }, 10);
    }
  }

  handleTextChange(element) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.processText(element);
    }, 300); // Increased debounce time to reduce excessive calls
  }

  isInputElement(element) {
    if (!element || !element.tagName) return false;

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
  }
});
