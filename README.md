# Live Currency Converter Chrome Extension

A Chrome extension that shows real-time currency conversion between multiple currencies as you type numbers in any text field.

## Features

- 🔄 **Real-time conversion**: Automatically detects numbers and shows currency conversion
- 💱 **Multiple currencies**: Support for JPY, USD, EUR, GBP, CNY, KRW, CAD, AUD, CHF, SGD
- 🔧 **Currency selection**: Choose any "from" and "to" currency pair
- 💰 **Processing fee**: Optional 5% processing fee simulation
- ⚡ **Live updates**: Exchange rates refresh every 5 minutes
- 🎯 **Smart detection**: Works in any text input field across all websites
- 🎨 **Clean UI**: Non-intrusive tooltip display with smooth animations
- 💾 **Offline support**: Cached rates work even when offline
- ⚙️ **Easy controls**: Toggle on/off and settings via popup interface

## Installation

### From Source (Developer Mode)

1. **Download/Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

### Usage

1. **Click the extension icon** to open the popup
2. **Select your currencies**: Choose "From" and "To" currencies
3. **Enable conversion** using the toggle switch
4. **Optional**: Enable 5% processing fee simulation
5. **Type any number** in text fields on websites
6. **See conversion** appear in a tooltip automatically

### Supported Features

- **Currency Selection**: Choose from 10+ major currencies
- **Any Number Detection**: Converts any number you type (treats as "from" currency)
- **Processing Fee**: Optional 5% fee calculation for real-world scenarios
- **Currency Formats**: Recognizes ¥, $, €, £ symbols and currency codes
- **Smart Positioning**: Tooltip appears near your cursor without blocking content

### Screenshots

_Add screenshots of the extension in action here_

## Technical Details

### Files Structure

```
live-currency-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for API calls
├── content.js            # Content script for page interaction
├── styles.css            # Tooltip styling
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── icons/                # Extension icons
└── README.md            # This file
```

### API Usage

- **Exchange Rate API**: Uses exchangerate-api.com (free tier)
- **Update Frequency**: Every 5 minutes
- **Caching**: Rates cached locally for offline use
- **Fallback**: Default rate if API unavailable

### Permissions

- `activeTab`: To inject content scripts
- `storage`: To cache exchange rates and settings
- `background`: For the service worker
- `https://api.exchangerate-api.com/*`: To fetch exchange rates

## Development

### Setup Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd live-currency-extension

# The extension is ready to load in Chrome developer mode
```

### Making Changes

1. **Edit the source files** as needed
2. **Reload the extension** in Chrome extensions page
3. **Test on various websites** with different input types

### Testing

Test the extension on websites with:

- Regular text inputs
- Number inputs
- Textareas
- Contenteditable elements
- Dynamic content (SPA websites)

## Customization

### Change Currency Pair

To convert from a different currency (not JPY), modify:

1. **background.js**: Update `baseUrl` and currency patterns
2. **content.js**: Update `extractYenAmount()` patterns
3. **manifest.json**: Update extension name and description

### Change API Provider

To use a different exchange rate API:

1. **Update background.js**: Change API endpoint and response parsing
2. **Update manifest.json**: Change host permissions
3. **Test rate limiting**: Ensure API limits are respected

### Styling

Modify `styles.css` to change:

- Tooltip appearance
- Colors and fonts
- Animations and positioning
- Responsive behavior

## Troubleshooting

### Extension Not Working

- Check if extension is enabled in popup
- Verify Developer Mode is enabled
- Check browser console for errors
- Try reloading the extension

### No Conversion Showing

- Ensure text matches supported formats
- Check internet connection for rate updates
- Verify the input field is supported (some fields may be blocked)

### Rate Not Updating

- Check API connectivity
- Verify host permissions in manifest
- Check background script console for errors

## Privacy

- **No personal data collected**: Extension only processes text you type
- **No data transmitted**: Only exchange rate API calls made
- **Local storage only**: Settings and rates stored locally in browser

## License

MIT License - feel free to modify and distribute.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and feature requests, please create an issue in the repository.

---

**Note**: This extension uses a free tier API which may have rate limits. For production use, consider upgrading to a paid API plan.
