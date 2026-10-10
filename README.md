# AmmaPlate - Home-cooked meal ordering app (PWA)

E-Business Management, Assignment 2. A mobile-first Progressive Web App built with plain HTML, CSS and JavaScript. No build step, no database server, no API keys.

## Technology (why this stack)
- **HTML/CSS/JavaScript PWA**: allowed by the assignment, runs on any phone browser, can be "installed" to the home screen, and deploys free as a static site.
- **localStorage** is the database (name, cart, orders, reviews, points). Data stays on the user's device.
- **No environment variables** are needed. There are no secret keys anywhere in the code.

## Folder structure
```
ammaplate/
  index.html            page shell
  style.css             all styling
  app.js                all screens and logic
  sw.js                 service worker (offline cache)
  manifest.webmanifest  PWA install info
  icon.svg              app icon
```

## Run locally
1. Install Python 3 (or Node.js).
2. Open a terminal inside the `ammaplate` folder.
3. Run `python -m http.server 8000` (or `npx serve`).
4. Open http://localhost:8000 in Chrome. Press F12, then the phone icon, to see the mobile view.

## What is real and what is simulated
| Feature | Status |
|---|---|
| Catalogue, search, categories, cart, coupons, loyalty points, order history, reviews, admin analytics | Real, working (data in browser storage) |
| UPI / card payment | **Simulated.** Validated (UPI format, Luhn check, expiry, CVV) but nothing is charged and card data is never stored |
| Order status updates and notifications | **Simulated** (auto-advance every 10 s; the owner can also advance it in Admin) |
| WhatsApp / call buttons | Real links, but the number is a demo number. Change `SUPPORT_PHONE` in `app.js` |
| Admin PIN (1234) | Demo only. A real product needs server-side login |

## Deploy (Netlify, free) - step by step
1. Create a new repository on GitHub (for example `ammaplate`). Choose Public.
2. Click **Add file > Upload files**, drag in all 6 files from the `ammaplate` folder (not the folder itself), then **Commit changes**.
3. Go to https://app.netlify.com and sign in with GitHub.
4. Click **Add new site > Import an existing project > GitHub**, then choose the `ammaplate` repository.
5. Build settings: **Build command: leave empty. Publish directory: `.` (or leave empty).** No environment variables.
6. Click **Deploy**. After about 30 seconds you get a link like `https://something.netlify.app`.
7. Optional: **Site configuration > Change site name** to make a neater link.
8. Open the link on your phone. Test: sign up, order, pay, track, rate.

(Vercel works the same way: Add New > Project > import the repo > Framework Preset "Other" > Deploy.)

## QR code (after you have the real live link)
1. Open https://www.qr-code-generator.com or any free generator (or tell me the URL and I will generate a PNG for you).
2. Paste your **https://...netlify.app** link (not localhost).
3. Download as **PNG**.
4. Scan it with your phone camera. It must open the live app. If it does not, the link is wrong.
5. In Word: Insert > Pictures > select the PNG, and add the caption "Figure X: QR code for AmmaPlate".

## Troubleshooting
- **Blank page after deploy**: make sure `index.html` is at the top level of the repo, not inside a sub-folder.
- **Old version shows after an update**: the service worker cached it. Hard refresh (Ctrl+Shift+R) or clear site data.
- **Page not found on Netlify**: set Publish directory to `.` and redeploy.
- **Data disappeared**: browser storage was cleared or you used private mode.
- **Install button not showing**: PWA install needs https (the deployed link), not localhost over plain http on a phone.
