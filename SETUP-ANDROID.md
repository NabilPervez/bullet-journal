# Publishing Digital Bullet Journal on Google Play

This walks you through turning the live web app into an Android app on the Play Store, start to
finish, assuming you have never done it before. Work through it top to bottom and tick things off.

**Time:** about 2–3 hours of your own time spread over a few days, most of it filling in Play
Console forms. Google's review then takes anywhere from a few hours to about a week.

---

## How this works, in one paragraph

The Android app is a thin shell called a **Trusted Web Activity (TWA)**. When someone opens it, it
opens `https://bullet-journal-app.netlify.app` full-screen in Chrome, with no address bar, so it looks
and feels like a native app. **Bubblewrap** is Google's tool that generates that shell for you. For
Chrome to trust the shell enough to hide the address bar, your website must publish a file,
`/.well-known/assetlinks.json`, containing the digital fingerprint of the key that signed the app.
Most of the steps below exist to get those two sides to agree.

Because the app loads your live website, **every web deploy updates the Android app immediately.**
You only rebuild and re-upload to Play when the app's name, icon, colours or Android settings change.

---

## What's already been done in the repo

- [x] The web manifest has everything Bubblewrap needs: name, short name, `start_url` and `scope` at
      the site root, `display: standalone`, theme and background colours, a stable `id`, and icons at
      192×192, 512×512 and 512×512 maskable.
- [x] New on-brand icons (the old ones were the pre-redesign cream artwork) and Android shortcut
      icons for Today, Week, Month and Future.
- [x] The service worker precaches the app, falls back to it offline, and now also caches the fonts so
      the app looks right offline.
- [x] `public/.well-known/assetlinks.json` exists, with placeholders for the fingerprints you'll paste
      in later.
- [x] `netlify.toml` serves that file as `application/json`. Before this change the site answered that
      URL with the app's HTML page, which would have made the Android app show an address bar.
- [x] A privacy policy at `/privacy`, linked from Settings, which Play requires.
- [x] Play Store graphics: `store-assets/android/play-icon-512.png` and
      `store-assets/android/feature-graphic-1024x500.png`.
- [x] `npm run twa:check` — checks the live site against everything above and tells you exactly what's
      still wrong.
- [x] `.gitignore` blocks signing keys from ever being committed.

---

## Decide these first — some can never be changed

