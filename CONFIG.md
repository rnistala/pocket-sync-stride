# Configuration Guide

## API Configuration

The application's API root URL is configurable via the `config.json` file located in the root of the distribution folder.

### Configuration File Location

When you build and deploy the application, ensure that `config.json` is placed in the same directory as the `index.html` file.

### Configuration Format

Edit the `public/config.json` file before building, or edit `config.json` in the distribution folder after building:

```json
{
  "apiRoot": "https://demo.opterix.in"
}
```

Replace `https://demo.opterix.in` with your API server URL.

### Important Notes

1. **No trailing slash**: Do not include a trailing slash in the API root URL
2. **Protocol required**: Always include `https://` or `http://` in the URL
3. **Multiple instances**: Each deployment folder can have its own `config.json` with different API endpoints

### Deployment in Different Folders

The application is designed to work from any folder path. You can copy the entire distribution to different folders (e.g., `/app1/`, `/app2/`, etc.) and each instance will work independently with its own configuration.

### Example Configurations

**Production API:**
```json
{
  "apiRoot": "https://api.production.com"
}
```

**Staging API:**
```json
{
  "apiRoot": "https://api.staging.com"
}
```

**Local Development:**
```json
{
  "apiRoot": "http://localhost:3000"
}
```

### After Configuration Changes

No rebuild is required! Simply:
1. Edit the `config.json` file in your deployment folder
2. Refresh the application in the browser
3. The new API root will be loaded automatically
