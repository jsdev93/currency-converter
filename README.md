# 💱 Live Currency Converter Chrome Extension

A powerful Chrome extension that provides real-time currency conversion with advanced filtering capabilities. Convert any number as you type with intelligent element targeting and comprehensive URL management.

## ✨ Features

### Core Functionality

- 🔄 **Real-time conversion**: Automatically detects numbers and shows currency conversion instantly
- 💱 **Multiple currencies**: Support for 10+ major currencies (JPY, USD, EUR, GBP, CNY, KRW, CAD, AUD, CHF, SGD)
- 🔧 **Flexible currency pairs**: Choose any "from" and "to" currency combination
- ⚡ **Live exchange rates**: Rates refresh every 5 minutes with offline caching
- 🎨 **Non-intrusive tooltips**: Clean, animated tooltips that don't disrupt your workflow

### Advanced Controls

- 💰 **Processing fee simulation**: Optional 5% processing fee for real-world scenarios
- 📊 **Custom tariff calculation**: Configurable tariff percentage (0-100%) for import/export calculations
- �️ **Easy toggle controls**: Quick enable/disable for all features
- 💾 **Persistent settings**: All preferences saved locally and sync across browser sessions

### Intelligent Filtering System

- � **URL Access Control**: Granular control over which websites can use the extension
  - Allow all URLs (default)
  - Allowlist specific domains only
  - Block specific domains
- 🎯 **Advanced Element Filtering**: Precise CSS selector-based targeting
  - Target specific input fields by class, ID, or attributes
  - Exclude unwanted elements (ads, popups, etc.)
  - Override URL settings with element-specific rules
- 🔒 **Privacy-focused**: Extension only activates on websites where you explicitly enable it

## 🚀 Installation

### Method 1: From Source (Developer Mode)

1. **Download/Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

### Method 2: Chrome Web Store

_Coming soon - extension will be available on the Chrome Web Store_

## 📖 How It Works

### Basic Operation

The Live Currency Converter uses a sophisticated content injection system that respects user privacy and security:

1. **On-Demand Activation**: The extension only activates on websites where you explicitly click the extension icon
2. **Real-Time Detection**: Once activated, it monitors text input events across all supported input elements
3. **Intelligent Parsing**: Detects numeric values and applies conversion using live exchange rates
4. **Smart Display**: Shows conversion tooltips positioned near your cursor without interfering with page content

### Advanced Filtering Architecture

#### URL Access Control System

The extension implements a three-tier URL filtering system:

```
┌─────────────────────────────────────┐
│           URL Filter Mode           │
├─────────────────────────────────────┤
│ 1. Allow All URLs (Default)         │
│    ├─ Extension works on any site   │
│    └─ Most permissive setting       │
│                                     │
│ 2. Allowlist Only                   │
│    ├─ Only works on specified URLs  │
│    ├─ Supports wildcards (*.site.com)│
│    └─ Maximum security              │
│                                     │
│ 3. Block Specific                   │
│    ├─ Works everywhere except       │
│    ├─ blocked URLs                  │
│    └─ Good for excluding ads/etc    │
└─────────────────────────────────────┘
```

#### CSS Selector Filtering System

For granular element control, the extension supports advanced CSS selector filtering:

```
┌─────────────────────────────────────┐
│       Element Filter Modes          │
├─────────────────────────────────────┤
│ 1. All Input Elements (Default)     │
│    ├─ Scans all input, textarea     │
│    ├─ contenteditable elements      │
│    └─ Standard behavior             │
│                                     │
│ 2. Specific Elements Only           │
│    ├─ Only targets CSS selectors    │
│    ├─ Examples: .price, #total      │
│    ├─ [data-currency], input.amount │
│    └─ Overrides URL settings        │
│                                     │
│ 3. Exclude Elements                 │
│    ├─ Works on all EXCEPT listed    │
│    ├─ Good for ads, popups          │
│    └─ Examples: .ad, #popup         │
└─────────────────────────────────────┘
```

### Processing Pipeline

1. **Event Detection**

   ```
   User Types → Input Event → Number Detection → Rate Lookup → Tooltip Display
   ```

2. **Filtering Flow**

   ```
   URL Check → Element Selector Check → Processing Fee → Tariff → Final Conversion
   ```

3. **Rate Management**
   ```
   API Call → Cache Storage → Fallback → Display (with 5min refresh cycle)
   ```

