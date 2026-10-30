# Setting up the phone app and Google Drive

About 30 minutes, done once. You need: this `web-app` folder, your Google account, Chrome or Edge on your PC, and Chrome on your Android phone.

In the steps below, replace `shahnewaz` with your own GitHub username. Your journal's address will be `https://shahnewaz.github.io/journal/`.

The easiest way to follow along is in the journal itself: **Tutorials → Set up the phone app**. It has the same steps, with pictures.

---

## Part 1 · Put the journal on a web address (GitHub Pages, free)

Google sign-in and the phone app only work from a real web address, not from a file on your D: drive.

1. Go to **github.com/signup** and make a free account. The username becomes part of your address.
2. Click **+** (top right) → **New repository**.
   - Repository name: `journal`
   - Choose **Public**. Free accounts can only publish public repositories. Only the app's code is public; your entries and photos never leave your computer.
   - Click **Create repository**.
3. On the new, empty repository, click **uploading an existing file**.
4. Open your `web-app` folder in File Explorer. Press **Ctrl + A** to select everything *inside* it (not the folder itself), and drag it onto the GitHub page. Wait until every file has finished uploading, then click **Commit changes** at the bottom.
   - GitHub takes up to 100 files at a time. The app has about 96. If GitHub ever complains, upload in two goes: first the `help` folder, then everything else.
5. Open the repository's **Settings** tab → **Pages** (left side). Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**, folder **/ (root)** → **Save**
6. Wait a minute or two and refresh the page. It says **Your site is live at https://shahnewaz.github.io/journal/**.

⚠️ Never put backups or personal files inside the `web-app` folder: everything in it becomes public on GitHub.

**Updating later:** open the repository → **Add file → Upload files**, drag in the new files (same names replace the old ones), and click **Commit changes**. The site updates within a couple of minutes.

## Part 2 · Move your journal into the web version

The version on your D: drive and the web version keep separate journals, so move your entries over once.

1. Open the journal from your D: drive (`index.html`) → **Settings → Backup → Export backup**.
2. In Chrome or Edge, open **https://shahnewaz.github.io/journal/** → **Settings → Backup → Import backup** and pick that file. If the backup has a passcode, type it.
3. If you use a passcode: open **Settings → Privacy & security** and set it again in the web version.
4. Install it as an app: in the address bar, click the **Install** icon (a screen with a down arrow), or open the ⋮ menu → **Cast, save and share → Install page as app** (Chrome) / **Apps → Install this site as an app** (Edge). From now on, open the journal from that icon.

## Part 3 · Make a Google sign-in for your journal (Google Cloud, free)

This creates your own private "app" in Google, so the journal can use your Google Drive. Nobody else can use it.

1. Go to **console.cloud.google.com** and sign in with the Google account you want to use.
2. At the top, click the project picker → **New project**. Name it `Digital Journal` → **Create**. Make sure it's selected at the top.
3. In the search bar, type **Google Drive API**, open it and click **Enable**.
4. In the search bar, type **Google Auth Platform** and open it. Click **Get started**:
   - App name: `Digital Journal`. User support email: your email. **Next**
   - Audience: **External**. **Next**
   - Contact email: your email. **Next** → tick the agreement → **Create**
5. In the left menu, open **Audience**. Under **Test users**, click **Add users**, add your own Gmail address and save. Leave the app in **Testing**.
6. Open **Data Access** → **Add or remove scopes**. Tick these (use the filter box to find them), then **Update** and **Save**:
   - `.../auth/drive.appdata`
   - `.../auth/drive.file`
   - `openid` and `.../auth/userinfo.email`
7. Open **Clients** → **Create client**:
   - Application type: **Web application**. Name: `Journal`
   - **Authorized JavaScript origins** → Add URI: `https://shahnewaz.github.io` (just the start of the address, no slash at the end)
   - **Authorized redirect URIs** → add **both** of these, exactly, including the slash at the end:
     - `https://shahnewaz.github.io/journal/`
     - `https://shahnewaz.github.io/journal/phone/`
   - Click **Create**.
8. Copy the **Client ID**. It looks like `123456789-abcdefg.apps.googleusercontent.com`. You don't need the client secret.

Changes in Google Cloud can take a few minutes to start working.

## Part 4 · Connect your PC

1. In the web journal: **Settings → Phone app & Google Drive**. Paste the Client ID → **Save**.
2. Click **Connect Google Drive** and pick your account.
3. Google shows **"Google hasn't verified this app"**. That's expected, because it's your own private app. Click **Continue**.
4. Allow the Google Drive access it asks for (tick the boxes if there are any) → **Continue**.
5. You're back in the journal. It shows **Connected**, a QR code and "This computer's code".

## Part 5 · Set up your Android phone

1. Open the **Camera** app and point it at the QR code on your PC screen (or use Google Lens). Tap the link that appears. It opens in Chrome.
2. Tap **Connect Google Drive**, pick the same Google account, and allow access the same way as on the PC.
3. The phone shows two codes: **this phone's code** and **your PC's code**.
4. On your PC, click **Check for phone entries now**. A **New phone** appears with a code. Check it matches the phone's code, then click **Allow**.
5. Within a few seconds the phone shows **Quick entry** and **New entry**. Done.
6. Put it on your home screen: tap **Add to home screen** in the app, or Chrome's ⋮ menu → **Add to home screen → Install**. Open it from that icon from now on.

## Part 6 · Automatic backup

**Settings → Backup → Automatic backup**:

- **How often:** every day, every 3 days, or every week.
- **Where:**
  - **A folder on this computer:** click **Choose folder**, for example `D:\1. Shah\Digital Journal\Backups`. If you pick a folder inside Google Drive for desktop or OneDrive, the backup goes to the cloud too. When Chrome asks, choose **Allow** (or **Allow on every visit**).
  - **Google Drive:** saved in a folder called **Digital Journal backups** in your Drive.
  - You can tick both.
- **Keep:** how many backups to keep. Older ones are deleted.

Backups run while the journal is open. If Chrome forgets the folder permission after a restart, the Home page shows **Allow and back up**: one click.

## Day to day

- **On the phone:** tap Quick entry or New entry, then **Save and send**. If there's no internet, it waits and sends later.
- **On the PC:** open the journal. New phone entries arrive by themselves within a few seconds, and while it's open it checks every couple of minutes.
- If the Home page says **Connect Google Drive**, click it. Google's pass lasts about an hour, and the journal renews it by itself when you open it; sometimes Google wants a click.

## If something goes wrong

| What you see | What to do |
|---|---|
| `Error 400: redirect_uri_mismatch` | In Google Cloud → Clients → your client, the two redirect URIs must match your address exactly, with the `/` at the end. |
| `Error 400: origin_mismatch` | The JavaScript origin must be just `https://shahnewaz.github.io`, with no `/journal` and no slash at the end. |
| The site shows “404” | Wait a few minutes after turning on Pages. Check that `index.html` is at the top of the repository, not inside a `web-app` folder. |
| `Access blocked` or `access_denied` | Add your Gmail address under Audience → Test users. |
| The phone stays on "Waiting for your PC" | Open the journal on your PC → Settings → Phone app & Google Drive → **Check for phone entries now** → **Allow**. |
| "One more step on your PC" on the phone | Connect Google Drive on the PC first (Part 4), then tap **Check again**. |
| An entry from the phone "couldn't be opened" | It was sent before the PC was set up again. Delete it from Settings and send it again. |
