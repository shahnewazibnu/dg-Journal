# Digital Journal: web app (v0.7)

A private photo journal: entries with photos, text and a date, a calendar with photo thumbnails, and month and year recaps.

## Open it

Double-click `index.html`. It opens in your default browser (Chrome or Edge works best). You don't need to install anything or be online.

Keyboard shortcut: press **N** anywhere to start a new entry.

## What's new in v0.8: Recipes and moving memories

- **Recipes** in the sidebar: a recipe book with a photo, servings, prep and cook time, categories and favorites.
  - Ingredient suggestions as you type (about 250 common ones, including Bengali and South Asian staples). Ingredients you've used before come first and bring their unit.
  - Units include tsp, tbsp, cup, pinch, dash, handful, g, kg, ml, l, piece, clove and "to taste". Amounts accept 1, ½, 1 1/2 and ranges like 2–3.
  - Drag ⠿ to reorder steps and ingredients. Copy steps or ingredients from another recipe.
  - Change servings and every amount scales. Steps that mention a time get a timer.
  - Cooking mode: one big step at a time, screen stays on, ingredients checklist, timers that beep. "I cooked this" keeps a log.
  - Search by name or ingredient, print, and included in backups and encryption.
- **Moving memories** on Home: 10 random photos glide left to right; one slides out, a new one comes in. Hover to pause, click to open.

## What was new in v0.7: Watch list

- **Watch list** in the sidebar, with three sections: **Anime**, **Movies** and **TV series**.
- **+ Add** suggests titles with pictures as you type: anime from MyAnimeList (through the free Jikan service), TV series from TVmaze, movies from Wikipedia. No account or key is needed; only the name you type is sent. Offline, or if nothing matches, you can add it by name only.
- Add as **Watching** or **Watch later**. Cards have **▶ Start watching**, an **episode counter**, and **✓ Finished watching**.
- **Ratings out of 5 with fractions:** click exactly where you want on the stars (for example 4.3).
- **Watch calendar:** each show is a bar from the day you started to the day you finished.
- **Details:** status, dates, episodes, notes, your own picture, and **Watch again** (earlier watches stay on the calendar).
- **Watching now** strip on the Home page. The watch list is included in backups and encrypted with your passcode.
- Photos in the entry editor can be **dragged into any order**, and any photo can be made the cover.

## What was new in v0.6

- **Phone app for Android** (the `phone` folder). It only adds entries: **Quick entry** (one photo and a line) and **New entry** (date, photos, title, text, mood, tags, people, place, voice note, video, song, favorite). It keeps nothing: each entry is locked so only your PC can open it, sent through a hidden folder in your Google Drive, and deleted from the phone once sent. The phone keeps only your tag, people and place names so you can tap them.
- **Receiving on the PC:** new phone entries arrive by themselves when the journal opens, and every couple of minutes while it's open.
- **Smaller photos, same look:** photos are resized carefully, saved as WebP where the browser can, and given an adaptive quality, so simple photos are squeezed more than detailed ones. A photo is never saved bigger than the original. In tests with sample photos, Balanced used about half the space of v0.5. Choose Best quality, Balanced or Smallest in **Settings → Photos & storage**, and use **Shrink photos already in the journal** to save space on older photos.
- **Automatic backup** (Settings → Backup): every day, every 3 days or every week, to a folder you choose on this computer, to Google Drive, or both, keeping the last 3, 5, 10 or 30.

- **Tutorials** in the sidebar: step-by-step guides with pictures for writing entries, finding and looking back, decorating pages, setting up the phone app, using it, automatic backup, photo quality, the passcode, and printing and sharing.

**Setting it up:** open **Tutorials → Set up the phone app** in the journal (or read **SETUP.md**). The phone app and Google Drive need the journal on a web address (free with GitHub Pages).

## What was new in v0.5