## 🎛️ Usage Guide

### Quick Start

1. **Navigate** to any website where you want currency conversion
2. **Click the extension icon** to activate and open settings
3. **Configure** your currency pair (From/To currencies)
4. **Enable conversion** using the main toggle
5. **Type any number** in supported input fields
6. **View conversion** in the automatic tooltip

### Advanced Configuration

#### Setting Up URL Filtering

```bash
# Example Allowlist Configuration
ebay.com
amazon.com
*.shopping-site.com
checkout.*.com

# Example Blocklist Configuration
chrome://
chrome-extension://
*.ads.com
*.popup.net
```

#### CSS Selector Examples

```css
/* Price-specific elements */
.price
#price-input
[data-price]
.currency-field

/* Advanced selectors */
input[type="number"].amount
.checkout .total-price
#cart-summary .price-value
[data-testid="price-input"]

/* Exclude unwanted elements */
.advertisement
.ad
#popup
.modal-overlay;
```

### Processing Fees & Tariffs

#### Processing Fee (5%)

- Simulates real-world payment processing costs
- Applied after base currency conversion
- Useful for e-commerce price calculations

#### Custom Tariff System

- Configurable percentage (0-100%)
- Applied after processing fee (if enabled)
- Useful for import/export cost calculations
- Example: 16.5% tariff on imported goods

#### Calculation Order

```
Base Amount → Currency Conversion → Processing Fee (+5%) → Tariff (+X%) → Final Amount
```

### Examples

#### Basic Conversion

```
Input: 1000 (JPY)
Output: $6.73 USD
```

#### With Processing Fee

```
Input: 1000 (JPY)
Base: $6.73 USD
Processing Fee: +$0.34 (5%)
Output: $7.07 USD
```

#### With Tariff (16.5%)

```
Input: 1000 (JPY)
Base: $6.73 USD
Processing: +$0.34 (5%) = $7.07
Tariff: +$1.17 (16.5%) = $8.24 USD
Output: $8.24 USD
```

## 🛠️ Technical Details

### Architecture Overview

The extension follows Chrome Manifest V3 best practices with a modular architecture:

```
┌─────────────────────────────────────┐
│            Extension Core           │
├─────────────────────────────────────┤
│ Background Service Worker           │ ← API calls & rate caching
│ ↕                                   │
│ Content Script (Injected)           │ ← DOM interaction & filtering
│ ↕                                   │
│ Popup Interface (popup.html/js)     │ ← User settings & controls
│ ↕                                   │
│ Chrome Storage API                  │ ← Settings & rate persistence
└─────────────────────────────────────┘
```

### Files Structure

```
live-currency-extension/
├── manifest.json          # Extension configuration & permissions
├── background.js          # Service worker for API calls & caching
├── content.js            # Content script for DOM interaction & filtering
├── styles.css            # Tooltip & overlay styling
├── popup.html            # Extension popup interface structure
├── popup.css             # Popup styling (separated for maintainability)
├── popup.js              # Popup functionality & settings management
├── icons/                # Extension icons (16px, 48px, 128px)
└── README.md            # Comprehensive documentation
```

### Key Technologies

- **Manifest V3**: Latest Chrome extension standard
- **Service Workers**: Background processing without persistent background pages
- **Content Script Injection**: Dynamic script loading for security
- **Chrome Storage API**: Synchronized settings across devices
- **CSS3 Animations**: Smooth tooltip transitions
- **Event Delegation**: Efficient event handling for dynamic content
- **Mutation Observers**: Real-time DOM change detection

### Exchange Rate API Integration

```javascript
// API Configuration
API Provider: exchangerate-api.com
Update Frequency: Every 5 minutes
Caching Strategy: Local storage with timestamp validation
Fallback System: Cached rates used if API unavailable
Rate Limiting: Respects free tier limits (1500 requests/month)
```

#### Rate Caching System

```
API Response → Validation → Local Storage → Content Script Access
     ↓              ↓            ↓              ↓
Live Rates → JSON Parse → Chrome.storage → Real-time Conversion
     ↓              ↓            ↓              ↓
Timestamp → Error Check → Expiry (5min) → Fallback Rates
```

### Security & Permissions

The extension follows **principle of least privilege** with minimal permissions:

