# RoDots portable layout

RoDots is intended to run from a shared folder such as Dropbox.

Recommended zip layout:

```text
RoDots-0.1.1-portable/
  rodots.exe
  README.md
  config/
    rodots.config.json
  extensions/
    README.md
  examples/
    *.rdot
```

The `config` and `extensions` folders live beside `rodots.exe`, so a team can keep one shared setup in the distributed zip folder.

Runtime caches are not stored beside the app. RoDots keeps caches in each user's local OS cache directory and exposes a gadget button to open that directory.
