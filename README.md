# RoDots

RoDots is a lightweight desktop document assistant for `.rdot` files.

It sits just before "Robots": not an autonomous agent, but a obedient practical document format that helps teams standardize repeated work without requiring everyone to become technical.

## What It Does

- Edits Markdown-like `.rdot` documents in a two-pane editor and preview.
- Expands RoDots commands such as `date`, `input`, and `meta`.
- Repeats schedule rows with compact date ranges such as `+3nD` or `-4n..+3nD`.
- Lets preview users update dates through a calendar-like date input.
- Reads document metadata and shows breadcrumbs for the project origin.
- Generates rule-based file names for minutes, reports, and specs.
- Switches between View, Split, and Edit modes with `Ctrl+M`.
- Opens `*.view.rdot` in View mode and locks `*.rock.rdot` to View mode.
- Opens associated `.rdot` files directly when launched from the OS.
- Starts with a clean welcome screen when no document is provided.
- Lets header and footer gadgets be arranged from a small config.
- Includes a simple dark/light theme toggle.
- Keeps app caches outside synced project folders.

## Example

```rdot
{{ meta # project=Common System, parent=02_Requirements, origin=https://drive.google.com/ }}

# Meeting Notes

- Meeting date: {{ date # today, yyyy-mm-dd, +3nD, copy @meeting_date }}
- Owner: {{ input # text, Owner name @owner }}
- Next review: {{ date # @meeting_date, yyyy-mm-dd, +7D @next_review }}
```

`+3nD` expands the line into four rows: today through three days later.

## Development

```bash
npm install
npm run check
npm run build
```

For the desktop app, install Rust and then run:

```bash
npm run tauri -- dev
```

## Status

RoDots is currently an early prototype. The frontend builds and runs; full Tauri desktop verification requires Rust/Cargo on the development machine.