| Permission                           | Purpose                  | Security Benefit                           |
| ------------------------------------ | ------------------------ | ------------------------------------------ |
| `storage`                            | Cache rates & settings   | Data stays local, no external transmission |
| `activeTab`                          | Inject content scripts   | Only works on tabs where user activates    |
| `scripting`                          | Dynamic script injection | No persistent background processes         |
| `https://api.exchangerate-api.com/*` | Fetch exchange rates     | Limited to specific API domain only        |

#### Privacy-First Design

- ✅ **No data collection**: Extension only processes text you type locally
- ✅ **No tracking**: No analytics, telemetry, or user behavior monitoring
- ✅ **Explicit activation**: Must manually enable on each website
- ✅ **Local storage only**: Settings and rates stored locally in browser
- ✅ **Minimal permissions**: Only essential permissions requested
- ✅ **Open source**: Full code available for security auditing

## 🔧 Development Guide

### Development Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd live-currency-extension

# Install development dependencies (optional - for linting/formatting)
npm install -g eslint prettier

# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer Mode
# 3. Click "Load unpacked" → Select project folder
# 4. Extension ready for development testing
```

### Development Workflow

#### Making Changes

1. **Edit source files** using your preferred IDE
2. **Save changes** - most changes are applied automatically
3. **Reload extension** in `chrome://extensions/` for manifest/background changes
4. **Refresh web pages** to test content script updates
5. **Check browser console** for any errors or debugging info

#### File-Specific Development Notes

| File                | Hot Reload | Requires Extension Reload | Notes                                  |
| ------------------- | ---------- | ------------------------- | -------------------------------------- |
| `popup.html/css/js` | ✅ Yes     | ❌ No                     | Changes apply when popup reopened      |
| `content.js`        | ✅ Yes     | ❌ No                     | Refresh webpage to see changes         |
| `styles.css`        | ✅ Yes     | ❌ No                     | Tooltip styles update immediately      |
| `background.js`     | ❌ No      | ✅ Yes                    | Service worker changes need reload     |
| `manifest.json`     | ❌ No      | ✅ Yes                    | Permissions/config changes need reload |

### Testing Strategy

#### Comprehensive Test Matrix

```bash
# Input Element Types
✓ <input type="text">     # Standard text inputs
✓ <input type="number">   # Number inputs with validation
✓ <textarea>              # Multi-line text areas
✓ [contenteditable]       # Rich text editors
✓ Dynamic inputs          # SPA-generated elements

# Website Types
✓ Static HTML sites       # Traditional websites
✓ Single Page Apps        # React, Vue, Angular apps
✓ E-commerce platforms    # Shopping sites with prices
✓ Banking/Finance sites   # Financial calculators
✓ Admin interfaces        # Business dashboards

# Browser Compatibility
✓ Chrome (primary)        # Main target browser
✓ Chromium-based          # Edge, Brave, Opera
✓ Different screen sizes  # Mobile responsive design
✓ High DPI displays       # Tooltip positioning accuracy
```

#### URL Filter Testing

```bash
# Test allowlist patterns
example.com              # Exact domain match
*.example.com           # Subdomain wildcards
shopping.*.com          # TLD wildcards
checkout.site.com       # Specific page paths

# Test blocklist patterns
chrome://               # Browser internal pages
chrome-extension://     # Extension pages
*.ads.com              # Ad network blocking
popup.*.net            # Popup domains
```

#### CSS Selector Testing

```css
/* Test basic selectors */
.price                  /* Class-based targeting */
#total-amount          /* ID-based targeting */
[data-price]           /* Attribute-based targeting */

/* Test complex selectors */
input[type="number"].currency    /* Multiple conditions */
.checkout .total .price-value    /* Nested elements */
#cart-summary > .price          /* Direct children */
:not(.advertisement)            /* Exclusion patterns */
```

## 🎨 Customization Guide

### Currency Configuration

#### Adding New Currencies

```javascript
// In popup.html - Add to currency selectors
<option value="NEW">🏳️ New Currency (NEW)</option>;

// In background.js - Add to supported currencies list
const SUPPORTED_CURRENCIES = ["JPY", "USD", "EUR", "GBP", "NEW"];

// Test API support for new currency
// Most major currencies supported by exchangerate-api.com
```

#### Changing Default Currency Pair

```javascript
// In popup.js - Update CONFIG.DEFAULTS
const CONFIG = {
  DEFAULTS: {
    fromCurrency: "EUR", // Change from JPY
    toCurrency: "GBP", // Change from USD
    // ... other defaults
  },
};
```

