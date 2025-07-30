# CDN Integration for Webflow

## jsDelivr CDN URLs

Once your repository is pushed to GitHub, you can use these URLs in your Webflow project:

### Main Assets

- **JavaScript**: `https://cdn.jsdelivr.net/gh/vadim10105/mindful-start-guide@main/dist/assets/index.js`
- **CSS**: `https://cdn.jsdelivr.net/gh/vadim10105/mindful-start-guide@main/dist/assets/index.css`

### Static Assets (if needed)
- **Logo**: `https://cdn.jsdelivr.net/gh/vadim10105/mindful-start-guide@main/dist/logo.svg`
- **Favicon**: `https://cdn.jsdelivr.net/gh/vadim10105/mindful-start-guide@main/dist/favicon.ico`

## How to Use in Webflow

1. **In Webflow Designer**:
   - Go to Pages → Page Settings → Custom Code
   - Add in `<head>` section:
     ```html
     <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/vadim10105/mindful-start-guide@main/dist/assets/index.css">
     ```
   - Add before `</body>`:
     ```html
     <script src="https://cdn.jsdelivr.net/gh/vadim10105/mindful-start-guide@main/dist/assets/index.js"></script>
     ```

2. **For React Components**:
   - Add a div with id="root" where you want your React app to mount
   - The JavaScript will automatically find and use this div

## Workflow

1. **Develop locally**: Make changes to your React app
2. **Commit & push**: Push to your main branch on GitHub
3. **Auto-build**: GitHub Actions will automatically build and commit dist files
4. **CDN update**: jsDelivr will serve the new files (cache refreshes every 12 hours)
5. **Webflow updates**: Your Webflow site automatically gets the latest version

## Cache Management

- jsDelivr caches files for 12 hours
- After 12 hours, it checks GitHub for updates
- For immediate updates during development, you can append `?v=timestamp` to URLs
- Example: `...index.js?v=20250130001`

## CORS & Security

- jsDelivr automatically handles CORS headers
- Files are served with appropriate headers for web integration
- Webflow's password protection works independently of CDN assets