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
- Opens the current document location in the OS file explorer.
- Opens the running app folder and local cache folder from header gadgets.
- Switches between View, Split, and Edit modes with `Ctrl+M`.
- Opens `*.view.rdot` in View mode and locks `*.rock.rdot` to View mode.
- Opens associated `.rdot` files directly when launched from the OS.
- Starts with a clean welcome screen when no document is provided.
- Lets header and footer gadgets be arranged from a small config.
- Supports a portable zip layout with shared `config/` and `extensions/` folders beside `rodots.exe`.
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

## Samples

The `examples/` folder includes a compact sample set:

- editable documents such as `minutes.rdot`, `report.rdot`, and `project-kickoff.rdot`
- view-first documents such as `operator.view.rdot` and `daily-handoff.view.rdot`
- locked documents such as `operator.rock.rdot` and `locked-procedure.rock.rdot`

These are intended for quick desktop verification and for demonstrating how editors and operators can use the same document format in different modes.

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

To build a portable zip after the Tauri release build:

```bash
npm run tauri -- build
npm run package:portable
```

The portable zip keeps shared settings and extensions beside `rodots.exe`. Runtime caches are still created in the local OS cache directory for each PC.

## Status

RoDots is currently an early prototype. The frontend builds and runs; full Tauri desktop verification requires Rust/Cargo on the development machine.