| Decision | Recommended | Can it change later? |
| --- | --- | --- |
| **Package name** (the app's permanent ID on Play) | `com.nabilpervezconsulting.bulletjournal` | **No, never.** Once uploaded it's permanent. |
| **App name** (shown on Play) | `Digital Bullet Journal` | Yes |
| **Launcher name** (under the icon on a phone) | Something ≤ 12 characters, e.g. `Bullet Journal` may show as "Bullet Journ…" on some phones. Consider `BuJo` or `Journal`. | Yes, with a new build |
| **Orientation** | `default` (any). The app already has phone, tablet and desktop layouts. The web manifest currently says `portrait-primary`, which would lock tablets and Chromebooks to portrait. | Yes, with a new build |

> If you choose a **different package name**, change it in
> `public/.well-known/assetlinks.json` too (and `EXPECTED_PACKAGE` in `scripts/check-twa.mjs`). The
> two must match character for character.

---

## Part A — Get the website ready (15 minutes)

1. ~~Put your contact email in the privacy policy.~~ Done — the policy lists
   NABILPERVEZCONSULTING@GMAIL.COM.
2. **Merge this branch** (`android-twa`) into `main` on GitHub. Netlify deploys `main` automatically.
3. Wait for the deploy to finish (about a minute), then run:

   ```bash
   npm run twa:check
   ```

   **Expected result:** everything passes except one failure — the fingerprint placeholders in
   `assetlinks.json`. That's correct at this stage; you'll fill them in during Part D.

   If `/privacy` or `assetlinks.json` fails with "text/html" or "app shell", stop and tell me — it
   means Netlify isn't honouring the new rules.

---

## Part B — Install the tools (20–40 minutes, mostly downloading)

You already have Node.js. Bubblewrap needs Java 17 and the Android SDK too, but **it downloads both
for you** the first time it runs — don't install them separately.

1. Open **PowerShell** (not inside VS Code's OneDrive project folder — anywhere is fine).
2. Install Bubblewrap:

   ```bash
   npm install -g @bubblewrap/cli
   ```

3. Check it worked:

   ```bash
   bubblewrap --version
   ```

---

## Part C — Create the Android project (15 minutes)

### C1. Make a folder *outside* the repo and *outside* OneDrive

The signing key will live in this folder. Keeping it out of the repo means it can't be committed;
keeping it out of OneDrive means it isn't quietly copied to the cloud.

```bash
mkdir C:\Users\perve\bullet-journal-android
cd C:\Users\perve\bullet-journal-android
```

### C2. Run init

```bash
bubblewrap init --manifest=https://bullet-journal-app.netlify.app/manifest.webmanifest
```

**First run only:** it asks whether to install the JDK and the Android SDK. Answer **Yes** to both and
accept the Android SDK licence. This is the slow part.

Then it reads the manifest and asks a series of questions. Most answers are pre-filled from the
manifest — press Enter to accept those. Where this table says otherwise, type the value shown.

> I couldn't run Bubblewrap from here, so the exact wording of each prompt may differ slightly
> between versions. Match by meaning.

| Prompt (roughly) | What to enter |
| --- | --- |
| Domain | `bullet-journal-app.netlify.app` (pre-filled) |
| URL path | `/` (pre-filled) |
| Application name | `Digital Bullet Journal` |
| Short name / Launcher name | Your choice from the table above |
| Application ID / Package ID | `com.nabilpervezconsulting.bulletjournal` **— type this carefully; it's permanent** |
| Starting version code | `1` |
| Display mode | `standalone` |
| Orientation | `default` (recommended) |
| Status bar colour | `#0B0B0F` |
| Splash screen colour | `#0B0B0F` |
| Icon URL | pre-filled `…/icon-512.png` — accept |
| Maskable icon URL | pre-filled `…/icon-maskable-512.png` — accept |
| Monochrome icon URL | leave blank |
| Include app shortcuts? | Yes |
| Play Billing | No |
| Location delegation / Geolocation | No |
| Key store location | `./android.keystore` (the default) |
| Key name / alias | `android` (the default) |
| Key store password | **Make up a strong password and save it in your password manager now** |
| Key password | Same approach — save it too |
| First and last name | Your name |
| Organizational unit | `Nabil Pervez Consulting` |
| Organization | `Nabil Pervez Consulting` |
| Country (2-letter code) | Your country, e.g. `US`, `GB`, `CA` |

When it finishes, the folder contains a `twa-manifest.json` (your app's settings) and
`android.keystore` (your signing key).

### C3. Back up the key **before doing anything else**

- Copy `android.keystore` to a USB drive or other offline location.
- Store both passwords in your password manager next to a note saying which file they belong to.

This is the **upload key**. Because Google Play will manage the final signing key for you (Part F),
losing this one isn't fatal — Google can reset it — but that process takes days. Don't lose it, and
never commit it or email it.

---

## Part D — Build, and connect the app to the website (15 minutes)

### D1. Build

In the same folder:

```bash
bubblewrap build
```

Enter the two passwords when asked. You'll get:

| File | What it's for |
| --- | --- |
| `app-release-bundle.aab` | **What you upload to Play.** |
| `app-release-signed.apk` | For installing directly on your own phone to test. |
| `assetlinks.json` | A ready-made Digital Asset Links file containing your upload key's fingerprint. |

### D2. Find your upload key's SHA-256 fingerprint

Open the `assetlinks.json` that Bubblewrap just created in `C:\Users\perve\bullet-journal-android`. It
contains a line like this:

```json
"sha256_cert_fingerprints": ["14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5"]
```

**The value you need is that quoted string:** 32 pairs of capital letters/digits separated by colons,
95 characters long. (The one above is an example — use yours.)

*If there's no `assetlinks.json` in the folder*, get the fingerprint from the key directly. Bubblewrap
installed a JDK under `%USERPROFILE%\.bubblewrap\jdk\`; use the `keytool.exe` inside its `bin` folder:

```bash
& "$env:USERPROFILE\.bubblewrap\jdk\<jdk-folder-name>\bin\keytool.exe" -list -v -keystore android.keystore -alias android
```

Copy the value on the line starting `SHA256:`.

### D3. Paste it into the repo

Open `public/.well-known/assetlinks.json` in the repo and replace the text
`REPLACE_WITH_UPLOAD_KEY_SHA256` with your fingerprint, keeping the quotes:

```json
"sha256_cert_fingerprints": [
  "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5",
  "REPLACE_WITH_PLAY_APP_SIGNING_KEY_SHA256"
]
```

Leave the second placeholder for now. Commit, push to `main`, and wait for Netlify to deploy.

A fingerprint is public by design — it's safe to commit. The keystore file and passwords are not.

---

## Part E — Try it on your own phone (15 minutes)

1. Copy `app-release-signed.apk` to your Android phone (USB cable, Google Drive, or email it to
   yourself).
2. Tap it on the phone. Android will ask to allow installing from that source — allow it for this
   install.
3. Open **Digital Bullet Journal** from your home screen.

**The one thing to look for: is there an address bar at the top?**

- **No address bar** → the website and the app trust each other. 🎉
- **An address bar or a "Running in Chrome" banner** → the fingerprint on the website doesn't match
  the app. Re-check Part D, run `npm run twa:check`, and note that Google caches the file for a while:
  uninstall the app, wait a few minutes, reinstall.

While it's installed, also check:

- [ ] Turn on airplane mode, close the app fully, reopen it — the journal still opens.
- [ ] Settings → Export JSON downloads a file you can find in your Downloads.
- [ ] Settings → Read the privacy policy opens the policy, and Back returns to the journal.
- [ ] Long-press the app icon — Today, Week, Month and Future shortcuts appear.
- [ ] Switch to the Day theme and see whether the phone's status bar still looks right (see
      "Things to watch" below).

Take your **store screenshots now**, on the phone, with a few realistic entries in the journal: Play
needs **at least 2** (up to 8). Today, Week and the capture sheet make good ones.

---

## Part F — Google Play Console (1–2 hours)

Sign in at [play.google.com/console](https://play.google.com/console) with the **Nabil Pervez
Consulting** organization account (account ID `7829300357127754405`).

### F1. Create the app

**Home → Create app**

- App name: `Digital Bullet Journal`
- Default language: English
- App or game: **App**
- Free or paid: **Free** (a free app can never be changed to paid later)
- Tick the declarations → **Create app**

### F2. "Set up your app" tasks

The dashboard lists these. Work through each one:

| Task | Answer |
| --- | --- |
| **Privacy policy** | `https://bullet-journal-app.netlify.app/privacy` |
| **App access** | All functionality is available without special access |
| **Ads** | No, my app does not contain ads |
| **Content rating** | Start questionnaire → category **Utility, Productivity, Communication or Other** → answer **No** to violence, sexual content, profanity, drugs, gambling, user interaction/sharing, location sharing and purchases. |
| **Target audience** | **18 and over** (or 13 and over). Don't include under-13 age groups: that opts the app into the Families programme and its extra requirements. |
| **News app** | No |
| **Data safety** | See below |
| **Government app / Financial features / Health** | No / None / None |

**Data safety.** The app doesn't collect any user data: no accounts, no analytics, and the journal
never leaves the device. So the answer is **"No, my app does not collect or share any of the required
user data types."** When asked, it's also true that data is not encrypted in transit *because none is
sent*, and deletion requests aren't applicable.

> ⚠️ I'm not certain how Google's reviewers treat the fact that loading the app contacts **Google
> Fonts** and **Netlify**, which see visitors' IP addresses in the ordinary course of serving files.
> The privacy policy discloses both. Google's guidance treats data processed only ephemerally to serve
> a request as not "collected", which fits here, but if you want to remove the question entirely, I can
> self-host the fonts so the only server involved is your own.

### F3. Store listing

**Grow users → Store presence → Main store listing**

| Field | What to use |
| --- | --- |
| App name | `Digital Bullet Journal` |
| Short description (80 max) | `A bold, simple bullet journal. Log it, tick it off, and plan your day.` |
| Full description (4000 max) | Draft below — edit freely |
| App icon | `store-assets/android/play-icon-512.png` |
| Feature graphic | `store-assets/android/feature-graphic-1024x500.png` |
| Phone screenshots | The 2–8 you took in Part E |
| Category | Productivity |
| Contact email | Your support email (shown publicly) |

Full description draft:

```
Digital Bullet Journal is the bullet journal method, made for your phone.

Write things down as one short line each. Every line is one of four kinds — a goal, a task, an event or a note — and the kind decides where it shows up: today, this week, this month, or further ahead.

• Rapid log: tap +, pick a kind, write a line. Two taps and it's down.
• Today: what's due today first, then everything else in the order it's coming.
• Schedule: give tasks a time on a half-hour agenda. Drag, stretch, move.
• Week, month and the months ahead, all filed automatically.
• Repeating entries: tick off an oil change and the next one is already waiting, six months on.
• Bold, dark-first design with a light theme, made to be used one-handed.
• Works offline.

Private by design: no account, no ads, no tracking. Your journal stays on your device, and you can export a copy whenever you like.
```

### F4. Upload a build to internal testing

Internal testing lets you install from Play yourself before anyone else sees the app.

1. **Test and release → Testing → Internal testing → Create new release.**
2. When asked about **Play App Signing**, keep Google's default ("Use Google-generated key").
3. Upload `app-release-bundle.aab`.
4. Release name: `1 (1.0.0)`. Release notes: `First release.`
5. **Next → Save and publish.**
6. **Testers** tab → create an email list containing your own Google account → save → copy the
   **opt-in link**, open it on your phone, accept, then install from Play.

### F5. Add Google's signing key fingerprint — the step everyone misses

Play re-signs your app with its own key before delivering it to phones. The app people install from
Play is therefore signed with **Google's key, not yours**, and the website has to vouch for that key
too.

1. **Test and release → Setup → App signing** (sometimes shown under **App integrity**).
2. Under **App signing key certificate**, copy the **SHA-256 certificate fingerprint**.
3. In the repo, open `public/.well-known/assetlinks.json` and replace
   `REPLACE_WITH_PLAY_APP_SIGNING_KEY_SHA256` with that value, keeping the quotes.
4. Commit, push to `main`, wait for the deploy, then run:

   ```bash
   npm run twa:check
   ```

   This time it should say **✓ Ready**.
5. On your phone, uninstall the app, wait a couple of minutes, and reinstall from the internal testing
   link. No address bar = done.

Your final file will look like this, with both of your real fingerprints:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.nabilpervezconsulting.bulletjournal",
      "sha256_cert_fingerprints": [
        "<upload key SHA-256 from Part D>",
        "<app signing key SHA-256 from Play Console>"
      ]
    }
  }
]
```

### F6. Go to production

1. **Test and release → Production → Create new release.**
2. **Add from library** → pick the build you already uploaded to internal testing.
3. Add release notes → **Next → Save → Send for review** (or "Start rollout to Production").

> ⚠️ Google requires **new personal** developer accounts to run a closed test with at least 12 testers
> for 14 days before they can publish to production. As far as I know that rule doesn't apply to
> **organization** accounts like yours, but I can't confirm it from here. If the Production page shows
> a "complete testing requirements" checklist, it applies to you — tell me and I'll walk you through
> setting up the closed test.

Review usually takes 1–7 days for a first app. You'll get an email either way.

---

## Updating the app later

| What changed | What to do |
| --- | --- |
| Anything in the web app — features, fixes, copy, styling | **Nothing.** Merge to `main`; the Android app picks it up on next launch. |
| App name, launcher name, icon, colours, orientation, shortcuts | In `C:\Users\perve\bullet-journal-android`: edit `twa-manifest.json` (or run `bubblewrap update`), **increase `appVersionCode` by 1**, run `bubblewrap build`, then upload the new `.aab` as a new release. |
| You regenerated icons with `npm run icons` | Deploy first, then do the row above so the Android launcher icon updates. |

---

## Things to watch in the Android app

These are behaviours of running inside a TWA rather than a normal browser tab. None is a blocker;
check each on a real phone in Part E.

1. **Address bar appears** — always a fingerprint mismatch. Run `npm run twa:check`, then see Part F5.
2. **Status bar colour with the Day theme.** The Android status bar is set to `#0B0B0F` when the app
   is built. The app also updates the page's `theme-color` when you switch theme; I'm not certain
   Chrome applies that change to a TWA's status bar. If Day theme leaves a dark bar over a light page,
   it's cosmetic and I can make the status bar follow the theme another way.
