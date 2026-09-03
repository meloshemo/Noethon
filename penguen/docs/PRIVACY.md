# Privacy Policy

**Last updated:** 20 August 2026
**Product:** Pengu: Escape from Antarctica (web game)

*Turkish original: [GIZLILIK.md](GIZLILIK.md). Both texts say the same thing.*

## The short version

This game collects **nothing about you.** It has no server, no accounts, no
cookies, no ads and no analytics. There is not one address it talks to over the
network.

That is not a promise, it is a **tested fact.** The repository contains no
`fetch`, no `XMLHttpRequest`, no `WebSocket` and no third-party script, and two
separate checks keep it that way:

- `tools/lint.mjs` looks for an external address in every file and fails the
  build if it finds one.
- `tests/browser-identity.mjs` opens the game in a real browser and reads the
  `performance` records: apart from the game's own files there must be **not a
  single request.**

Those checks earn their keep. The first version of the game pulled its typeface
from Google Fonts, which meant every launch reached two other companies' servers
before a single pixel was drawn. The test caught it. The webfont was removed and
the device's own typefaces are used instead.

## What is stored, and where

Everything sits in **your browser**, inside `localStorage`, in a single record
called `pengu.save.v1`:

| What | Why |
|---|---|
| Your name | So it appears on your records and on ghost codes you share |
| Your penguin id (`PNG-XXXXX`) | So two players with the same name are not confused |
| The day you started | The "playing since" line on your identity card |
| Level progress | Stars, best times, attempts, fish collected |
| Your fish and purchases | The shop and the collection |
| The penguin and trail you wear | How you look |
| Your settings | Sound, music, reduced motion, easy mode, language |
| Daily objectives and streak | The daily content |
| Your ghost recordings | Your own record runs, so they can be replayed |
| Rival codes you imported | The leaderboard |

None of it leaves your device.

## Personal data

**You** type the name and it does not have to be your real one: the field
arrives with an invented one already in it, and leaving it alone is fine. The game does not touch your IP address, location,
device id, contacts, photos or anything of that sort, and it asks the browser
for no such permission.

The only browser capabilities the game uses:

- **localStorage**, for your save
- **Web Audio**, for sound (not the microphone, it only produces sound)
- **Gamepad API**, if a controller is plugged in (it only reads the buttons)
- **Fullscreen and screen orientation**, when you ask for them

## What goes out when you share

Finish a level and you can press "Share your code". Inside that code:

- The name you typed
- The level number and your time
- A compressed recording of your inputs (your ghost)

The code is a string of text, and where you paste it is entirely your decision.
The game sends it **nowhere** by itself, and it never asks you for anybody
else's code. Paste somebody's code and you race their ghost, that is all.

## Hosting

The game is published on GitHub Pages. As with opening any website, GitHub's
servers see your IP address and browser details in their standard access logs
while they serve the request. That is the unavoidable consequence of
*downloading* the site; once the game has loaded it makes no further requests.
That processing belongs to the hosting service, not to the game:
[GitHub Privacy Statement](https://docs.github.com/site-policy/privacy-policies/github-privacy-statement).

Download the single-file build (`dist/pengu.html`) and play offline and even
that goes away.

## Children

The game suits any age. No chat, no user content, no spending, no ads. Since no
personal data is collected there is nothing that needs a parent to consent to.
The same holds under 13: with nothing collected, no "collection" happens in the
COPPA sense.

## What your rights amount to

Because no data is handed to a "data controller", no processing takes place in
the sense the GDPR and Turkey's KVKK define. There are buttons that give you the
same outcomes anyway:

| Your right | Where it is |
|---|---|
| Access / portability | **Settings → Legal and data → Export my save** (downloads JSON) |
| Erasure | **Settings → Reset progress**. The save is deleted entirely and cannot be recovered |
| Rectification | Change your name from the **Identity** screen whenever you like |
| Objection | There is no processing. Closing the game is enough |

Clearing the browser's site data does the same job.

## Changes

If this text changes, the date at the top changes with it and the change shows
up in the repository history. The game carries no version number: whatever is
published is the current state of the `main` branch.

## Contact

Questions, bug reports and requests: the *Issues* section of the repository.
