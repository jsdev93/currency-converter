// Content script for real-time currency conversion
class CurrencyConverter {
  constructor() {
    this.tooltip = null;
    this.isEnabled = true;
    this.processingFee = false;
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
      fromCurrency = "JPY",
      toCurrency = "USD",
    } = await chrome.storage.local.get([
      "enabled",
      "processingFee",
      "fromCurrency",
      "toCurrency",
    ]);

    this.isEnabled = enabled;
    this.processingFee = processingFee;
    this.fromCurrency = fromCurrency;
    this.toCurrency = toCurrency;

    console.log("💱 Currency Converter Settings:", {
      enabled: this.isEnabled,
      processingFee: this.processingFee,
      from: this.fromCurrency,
      to: this.toCurrency,
      site: window.location.hostname,
    });

    if (this.isEnabled) {
      this.setupEventListeners();
      this.createTooltip();
      this.createDebugIndicator();
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
      white-space: nowrap !important;
      border: 2px solid #4299e1 !important;
      backdrop-filter: blur(8px) !important;
      max-width: 300px !important;
    `;
    document.body.appendChild(this.tooltip);
    console.log("✅ Currency Converter: Tooltip created and added to DOM");
  }

  createDebugIndicator() {
    // Create a small debug indicator to show the extension is active
    const indicator = document.createElement("div");
    indicator.id = "currency-converter-debug";
    indicator.textContent = "💱";
    indicator.style.cssText = `
      position: fixed !important;
      top: 10px !important;
      right: 10px !important;
      background: #4CAF50 !important;
      color: white !important;
      padding: 5px 8px !important;
      border-radius: 12px !important;
      font-size: 12px !important;
      z-index: 2147483647 !important;
      font-family: Arial, sans-serif !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
      cursor: pointer !important;
    `;
    indicator.title = `Currency Converter Active\nFrom: ${
      this.fromCurrency
    }\nTo: ${this.toCurrency}\nFee: ${this.processingFee ? "5%" : "None"}`;

    // Click to test conversion and show tooltip
    indicator.addEventListener("click", () => {
      const testAmount = 1000;
      console.log(
        `🧪 Testing conversion: ${testAmount} ${this.fromCurrency} → ${this.toCurrency}`
      );
      this.testConversion(testAmount);
      this.showTestTooltip();
    });

    document.body.appendChild(indicator);

    // Remove indicator after 5 seconds
    setTimeout(() => {
      if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 5000);
  }

  async testConversion(amount) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "convertCurrency",
        amount: amount,
        fromCurrency: this.fromCurrency,
        toCurrency: this.toCurrency,
      });

      console.log("🧪 Test conversion result:", response);

      if (response && !response.error) {
        // Show test tooltip
        const testDiv = document.createElement("div");
        testDiv.style.cssText =
          "position: fixed; top: 50px; right: 10px; background: orange; color: white; padding: 10px; border-radius: 4px; z-index: 2147483647;";
        testDiv.innerHTML = `TEST: ${amount} ${
          this.fromCurrency
        } → ${response.toAmount.toFixed(2)} ${this.toCurrency}`;
        document.body.appendChild(testDiv);
        setTimeout(() => testDiv.remove(), 3000);
      }
    } catch (error) {
      console.error("🧪 Test conversion failed:", error);
    }
  }

  showTestTooltip() {
    if (!this.tooltip) {
      console.error("❌ Tooltip element not found!");
      return;
    }

    console.log("🧪 Showing test tooltip");

    this.tooltip.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 2px;">
        TEST: ¥1,000 → $6.70
      </div>
      <div style="font-size: 12px; opacity: 0.8;">
        Rate: 1 JPY = 0.006700 USD
      </div>
    `;

    // Position tooltip in center of screen for testing
    this.tooltip.style.left = "50%";
    this.tooltip.style.top = "50%";
    this.tooltip.style.transform = "translate(-50%, -50%)";
    this.tooltip.style.position = "fixed";
    this.tooltip.style.opacity = "1";

    console.log("✅ Test tooltip should be visible now");

    // Hide after 3 seconds
    setTimeout(() => {
      this.hideTooltip();
    }, 3000);
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
    if (textContent === this.lastProcessedText && element === this.lastProcessedElement) {
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

    // Apply 5% processing fee if enabled
    let finalToAmount = toAmount;
    if (this.processingFee) {
      finalToAmount = toAmount * 1.05; // Add 5% fee
    }

    const formattedTo = this.formatCurrency(finalToAmount, this.toCurrency);

    let tooltipContent = `
      <div style="font-weight: 600; margin-bottom: 2px;">
        ${formattedFrom} → ${formattedTo}
      </div>
      <div style="font-size: 12px; opacity: 0.8;">
        Rate: 1 ${this.fromCurrency} = ${rate.toFixed(6)} ${this.toCurrency}
      </div>`;

    // Show fee breakdown if processing fee is enabled
    if (this.processingFee) {
      const formattedBase = this.formatCurrency(toAmount, this.toCurrency);
      const formattedFee = this.formatCurrency(
        toAmount * 0.05,
        this.toCurrency
      );
      tooltipContent += `
      <div style="font-size: 11px; opacity: 0.7; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 4px;">
        Base: ${formattedBase} + Fee: ${formattedFee} (5%)
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
  }
});
