# botframework-webchat-embed

Embed BotFramework WebChat into any HTML page using data attributes. No JavaScript knowledge required.

![Screenshot](docs/screenshot.png)

## Quick Start

```html
<!-- 1. Add a container with your token endpoint URL -->
<div
  style="width: 400px; height: 600px;"
  data-webchat-token-url="https://your-server.com/api/directline/token">
</div>

<!-- 2. Load the script -->
<script src="https://cdn.jsdelivr.net/npm/botframework-webchat-embed@latest"></script>
```

That's it! The script automatically finds elements with `data-webchat-token-url` and renders a chat widget.

## Features

- **Zero JavaScript required** - Configure everything via HTML data attributes
- **Floating chat bubble** - Starts minimized with a customizable button
- **Auto-inherits styles** - Picks up your site's CSS variables and fonts
- **Restart conversation** - Built-in button to start fresh
- **Fully customizable** - Control colors, fonts, and WebChat styleOptions

## Supported Attributes

### Required

| Attribute | Description |
|-----------|-------------|
| `data-webchat-token-url` | URL to fetch Direct Line token |

### Widget Behavior

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-webchat-title` | `"Chat"` | Header title text |
| `data-webchat-bubble-text` | *(icon only)* | Text on the floating bubble button |
| `data-webchat-minimized` | `true` | Start minimized (show bubble) |
| `data-webchat-preload` | `false` | Load conversation on page load (even if minimized) |
| `data-webchat-send-start-event` | `true` | Send `startConversation` event to trigger welcome message |

### User Identity

| Attribute | Description |
|-----------|-------------|
| `data-webchat-user-id` | User ID for conversation |
| `data-webchat-username` | Display name for user |
| `data-webchat-locale` | Language locale (e.g., `en-US`) |

### Styling

| Attribute | Description |
|-----------|-------------|
| `data-webchat-header-background` | Header/bubble background color |
| `data-webchat-header-color` | Header/bubble text color |
| `data-webchat-style-options` | Reference to global styleOptions object |
| `data-webchat-style-*` | Any WebChat styleOption (kebab-case) |

## Style Inheritance

The widget automatically inherits styles from your page:

### CSS Variables (auto-detected)

```css
:root {
  --primary-color: #0078d4;  /* Used for header/accent */
  --border-radius: 12px;     /* Used for bubble roundness */
}
```

Checked variable names (in order): `--primary-color`, `--accent-color`, `--brand-color`, `--color-primary`, `--theme-primary`

### Font Inheritance

The widget inherits `font-family` from its container element automatically.

### styleOptions Object

For advanced styling, reference a global object:

```html
<script>
  window.myStyles = {
    bubbleBackground: '#f0f0f0',
    bubbleFromUserBackground: '#0078d4',
    bubbleFromUserTextColor: '#ffffff',
    accent: '#0078d4'
  };
</script>
<div data-webchat-style-options="myStyles" ...></div>
```

### Individual Style Attributes

Override specific styles with `data-webchat-style-*` attributes:

```html
<div
  data-webchat-style-accent-color="#ff0000"
  data-webchat-style-bubble-border-radius="8"
  data-webchat-style-hide-upload-button="true"
  ...>
</div>
```

See [WebChat styleOptions](https://github.com/microsoft/BotFramework-WebChat/blob/main/packages/api/src/StyleOptions.ts) for all available options.

## Style Priority

1. **Auto-detected** (CSS variables, computed font) - lowest
2. **`data-webchat-style-options`** object - overrides auto-detected
3. **`data-webchat-style-*`** attributes - highest priority

## Container Sizing

You control the widget size via CSS on the container element:

```html
<!-- Fixed position chat widget -->
<style>
  .chat-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 380px;
    height: 550px;
  }
</style>
<div class="chat-widget" data-webchat-token-url="..."></div>
```

## CDN Links

```html
<!-- jsDelivr (recommended) -->
<script src="https://cdn.jsdelivr.net/npm/botframework-webchat-embed@latest"></script>

<!-- unpkg -->
<script src="https://unpkg.com/botframework-webchat-embed"></script>

<!-- Specific version -->
<script src="https://cdn.jsdelivr.net/npm/botframework-webchat-embed@1.0.0"></script>
```

## Programmatic API

For advanced use cases:

```javascript
// Re-initialize all containers
window.WebChatEmbed.init();

// Initialize a specific element
const el = document.getElementById('my-chat');
window.WebChatEmbed.initElement(el);
```

## License

MIT License - See [LICENSE](LICENSE) file.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Disclaimer

This project is provided as-is with no warranty. Use at your own risk.