**Security and tags**
- **Passcode lock with encryption** (Settings → Security). Everything (entries, photos, voice notes, videos, people, places, tags) is encrypted on this device with AES-GCM. The journal locks itself after a few minutes away, and **Lock now** locks it straight away. Backups made while locked are encrypted and need the passcode to import. **If you forget the passcode, only a backup can bring the journal back.**
- **Tags** such as Date, School, Friends, Family, Work, Travel, Food and Celebration, plus your own with a color. Tag an entry in the editor, then filter by tag on the Journal page or open a tag's own page from People.

**Writing and capture**
- **Filters** on the Journal page: tags, moods, people, places, favorites, with photos, and date range.
- **Favorites** (☆) and **Pin to Home**.
- **Snap & save**: one photo and one line from Home, saved in seconds.
- **Writing prompts** above the text box, and **drafts** that survive closing the editor or the browser.
- **Photo date and place**: a new entry takes the date (and place, if it has GPS) from the photo.
- **Import photos**: pick many photos at once and get one entry per day.
- **Voice notes** (record in the editor), **video clips**, and **Song of the day** (name, artist, link). They appear on the page as a cassette, a framed video and a record label, and play when you tap them.

**Recaps and Home**
- **Week recap**, a "this week" card on Home, and **Year in review**: a tap-through story you can save as a video.
- **Time capsules**: write a letter that stays sealed until a date you pick.
- **Map** of your places (needs an internet connection for the map tiles).
- **Backup reminders**, and the theme can follow the computer's light or dark mode.

**Journal pages**
- **Draw** with pen, highlighter or eraser, in 8 colors and 4 sizes. Each line can be moved and resized later.
- **Page backgrounds**: kraft paper, graph, dot grid, notebook, watercolor, blush, linen, corkboard, chalkboard and night sky.
- **Layouts**: Scrapbook, Polaroid wall, Big photo + small ones, Collage grid, Neat rows.
- **Photo filters** (Film, B&W, Warm, Cool, Faded, Vivid, Sepia) and **crop** (square, 4:5, 3:2, 16:9, circle, zoom and position).
- **Undo and redo** in the page editor (also Ctrl+Z and Ctrl+Y).

**Reading and sharing**
- **Book mode** (📖 Book on the Journal page): two pages side by side with a page-turn, or one page on a phone. Arrow keys or swipe to turn.
- **Save as PDF** on the month and year recaps: one entry per page with a cover. In the print window, pick "Save as PDF".
- **Share as image** on an entry: saves the page as a PNG, or opens the share menu on a phone.

## What was new in v0.4: journal pages

- **Each entry is now a journal page.** The date stamp, title, mood, people and place stay fixed at the top, and your writing stays fixed below. Photos are laid out like a scrapbook to start with.
- **Edit page** (on an entry): drag anything, resize it from the round corner handle, and turn it with the top handle. The panel underneath has Smaller and Bigger, turn buttons, Bring to front, Send to back, Duplicate and Delete. Arrow keys nudge the selected item; hold Shift to move it further. Choose Done to save or Cancel to undo.
- **Stickers** in tabs: Nature, Weather, Food, Love, Fun, Travel, Study, Animals, Faces, Symbols, Words (text stickers), and holiday packs: Eid & Ramadan, Halloween, Thanksgiving, Christmas, New Year, Valentine's, July 4th and Milestones. A holiday near the entry's date opens first, marked with ★.
- **Washi tape:** 18 designs, placed anywhere and as many as you like. It's no longer in Settings.
- **Notes:** note card, sticky note, handwritten label or kraft tag, each with its own text and size.
- **Photos:** each photo can have no frame, a white print border, or a polaroid frame. You can take a photo off the page (it stays in the entry), put it back, or add new photos from the page.
- **PNG:** upload your own PNG stickers or cut-outs. Transparency is kept. Each PNG belongs to that entry only.
- **Text above or below the photos:** choose this in the Notes tab.
- Thumbnails in the journal, calendar and recaps look the same as before.

## What was new in v0.3

