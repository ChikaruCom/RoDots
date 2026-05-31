# RoDots Basic Specification

## Product

- Name: RoDots
- File extension: `.rdot`
- View lock convention: `*.view.rdot`
- Rock lock convention: `*.rock.rdot`
- Stack: Tauri v2, Svelte, TypeScript, Vite, Tailwind CSS, Rust

When RoDots is launched without a document, it shows a clean welcome screen with the product name, concept, and GitHub URL. It does not pre-fill a sample document.

On Windows release builds, RoDots uses the GUI subsystem so a console window is not shown during startup.

## Modes

RoDots has three simple modes:

- `view`: shows only the rendered document. This is the safest mode for operators and people who should not edit source text accidentally.
- `split`: shows the editor and rendered view side by side.
- `edit`: shows only the source editor.

`Ctrl+M` cycles through `view`, `split`, and `edit`.

When RoDots is launched with a file whose name ends in `.view.rdot`, it starts in `view` mode. This supports documents prepared by an editor and safely executed by another user.

When RoDots is launched with a file whose name ends in `.rock.rdot`, it starts in `view` mode and mode switching is locked. This is for documents that should not be edited by operators; changes should go through the document owner or manager.

## Gadgets

Header and footer UI parts are defined as gadgets. Each gadget can be moved by changing its zone:

- `headerLeft`
- `headerRight`
- `footerLeft`
- `footerRight`
- `contextMenu`

Initial gadgets include breadcrumbs, file template save, the current file location opener, the app location opener, the local cache opener, ambient timer, cache actions, mode switch, theme switch, today's date, and current date/time.

The current file location opener opens the folder that contains the active `.rdot` document in the OS standard file explorer. It is disabled when RoDots is on the clean welcome screen and no document has been opened.

The app location opener opens the directory that contains the running `rodots.exe`. This is useful for portable zip deployments placed in shared folders such as Dropbox.

The local cache opener opens the OS-local RoDots cache directory. Shared configuration can live beside the app, but caches remain per-PC local data.

The context menu zone is shown when the user right-clicks inside RoDots. It is intended for lower-frequency actions such as opening app/cache locations and registering the portable app as the `.rdot` opener.

## Theme

RoDots supports a simple dark/light theme toggle from the header.

## Command Syntax

RoDots commands use double braces:

```rdot
{{ command # arg1, arg2, arg3, mode @alias }}
```

Documents are evaluated from top to bottom. Later commands may refer to earlier aliases.

## `date`

```rdot
{{ date # base, format, offset, mode @alias }}
```

- `base`: `today`, an ISO date such as `2026-06-02`, or a previous alias such as `@meeting_date`.
- `format`: examples include `yyyy-mm-dd` and `令和N年mm月dd日(六曜)`.
- `offset`: `+7D`, `-1M`, `+1Y`, or repeat syntax.
- `mode`: `normal` or `copy`.

Repeat syntax:

- `+3nD`: expand from `+0D` through `+3D`.
- `-4nD`: expand from `-4D` through `+0D`.
- `-4n..+3nD`: expand from four days before through three days after.
- `+3n-4nD`: accepted shorthand for the same before/after style.

## `input`

```rdot
{{ input # text, Owner name @owner }}
```

Preview shows an input field. The value is available to later `@owner` references. Empty inputs are counted as unresolved TODOs.

## `meta`

```rdot
{{ meta # project=Common System, parent=02_Requirements, origin=https://drive.google.com/ }}
```

Metadata is hidden from preview content and used for header breadcrumbs and template file names.

Supported keys:

- `project`
- `parent`
- `origin`
- `local`
- `author`
- `version`

## Links

RoDots detects:

- `file:./path`
- `file://C:/path`
- `https://example.com`

Local file links are opened through Tauri. Web links can be checked and cached by the backend.

## Cache Policy

Generated caches and app settings belong in the OS app data area, not next to user documents. This keeps cloud-synced folders clean.

## Portable Distribution

RoDots supports a portable zip layout where `rodots.exe`, `config/`, `extensions/`, and `examples/` are distributed together. On startup, RoDots reads `config/rodots.config.json` beside the executable when present. This shared config can set the theme and gadget layout.

The portable app folder is suitable for Dropbox-style shared deployment. Runtime caches are still written to each user's local OS cache directory.

On Windows, the portable app can register the running `rodots.exe` as the current user's `.rdot` file association. This writes to `HKCU\Software\Classes` and does not require administrator rights.

## Sample Documents

The `examples/` folder contains editable `.rdot`, view-first `*.view.rdot`, and locked `*.rock.rdot` samples. The set is intended for manual desktop verification and for explaining editor/operator usage.
