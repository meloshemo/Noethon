# Noethon Website

Static website package for Noethon.

## Files
- index.html
- styles.css
- script.js
- assets/noethon-logo.svg
- assets/favicon.svg
- netlify.toml
- vercel.json

## Publish Options
- Netlify drag-and-drop deploy
- Vercel static site deploy
- GitHub Pages
- Any standard static hosting provider

## Quick Local Preview
Open index.html in a browser or serve the folder with any static file server.

## Deployment
- Netlify: create a new site and set the publish directory to this folder.
- Vercel: import as a static site; vercel.json is included.
- GitHub Pages: publish the contents of this folder from the repository root or docs.

## Recommended Path
GitHub Pages is the best fit for the current stage because:
- the site is fully static
- you already use GitHub-based publishing
- you can attach a custom domain later without changing the project structure
- the repo can stay simple with no build step

## GitHub Pages Setup
1. Create a new GitHub repository, for example `noethon-website`.
2. Upload the full contents of this folder to the repository root.
3. Push to the `main` branch.
4. In GitHub, open `Settings > Pages`.
5. Under `Build and deployment`, select `GitHub Actions`.
6. The included workflow will publish the site automatically.

## Google Search Console
1. Open Google Search Console and choose `URL prefix`.
2. Enter `https://meloshemo.github.io/Noethon/`.
3. Use the HTML file or HTML tag verification method that Google provides.
4. After verification, submit `https://meloshemo.github.io/Noethon/sitemap.xml` in the `Sitemaps` section.
5. Use `URL Inspection` to request indexing for the homepage.
6. When you move to a custom domain later, add the new domain as a separate property and submit a new sitemap.

## Domain Later
- Keep publishing with the default GitHub Pages URL for now.
- When you buy the domain, add a `CNAME` file and update GitHub Pages custom domain settings.
- If you later move to Vercel or Netlify, the site structure can stay almost exactly the same.

## Custom Domain
- Current custom domain target: `noethon.com`
- GitHub Pages will use the included `CNAME` file during deployment.
- After DNS is configured, set the custom domain in `Settings > Pages` and enable HTTPS.

## Notes
- Replace hello@noethon.com with the final working address.
- Add the final claimed LinkedIn/social links before publishing.
- Add analytics and cookie/privacy pages if needed before production launch.