- **Moods.** Pick a mood (10 emoji) when writing. The calendar has a Moods view, the month recap lists your moods, and the year recap has a "Year in moods" grid with one square per day.
- **Entry color.** A soft tint per entry. "Follow mood" (the default) uses the mood's color; you can also pick one of 7 colors or none.
- **People.** Add friends and family with a photo (People page, or "+ New person" in the editor), then tag who was there. Each person has a page with all your memories together.
- **Places.** Save a place with an address, a pasted Google Maps link, or your current location. Tagged entries show an embedded Google map and an "Open in Google Maps" link. Maps need an internet connection.
- **Home page.** New sections: "This week in past years" (entries from 1 to 3 days around today's date in past years), "Memories with [person]" and "Memories at [place]" with buttons to switch, and a shuffle button on the slideshow.
- **Journal look** (Settings): paper (plain, dotted, lined, grid, grain), photo frames, date stamp (film camera, rubber stamp, handwritten), and drop caps.
- **Seasonal themes.** Spring, Summer, Autumn and Winter, plus "Seasonal (auto)", which switches by the calendar. The home page has snow in winter and falling leaves in autumn.

## What was new in v0.2

- **Sharper photos.** Each photo is now kept in three sizes: up to 2560 px for the viewer and the home slideshow, 1280 px for journal cards and tiles, and 600 px for the calendar. Photos added in v0.1 get their 1280 px size made automatically the first time they're shown.
- **Home page.** A slideshow of random memories with their titles, changing every few seconds (choose 5, 8, 12 or 20 seconds in Settings). Below it: **On this day**, with entries from this date in past years and a short recap of each, then today's entries and this month so far.
- **Journal layouts.** Story (cover plus up to two more photos), or small, medium or large tiles showing only the cover. The buttons are next to the search box, and your choice is remembered.
- **12 themes**, 6 light and 3 dark among them, in Settings.
- **9 title fonts.** Pick a default in Settings, or choose a different font for one entry in the editor.

## Where your entries are saved

Entries and photos are saved **inside the browser you open the app in**, on this computer. Nothing is uploaded, except phone entries passing through your Google Drive on their way to your PC, and Google Drive backups if you turn them on.

- Opening the app in another browser, or in a private window, shows an empty journal.
- Clearing that browser's site data deletes the journal, so use **Backup → Export backup** now and then. The backup is one `.json` file with every entry and photo. **Import backup** brings it back, in any browser or on any device.
- Photos are resized to at most 2560 px on the long side to save space. Your original files are not changed.
- Theme, fonts, layout, look options and your name are saved in the same browser too. They aren't part of the backup file. People, places, tags, voice notes and videos are in the backup.
- Videos take a lot of space. Short clips work best.

## On your phone

Use the phone app in the `phone` folder. **SETUP.md** (and Tutorials → Set up the phone app) walks through putting the journal on a free web address with GitHub Pages, connecting Google Drive and pairing your Android phone.

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `core.js` | Shared by the PC journal and the phone app: photo compression, photo date and place, encryption between phone and PC, Google Drive |
| `phone/` | The Android phone app (add entries only) |
| `SETUP.md` | Step-by-step setup for the web address, Google Drive and the phone |
| `help/` | Pictures for the Tutorials page |
| `styles.css` | Look and layout |
| `app.js` | Everything the app does, including storage, calendar and recaps |
| `manifest.webmanifest`, `sw.js`, `icons/` | Let the app be installed on a phone or PC when it's on a web address |
| `fonts/` | All fonts, bundled so the app works offline (licenses are next to each font file) |
| `lib/` | Leaflet (the map), html-to-image (Share as image), the fonts packed for images, and qrcode (the phone setup code). Licenses are included |

## Possible next steps

1. Wrap the phone app as an installable APK (for example with PWABuilder), if you'd rather have it from a file than from Chrome
2. Wrap the PC journal as a Windows app (Tauri or Electron)
3. Full two-way sync, if you later want to read the journal on the phone too