### API Provider Customization

#### Switching to Different Exchange Rate API

**Step 1: Update API Configuration**

```javascript
// In background.js - Replace API configuration
const API_CONFIG = {
  baseUrl: "https://api.new-provider.com/v1/rates",
  apiKey: "your-api-key-here", // If required
  updateInterval: 300000, // 5 minutes
  requestTimeout: 10000, // 10 seconds
};
```

**Step 2: Update Response Parser**

```javascript
// Update parseExchangeRates() function to match new API format
function parseExchangeRates(response) {
  // Adapt to new API response structure
  return {
    base_code: response.baseCurrency,
    conversion_rates: response.rates,
    // ... map other fields
  };
}
```

**Step 3: Update Manifest Permissions**

```json
{
  "host_permissions": ["https://api.new-provider.com/*"]
}
```

### UI/UX Customization

#### Tooltip Styling

```css
/* In styles.css - Customize tooltip appearance */
.currency-tooltip {
  background: linear-gradient(135deg, #your-color1, #your-color2);
  border-radius: 12px; /* Adjust roundness */
  font-family: "Your-Font"; /* Custom typography */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); /* Custom shadow */
}

/* Custom animations */
@keyframes customFadeIn {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
```

#### Popup Interface Themes

```css
/* In popup.css - Create custom themes */
.theme-dark {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: #eee;
}

.theme-light {
  background: linear-gradient(135deg, #f5f7fa, #c3cfe2);
  color: #333;
}

.theme-business {
  background: linear-gradient(135deg, #2c3e50, #34495e);
  color: #ecf0f1;
}
```

### Advanced Feature Customization

#### Custom Processing Rules

```javascript
// In content.js - Add custom processing logic
class CustomCurrencyProcessor {
  constructor() {
    this.customRules = [
      { pattern: /tax/i, multiplier: 1.08 }, // Add 8% tax
      { pattern: /shipping/i, addition: 5.99 }, // Add shipping fee
      { pattern: /discount/i, multiplier: 0.9 }, // Apply 10% discount
    ];
  }

  applyCustomRules(amount, elementContext) {
    let processedAmount = amount;

    this.customRules.forEach((rule) => {
      if (rule.pattern.test(elementContext)) {
        if (rule.multiplier) processedAmount *= rule.multiplier;
        if (rule.addition) processedAmount += rule.addition;
      }
    });

    return processedAmount;
  }
}
```

#### Regional Formatting

