# 5.55 Client - Official Web Source

This repository contains the complete website source for **5.55 Client** ready for instant Netlify and Vercel deployment.

## Deploying on Netlify

### Automated Build Settings:
- **Build command:** `npm run build`
- **Publish directory:** `dist`

### Netlify Configuration (`netlify.toml` included):
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Instant 1-Click Upload to GitHub:
Double-click `upload-to-github.bat` in this folder to automatically push all files and folders directly to `https://github.com/rookeh4-lab/5.55-web`.
