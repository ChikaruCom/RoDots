# RoDots Basic Specification

## Product

- Name: RoDots
- File extension: `.rdot`
- View lock convention: `*.view.rdot`
- Stack: Tauri v2, Svelte, TypeScript, Vite, Tailwind CSS, Rust

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