3. **Links to other websites** (only the Netlify and Google policy links on the privacy page) open in a
   Chrome overlay with a close button rather than inside the app. That's standard Android behaviour
   and the right thing for external pages. There are no other external links in the app.
4. **Export downloads** go through Chrome's download manager and appear in the notification shade and
   the phone's Downloads folder.
5. **Import** uses the Android file picker — fine, but the file needs to be somewhere the picker can
   see (Downloads works).
6. **Clearing the app's storage or uninstalling it deletes the journal.** The privacy policy and the
   Settings screen both say so; the export button is the backup.
7. **The first launch needs internet.** After that it works offline.

---

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| `bubblewrap init` fails fetching the manifest | Site not deployed, or a typo in the URL | Open the manifest URL in a browser; run `npm run twa:check` |
| Address bar shows in the APK you installed directly | Upload key fingerprint missing or wrong on the site | Part D2–D3, then reinstall |
| Address bar shows only in the copy installed from Play | Play App Signing fingerprint missing | Part F5 |
| `twa:check` says assetlinks is `text/html` | The deploy didn't include the file, or the rewrite answered first | Check `dist/.well-known/assetlinks.json` exists after `npm run build`; tell me |
| Play rejects the upload: "version code already used" | Every upload needs a higher `appVersionCode` | Increase it in `twa-manifest.json`, rebuild |
| Play rejects the upload: package name already exists | Someone else has it | Choose another package name and update `assetlinks.json` to match |
| Forgot the keystore password | — | Play Console → App signing → **Request upload key reset** (possible because Google manages the app signing key) |