```javascript
// Add regional number formatting
const REGION_CONFIG = {
  US: { decimal: ".", thousands: "," },
  EU: { decimal: ",", thousands: "." },
  IN: { decimal: ".", thousands: "," }, // Indian numbering
};

function formatCurrency(amount, region = "US") {
  const config = REGION_CONFIG[region];
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    // Apply regional formatting rules
  });
}
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### Extension Not Activating

```bash
Problem: Extension icon clicked but nothing happens
Solutions:
✓ Check if "Enable Conversion" toggle is ON in popup
✓ Verify you're on a supported website (not chrome:// pages)
✓ Check URL filtering settings - might be blocked
✓ Look for console errors in Developer Tools (F12)
✓ Try refreshing the page after enabling
```

#### No Conversion Tooltips Appearing

```bash
Problem: Typing numbers but no tooltips show
Debugging Steps:
1. Open popup → Check "Enable Conversion" is active
2. Verify currency pair is properly selected
3. Check URL Access Control settings
4. Inspect Advanced Filters - CSS selectors might be blocking
5. Test in different input fields on the page
6. Check internet connection for rate updates
7. Look for JavaScript errors in console
```

#### Rate Updates Failing

```bash
Problem: Showing old exchange rates or "Loading..."
Solutions:
✓ Check internet connectivity
✓ Verify API host permissions in manifest.json
✓ Check background script console for API errors
✓ Try disabling/re-enabling extension
✓ Clear extension storage: chrome://extensions → Details → Storage
```

#### Advanced Filter Issues

```bash
Problem: CSS selectors not working as expected
Debugging:
1. Test selectors in browser console: document.querySelector('.your-selector')
2. Check for typos in selector syntax
3. Verify element actually exists when extension runs
4. Test with simpler selectors first (.class, #id)
5. Check selector priority (allowlist overrides everything)
```

### Debug Mode

Enable detailed logging by adding to console:

```javascript
// In browser console on any page where extension is active
localStorage.setItem("currency-debug", "true");
// Reload page to see detailed logs
```

### Performance Optimization

#### For High-Traffic Websites

```javascript
// Reduce update frequency for better performance
const PERFORMANCE_CONFIG = {
  updateInterval: 600000, // 10 minutes instead of 5
  debounceDelay: 500, // Slower response, less CPU
  maxTooltips: 3, // Limit simultaneous tooltips
};
```

#### For Low-End Devices

- Disable animations in styles.css
- Reduce tooltip update frequency
- Use simpler CSS selectors
- Limit concurrent API calls

### Browser Compatibility

| Browser    | Support Level | Notes                            |
| ---------- | ------------- | -------------------------------- |
| Chrome 88+ | ✅ Full       | Primary target, all features     |
| Edge 88+   | ✅ Full       | Chromium-based, works perfectly  |
| Brave      | ✅ Full       | Chromium-based, privacy-focused  |
| Opera      | ✅ Partial    | Some advanced features may vary  |
| Firefox    | ❌ None       | Different extension architecture |
| Safari     | ❌ None       | Different extension system       |

## 🔒 Privacy & Security

### Data Handling Policy

- ✅ **Zero data collection**: No personal information stored or transmitted
- ✅ **Local-only processing**: All conversion calculations happen locally
- ✅ **No tracking**: No analytics, telemetry, or behavior monitoring
- ✅ **Minimal API calls**: Only exchange rate requests to public API
- ✅ **No third-party services**: Direct API calls only, no intermediaries

### Security Measures

- 🛡️ **Content Security Policy**: Strict CSP prevents XSS attacks
- 🛡️ **Minimal permissions**: Only essential permissions requested
- 🛡️ **No external resources**: All assets bundled with extension
- 🛡️ **Explicit activation**: Manual activation prevents unauthorized usage
- 🛡️ **Input validation**: All user input sanitized and validated

### Open Source Transparency

- 📖 **Full source available**: Complete code accessible for auditing
- 📖 **No obfuscation**: Readable, well-documented code
- 📖 **Community driven**: Issues and contributions welcome
- 📖 **Regular updates**: Security patches and improvements

## 📄 License & Legal

### MIT License

```
Copyright (c) 2025 Live Currency Converter Extension

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

[Full MIT License text...]
```

### Third-Party Services

- **Exchange Rate API**: [exchangerate-api.com](https://exchangerate-api.com) - Free tier with attribution
- **Chrome Extensions API**: Google Chrome platform - Standard usage terms

## 🤝 Contributing

### Development Contribution

1. **Fork the repository** on GitHub
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow code standards**: Use ESLint and Prettier configurations
4. **Add tests**: Include test cases for new functionality
5. **Update documentation**: Keep README and code comments current
6. **Submit pull request**: Detailed description of changes

### Bug Reports & Feature Requests

- **Use GitHub Issues** for bug reports and feature requests
- **Include details**: Browser version, OS, reproduction steps
- **Attach screenshots**: Visual issues need visual context
- **Check existing issues**: Avoid duplicates

### Translation & Localization

- Help translate the extension to other languages
- Contribute regional currency formatting rules
- Add support for local number formats

## 📞 Support & Community

### Getting Help

- 📖 **Documentation**: Start with this comprehensive README
- 🐛 **Bug Reports**: Use GitHub Issues for technical problems
- 💡 **Feature Requests**: Suggest improvements via GitHub Issues
- 💬 **Discussions**: Use GitHub Discussions for general questions

### Roadmap

- [ ] **Chrome Web Store**: Official store distribution
- [ ] **Multi-language support**: UI translations
- [ ] **More currencies**: Expand currency support
- [ ] **Advanced calculations**: Investment returns, compound interest
- [ ] **Export functionality**: Save conversion history
- [ ] **Team collaboration**: Shared settings across teams

---

## ⚠️ Important Notes

- **API Limitations**: Free tier limited to 1,500 requests/month
- **Rate Accuracy**: Exchange rates updated every 5 minutes
- **Browser Support**: Requires Chrome 88+ or compatible Chromium browser
- **Performance**: Optimized for modern web applications and SPAs
- **Security**: Extension only activates where explicitly enabled by user

**For production usage with high volume, consider upgrading to paid API tier for guaranteed uptime and higher rate limits.**
