---
name: run-voicetaskapp
description: Run, build, launch, start, screenshot, verify, or test the VoiceTask PWA app
---

# run-voicetaskapp

VoiceTask is a React + Vite PWA. Drive it with Playwright's Chromium (global install at `/opt/node22`).
No `chromium-cli` available in this container — use the inline script below instead.

## Prerequisites

No extra installs needed. Playwright is at `/opt/node22/lib/node_modules/playwright`.
Chromium binary is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

## Build

```bash
cd /home/user/VoiceTaskApp
npm run build   # tsc + vite build → dist/
```

## Run (agent path)

### 1. Start dev server

```bash
cd /home/user/VoiceTaskApp
pkill -f "vite" 2>/dev/null; sleep 1
npm run dev -- --port 5173 &
echo $! > /tmp/vta-dev.pid
until curl -sf http://localhost:5173 >/dev/null 2>&1; do sleep 1; done
echo "ready"
```

Vite falls back to 5174 if 5173 is taken — check which port it printed.

### 2. Drive with Playwright

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node -e "
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu'], headless: true });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();

  // Inject auth + skip onboarding — the app uses localStorage
  await p.addInitScript(() => {
    localStorage.setItem('vt_user', JSON.stringify({ email: 'test@test.com' }));
    localStorage.setItem('vt_onboarding_done', '1');
  });

  await p.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 15000 });
  await p.waitForTimeout(800);
  await p.screenshot({ path: '/tmp/vta-screen.png' });

  // Example: click a nav tab
  // await p.click('text=יעדים');
  // await p.waitForTimeout(500);
  // await p.screenshot({ path: '/tmp/vta-goals.png' });

  await b.close();
  console.log('done — screenshot at /tmp/vta-screen.png');
})().catch(e => { console.error(e.message); process.exit(1); });
"
```

Screenshots land at the path you specify. Use `/tmp/vta-*.png`.

### 3. Stop

```bash
kill $(cat /tmp/vta-dev.pid 2>/dev/null); rm -f /tmp/vta-dev.pid
```

## Auth

The app uses `localStorage` only. No backend. Inject before `goto`:

```javascript
await p.addInitScript(() => {
  localStorage.setItem('vt_user', JSON.stringify({ email: 'test@test.com' }));
  localStorage.setItem('vt_onboarding_done', '1');
});
```

Without this, the page shows the login screen instead of HomeScreen.

## Run (human path)

```bash
cd /home/user/VoiceTaskApp
npm run dev
# open http://localhost:5173 in browser
```

## Gotchas

- **Vite port conflict**: If port 5173 is in use, Vite auto-increments to 5174. Check the console output for the actual port.
- **`waitUntil: 'networkidle'`** works for initial load. For tab switches, use `waitForTimeout(500)` after clicking — the tab-in animation is 380ms.
- **RTL layout**: The app is Hebrew/RTL. Filter tabs appear right-to-left. The nav bar order from right to left is: פרופיל, הרגלים, home, יעדים, AI.
- **Animations**: The app has entrance animations (app-launch ~450ms, tab-in ~380ms). Add `waitForTimeout(500)` after navigation before screenshotting.
- **No `chromium-cli`**: The `chromium-cli` tool is not available. Use the Playwright Node.js snippet above.
- **Playwright version mismatch**: The local `node_modules/playwright` (v1.40) can't find its browser. Use the global at `/opt/node22/lib/node_modules/playwright` with `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`.
