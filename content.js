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
    this.init();
  }

  async init() {
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
      position: absolute;
      background: #2d3748;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      white-space: nowrap;
      border: 1px solid #4a5568;
    `;
    document.body.appendChild(this.tooltip);
  }

  setupEventListeners() {
    // Listen to input events on all text inputs
    document.addEventListener("input", this.handleInput.bind(this), true);
    document.addEventListener("focus", this.handleFocus.bind(this), true);
    document.addEventListener("blur", this.handleBlur.bind(this), true);
    document.addEventListener("keyup", this.handleKeyUp.bind(this), true);

    // Handle dynamic content
    const observer = new MutationObserver(this.handleMutations.bind(this));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
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

  handleTextChange(element) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.processText(element);
    }, 150);
  }

  isInputElement(element) {
    return (
      element.tagName === "INPUT" ||
      element.tagName === "TEXTAREA" ||
      element.contentEditable === "true"
    );
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

    if (!element || !element.value) {
      this.hideTooltip();
      return;
    }

    const amount = this.extractAmount(element.value);

    if (amount) {
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
        console.warn("Failed to convert currency:", error);
      }
    } else {
      this.hideTooltip();
    }
  }

  showTooltip(element, fromAmount, toAmount, rate) {
    if (!this.tooltip) return;

    const rect = element.getBoundingClientRect();
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

    // Position tooltip
    const tooltipRect = this.tooltip.getBoundingClientRect();
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 5;

    // Adjust if tooltip goes off screen
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    if (top + tooltipRect.height > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - tooltipRect.height - 5;
    }

    this.tooltip.style.left = left + "px";
    this.tooltip.style.top = top + "px";
    this.tooltip.style.opacity = "1";
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

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    currencyConverter = new CurrencyConverter();
  });
} else {
  currencyConverter = new CurrencyConverter();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
