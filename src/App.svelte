<script lang="ts">
  import { Clipboard, Database, Download, Eye, FolderOpen, HardDrive, Lock, Moon, PanelsTopLeft, Pencil, RefreshCw, Sun, Upload } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import AmbientTimer from './components/AmbientTimer.svelte';
  import Breadcrumbs from './components/Breadcrumbs.svelte';
  import DateTimeGadget from './components/DateTimeGadget.svelte';
  import FileTemplateMenu from './components/FileTemplateMenu.svelte';
  import type { FileTemplateId } from './lib/fileTemplates';
  import { modeLabel, nextMode, type AppMode } from './lib/modes';
  import { parseRawDots, updateDateBaseInSource, type Block, type InlineToken, type InputValues } from './lib/parser';
  import { checkAndCacheUrl, exportCacheZip, getPortableConfig, getStartupDocument, importCacheZip, openAppDirectory, openCacheDirectory, openLocalPath, saveWithTemplate, type LinkState } from './lib/tauri';
  import { gadgets, type GadgetConfig, type GadgetId, type GadgetZone } from './lib/widgetConfig';

  const githubUrl = 'https://github.com/ChikaruCom/RoDots';
  const starter = '';
  const gadgetIds: GadgetId[] = ['breadcrumbs', 'fileTemplates', 'ambientTimer', 'cacheActions', 'openLocation', 'openAppLocation', 'openCacheLocation', 'modeSwitch', 'themeToggle', 'today', 'clock'];
  const gadgetZones: GadgetZone[] = ['headerLeft', 'headerRight', 'footerLeft', 'footerRight'];

  let source = starter;
  let inputValues: InputValues = {};
  let linkStates: Record<string, LinkState> = {};
  let cacheMeta: Record<string, string> = {};
  let toast = '';
  let activeDateKey = '';
  let currentFilePath = '';
  let mode: AppMode = 'view';
  let startedFromViewFile = false;
  let rockLocked = false;
  let theme: 'dark' | 'light' = 'light';
  let gadgetConfig: GadgetConfig[] = gadgets;

  $: parsed = parseRawDots(source, inputValues);
  $: unresolvedCount = parsed.todos.length;
  $: headerLeftGadgets = zoneGadgets('headerLeft');
  $: headerRightGadgets = zoneGadgets('headerRight');
  $: footerLeftGadgets = zoneGadgets('footerLeft');
  $: footerRightGadgets = zoneGadgets('footerRight');
  $: showEditor = mode !== 'view';
  $: showPreview = mode !== 'edit';
  $: workspaceClass = mode === 'split' ? 'grid min-h-0 grid-cols-1 md:grid-cols-2' : 'grid min-h-0 grid-cols-1';
  $: themeClass = theme === 'dark' ? 'theme-dark bg-[#101113] text-stone-100' : 'theme-light bg-stone-50 text-stone-950';
  $: showWelcome = !currentFilePath && source.trim().length === 0;

  onMount(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    void loadStartupDocument();
    void loadPortableConfig();

    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        toggleMode();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  async function loadStartupDocument(): Promise<void> {
    try {
      const startup = await getStartupDocument();
      if (startup.path) currentFilePath = startup.path;
      if (startup.content) source = startup.content;
      if (startup.rock_mode) {
        rockLocked = true;
        startedFromViewFile = true;
        mode = 'view';
        toast = '*.rock.rdot としてView固定で開きました';
      } else if (startup.view_mode) {
        startedFromViewFile = true;
        mode = 'view';
        toast = '*.view.rdot としてViewで開きました';
      } else if (startup.path) {
        mode = 'split';
      }
    } catch {
      // Browser dev mode has no Tauri backend; keep the starter document.
    }
  }

  function toggleMode(): void {
    if (rockLocked) {
      toast = 'RockファイルはView固定です。変更は管理者に相談してください';
      window.setTimeout(() => (toast = ''), 2200);
      return;
    }
    mode = nextMode(mode);
    activeDateKey = '';
    toast = `${modeLabel(mode)} モード`;
    window.setTimeout(() => (toast = ''), 1400);
  }

  function toggleTheme(): void {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }

  function createBlankDocument(): void {
    source = '# New RoDots\n\n';
    mode = 'split';
    toast = '新規ドキュメント';
    window.setTimeout(() => (toast = ''), 1400);
  }

  function openGithub(): void {
    window.open(githubUrl, '_blank', 'noopener,noreferrer');
  }

  function zoneGadgets(zone: GadgetZone) {
    return gadgetConfig.filter((gadget) => gadget.visible && gadget.zone === zone);
  }

  async function loadPortableConfig(): Promise<void> {
    if (!('__TAURI_INTERNALS__' in window)) return;

    try {
      const raw = await getPortableConfig();
      if (!raw) return;

      const config = JSON.parse(raw) as { gadgets?: unknown; theme?: unknown };
      if (Array.isArray(config.gadgets)) {
        const nextGadgets = config.gadgets.filter(isGadgetConfig);
        if (nextGadgets.length > 0) gadgetConfig = nextGadgets;
      }
      if (config.theme === 'dark' || config.theme === 'light') {
        theme = config.theme;
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
    } catch {
      toast = '共有設定を読み込めませんでした';
      window.setTimeout(() => (toast = ''), 2200);
    }
  }

  function isGadgetConfig(value: unknown): value is GadgetConfig {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    return isGadgetId(candidate.id) && isGadgetZone(candidate.zone) && typeof candidate.visible === 'boolean';
  }

  function isGadgetId(value: unknown): value is GadgetId {
    return typeof value === 'string' && gadgetIds.includes(value as GadgetId);
  }

  function isGadgetZone(value: unknown): value is GadgetZone {
    return typeof value === 'string' && gadgetZones.includes(value as GadgetZone);
  }

  function setInput(alias: string, value: string): void {
    inputValues = { ...inputValues, [alias]: value };
  }

  async function copyText(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
    toast = 'コピーしました';
    window.setTimeout(() => (toast = ''), 1600);
  }

  function dateTokenKey(token: Extract<InlineToken, { kind: 'date' }>, blockIndex: number, tokenIndex: number): string {
    return `${blockIndex}:${token.alias ?? 'date'}:${token.text}:${tokenIndex}`;
  }

  function openDateEditor(token: Extract<InlineToken, { kind: 'date' }>, blockIndex: number, tokenIndex: number): void {
    activeDateKey = dateTokenKey(token, blockIndex, tokenIndex);
  }

  function changeDate(token: Extract<InlineToken, { kind: 'date' }>, value: string): void {
    if (!value) return;
    source = updateDateBaseInSource(source, token.alias, value, token.offsetAmount, token.offsetUnit);
    activeDateKey = '';
  }

  async function openLink(token: Extract<InlineToken, { kind: 'link' }>): Promise<void> {
    if (token.linkType === 'file') {
      try {
        await openLocalPath(token.href);
        linkStates = { ...linkStates, [token.href]: 'ok' };
      } catch {
        linkStates = { ...linkStates, [token.href]: 'error' };
      }
      return;
    }

    window.open(token.href, '_blank', 'noopener,noreferrer');
    void refreshUrl(token.href);
  }

  async function refreshUrl(url: string): Promise<void> {
    linkStates = { ...linkStates, [url]: 'pending' };
    try {
      const result = await checkAndCacheUrl(url);
      linkStates = { ...linkStates, [url]: result.ok ? 'ok' : 'error' };
      if (result.cached_at) {
        cacheMeta = { ...cacheMeta, [url]: `${result.cached_at} 取得キャッシュ` };
      }
    } catch {
      linkStates = { ...linkStates, [url]: 'error' };
    }
  }

  async function backupCache(): Promise<void> {
    const destination = window.prompt('保存先ZIPファイルのパス', 'rawdots-cache.zip');
    if (!destination) return;
    const saved = await exportCacheZip(destination);
    toast = `バックアップ: ${saved}`;
  }

  async function restoreCache(): Promise<void> {
    const sourceFile = window.prompt('復元するZIPファイルのパス', 'rawdots-cache.zip');
    if (!sourceFile) return;
    const restored = await importCacheZip(sourceFile);
    toast = `復元: ${restored}`;
  }

  async function openBreadcrumbTarget(target: string): Promise<void> {
    if (target.startsWith('http')) {
      window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      await openLocalPath(target);
    } catch {
      toast = 'パンくずの場所を開けませんでした';
    }
  }

  async function openCurrentLocation(): Promise<void> {
    if (!currentFilePath) {
      toast = '開いている.rdotファイルがありません';
      window.setTimeout(() => (toast = ''), 1800);
      return;
    }

    const parts = currentFilePath.split(/[\\/]/);
    parts.pop();
    const folder = parts.join('\\');

    try {
      await openLocalPath(folder || currentFilePath);
    } catch {
      toast = 'ファイルの場所を開けませんでした';
      window.setTimeout(() => (toast = ''), 1800);
    }
  }

  async function openAppLocation(): Promise<void> {
    try {
      await openAppDirectory();
    } catch {
      toast = 'アプリの場所を開けませんでした';
      window.setTimeout(() => (toast = ''), 1800);
    }
  }

  async function openCacheLocation(): Promise<void> {
    try {
      await openCacheDirectory();
    } catch {
      toast = 'ローカルキャッシュを開けませんでした';
      window.setTimeout(() => (toast = ''), 1800);
    }
  }

  async function saveTemplate(template: FileTemplateId): Promise<void> {
    const fileName = buildTemplateFileName(template);
    const path = currentFilePath || window.prompt('保存先に使う既存ファイルパス、または保存先フォルダ', '');
    if (!path) return;

    currentFilePath = await saveWithTemplate(path, source, fileName);
    toast = `保存: ${fileName}`;
  }

  function buildTemplateFileName(template: FileTemplateId): string {
    const project = parsed.meta.project || parsed.aliases.project || 'プロジェクト';
    const author = parsed.aliases.owner || parsed.meta.author || '作成者';
    const version = parsed.meta.version || parsed.aliases.version || '1.0.0';
    const date = parsed.aliases.meeting_date || new Date().toISOString().slice(0, 10);

    if (template === 'report') return `報告書_${author}_${toWarekiFileDate(date)}.rdot`;
    if (template === 'spec') return `【仕様書】${project}_(v${version}).rdot`;
    return `${toCompactFileDate(date)}_${project}_議事録.rdot`;
  }

  function toCompactFileDate(text: string): string {
    const iso = toIsoInputValue(text);
    return iso ? iso.replaceAll('-', '') : '日付未設定';
  }

  function toWarekiFileDate(text: string): string {
    const iso = toIsoInputValue(text);
    if (!iso) return text || '日付未設定';
    const [year, month, day] = iso.split('-').map(Number);
    return `令和${year - 2018}年${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日`;
  }

  function toIsoInputValue(text: string): string {
    const reiwa = /令和(\d+)年(\d{1,2})月(\d{1,2})日/.exec(text);
    if (reiwa) return `${Number(reiwa[1]) + 2018}-${reiwa[2].padStart(2, '0')}-${reiwa[3].padStart(2, '0')}`;

    const iso = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
    if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

    return '';
  }

  function blockClass(block: Block): string {
    if (block.kind === 'heading' && block.level === 1) return 'text-3xl font-semibold text-stone-50';
    if (block.kind === 'heading' && block.level === 2) return 'text-2xl font-semibold text-stone-100';
    if (block.kind === 'heading') return 'text-xl font-semibold text-stone-100';
    if (block.kind === 'list') return 'ml-4 list-item list-disc text-stone-200';
    return 'leading-7 text-stone-200';
  }

  function linkClass(href: string): string {
    const state = linkStates[href] ?? 'pending';
    return `cursor-pointer break-all text-cyan-300 rawdots-link-${state}`;
  }
</script>

<svelte:head>
  <title>RoDots</title>
</svelte:head>

<main class={`grid h-full grid-rows-[auto_1fr_auto] ${themeClass}`}>
  <header class="flex min-h-14 items-center justify-between border-b border-stone-800 bg-[#17191b] px-4">
    <div class="flex items-center gap-3">
      <div class="grid size-8 place-items-center rounded bg-cyan-500 text-sm font-black text-[#101113]">R</div>
      <div>
        <h1 class="text-sm font-semibold tracking-normal">RoDots</h1>
        <p class="text-xs text-stone-400">Markdown with human-sized variables</p>
      </div>
      {#each headerLeftGadgets as widget}
        {#if widget.id === 'breadcrumbs'}
          <Breadcrumbs meta={parsed.meta} openTarget={openBreadcrumbTarget} />
        {:else if widget.id === 'today'}
          <DateTimeGadget variant="date" />
        {:else if widget.id === 'clock'}
          <DateTimeGadget variant="datetime" />
        {/if}
      {/each}
    </div>

    <div class="flex items-center gap-2">
      {#each headerRightGadgets as widget}
        {#if widget.id === 'fileTemplates'}
          <FileTemplateMenu onSave={saveTemplate} />
        {:else if widget.id === 'openLocation'}
          <button class="grid size-9 place-items-center rounded border border-stone-700 text-stone-300 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50" title="開いているファイルの場所を開く" disabled={!currentFilePath} on:click={openCurrentLocation}>
            <FolderOpen size={16} />
          </button>
        {:else if widget.id === 'openAppLocation'}
          <button class="grid size-9 place-items-center rounded border border-stone-700 text-stone-300 hover:bg-stone-800" title="実行中アプリの場所を開く" on:click={openAppLocation}>
            <HardDrive size={16} />
          </button>
        {:else if widget.id === 'openCacheLocation'}
          <button class="grid size-9 place-items-center rounded border border-stone-700 text-stone-300 hover:bg-stone-800" title="ローカルキャッシュの場所を開く" on:click={openCacheLocation}>
            <Database size={16} />
          </button>
        {:else if widget.id === 'ambientTimer'}
          <AmbientTimer />
        {:else if widget.id === 'today'}
          <DateTimeGadget variant="date" />
        {:else if widget.id === 'clock'}
          <DateTimeGadget variant="datetime" />
        {:else if widget.id === 'cacheActions'}
          {#if unresolvedCount > 0}
            <span class="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
              TODO残あり: {unresolvedCount}
            </span>
          {/if}
          <button class="grid size-9 place-items-center rounded border border-stone-700 text-stone-300 hover:bg-stone-800" title="キャッシュをバックアップ" on:click={backupCache}>
            <Download size={16} />
          </button>
          <button class="grid size-9 place-items-center rounded border border-stone-700 text-stone-300 hover:bg-stone-800" title="キャッシュを復元" on:click={restoreCache}>
            <Upload size={16} />
          </button>
        {:else if widget.id === 'themeToggle'}
          <button class="grid size-9 place-items-center rounded border border-stone-700 text-stone-300 hover:bg-stone-800" title="ライト/ダーク切替" on:click={toggleTheme}>
            {#if theme === 'dark'}
              <Moon size={16} />
            {:else}
              <Sun size={16} />
            {/if}
          </button>
        {:else if widget.id === 'modeSwitch'}
          <button
            class="inline-flex h-9 items-center gap-2 rounded border border-cyan-700/60 bg-cyan-950/30 px-3 text-xs font-medium text-cyan-100 hover:bg-cyan-900/50 disabled:cursor-not-allowed disabled:opacity-70"
            title={rockLocked ? 'RockファイルはView固定です' : 'Ctrl+Mでモード切替'}
            disabled={rockLocked}
            on:click={toggleMode}
          >
            {#if rockLocked}
              <Lock size={15} />
            {:else if mode === 'view'}
              <Eye size={15} />
            {:else if mode === 'edit'}
              <Pencil size={15} />
            {:else}
              <PanelsTopLeft size={15} />
            {/if}
            <span>{rockLocked ? 'Rock' : modeLabel(mode)}</span>
            {#if startedFromViewFile && !rockLocked}
              <span class="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-300">view file</span>
            {/if}
          </button>
        {/if}
      {/each}
    </div>
  </header>

  <section class={workspaceClass}>
    {#if showEditor}
    <div class={`grid min-h-0 grid-rows-[auto_1fr] ${mode === 'split' ? 'border-r border-stone-800' : ''}`}>
      <div class="flex h-11 items-center justify-between border-b border-stone-800 px-4 text-xs uppercase text-stone-400">
        <span>Editor</span>
        <span>{currentFilePath ? currentFilePath.split(/[\\/]/).at(-1) : `${source.length} chars`}</span>
      </div>
      <textarea
        class="h-full w-full resize-none bg-[#111315] p-5 font-mono text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-600"
        bind:value={source}
        spellcheck="false"
      ></textarea>
    </div>
    {/if}

    {#if showPreview}
    <div class="grid min-h-0 grid-rows-[auto_1fr]">
      <div class="flex h-11 items-center justify-between border-b border-stone-800 px-4 text-xs uppercase text-stone-400">
        <span>{mode === 'view' ? 'View' : 'Preview'}</span>
        {#if toast}<span class="normal-case text-cyan-200">{toast}</span>{/if}
      </div>

      <article class="overflow-auto bg-[#151719] p-6">
        {#if showWelcome}
          <div class="mx-auto flex min-h-full max-w-3xl flex-col justify-center py-16">
            <div class="space-y-6">
              <div class="flex items-center gap-4">
                <div class="grid size-14 place-items-center rounded bg-cyan-500 text-2xl font-black text-[#101113]">R</div>
                <div>
                  <h2 class="text-4xl font-semibold text-stone-50">RoDots</h2>
                  <p class="mt-1 text-sm text-stone-400">Robots の手前にある、現場のための従順なドキュメント。</p>
                </div>
              </div>

              <div class="grid gap-3 text-sm leading-7 text-stone-300">
                <p>.rdot は、編集者が作り、実行者が迷わず使うための軽い業務文書です。</p>
                <p>View、Split、Edit、Rock のモードで、作る人と使う人の距離を少し縮めます。</p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <button class="rounded border border-cyan-700/60 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-900/50" on:click={createBlankDocument}>
                  新規作成
                </button>
                <button class="rounded border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:bg-stone-800" on:click={openGithub}>
                  GitHub
                </button>
                <span class="text-xs text-stone-500">{githubUrl}</span>
              </div>
            </div>
          </div>
        {:else}
        <div class="mx-auto max-w-3xl space-y-4">
          {#each parsed.blocks as block, blockIndex}
            {#if block.kind === 'blank'}
              <div class="h-2"></div>
            {:else if block.kind === 'code'}
              <pre class="overflow-auto rounded border border-stone-800 bg-[#0c0d0e] p-4 font-mono text-sm text-stone-300">{block.text}</pre>
            {:else}
              <div class={blockClass(block)}>
                {#each block.tokens as token, tokenIndex}
                  {#if token.kind === 'text'}
                    <span>{token.text}</span>
                  {:else if token.kind === 'copy'}
                    <span class="inline-flex items-center gap-1 rounded border border-cyan-700/60 bg-cyan-950/40 px-1.5 py-0.5 text-cyan-100">
                      {token.text}
                      <button class="grid size-6 place-items-center rounded text-cyan-200 hover:bg-cyan-800/60" title="値をコピー" on:click={() => copyText(token.text)}>
                        <Clipboard size={13} />
                      </button>
                    </span>
                  {:else if token.kind === 'date'}
                    <span class="relative inline-flex items-center gap-1 rounded border border-cyan-700/60 bg-cyan-950/40 px-1.5 py-0.5 text-cyan-100">
                      <button class="text-cyan-100 hover:text-white" title="日付を変更" on:click={() => openDateEditor(token, blockIndex, tokenIndex)}>
                        {token.text}
                      </button>
                      {#if token.copy}
                        <button class="grid size-6 place-items-center rounded text-cyan-200 hover:bg-cyan-800/60" title="値をコピー" on:click={() => copyText(token.text)}>
                          <Clipboard size={13} />
                        </button>
                      {/if}
                      {#if activeDateKey === dateTokenKey(token, blockIndex, tokenIndex)}
                        <input
                          class="absolute left-0 top-8 z-10 rounded border border-cyan-500 bg-[#202225] px-2 py-1 text-sm text-stone-100 shadow-xl outline-none"
                          type="date"
                          value={toIsoInputValue(token.text)}
                          on:change={(event) => changeDate(token, event.currentTarget.value)}
                          on:blur={() => (activeDateKey = '')}
                        />
                      {/if}
                    </span>
                  {:else if token.kind === 'input'}
                    <input
                      class="mx-1 inline-block w-44 rounded border border-amber-500/40 bg-[#202225] px-2 py-1 text-sm text-stone-100 outline-none focus:border-amber-300"
                      type={token.inputType}
                      placeholder={token.placeholder}
                      value={token.value}
                      on:input={(event) => setInput(token.alias, event.currentTarget.value)}
                    />
                  {:else if token.kind === 'link'}
                    <button class={linkClass(token.href)} title={cacheMeta[token.href] ?? token.href} on:click={() => openLink(token)}>
                      {token.label}
                    </button>
                    {#if token.linkType === 'web'}
                      <button class="ml-1 inline-grid size-6 place-items-center rounded text-stone-400 hover:bg-stone-800 hover:text-stone-100" title="キャッシュ再取得" on:click={() => refreshUrl(token.href)}>
                        <RefreshCw size={13} />
                      </button>
                    {/if}
                  {/if}
                {/each}
              </div>
            {/if}
          {/each}

          {#if Object.keys(parsed.aliases).length > 0}
            <section class="mt-8 border-t border-stone-800 pt-4">
              <h2 class="mb-3 text-xs uppercase text-stone-500">Aliases</h2>
              <div class="grid gap-2 text-sm">
                {#each Object.entries(parsed.aliases) as [alias, value]}
                  <div class="flex min-h-8 items-center justify-between rounded border border-stone-800 bg-[#111315] px-3">
                    <code class="text-cyan-300">@{alias}</code>
                    <span class="text-stone-300">{value || '未入力'}</span>
                  </div>
                {/each}
              </div>
            </section>
          {/if}
        </div>
        {/if}
      </article>
    </div>
    {/if}
  </section>

  <footer class="flex min-h-10 items-center justify-between border-t border-stone-800 bg-[#17191b] px-4">
    <div class="flex items-center gap-2">
      {#each footerLeftGadgets as widget}
        {#if widget.id === 'today'}
          <DateTimeGadget variant="date" />
        {:else if widget.id === 'clock'}
          <DateTimeGadget variant="datetime" />
        {:else if widget.id === 'breadcrumbs'}
          <Breadcrumbs meta={parsed.meta} openTarget={openBreadcrumbTarget} />
        {:else if widget.id === 'openLocation'}
          <button class="grid size-8 place-items-center rounded border border-stone-700 text-stone-300 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50" title="開いているファイルの場所を開く" disabled={!currentFilePath} on:click={openCurrentLocation}>
            <FolderOpen size={14} />
          </button>
        {:else if widget.id === 'openAppLocation'}
          <button class="grid size-8 place-items-center rounded border border-stone-700 text-stone-300 hover:bg-stone-800" title="実行中アプリの場所を開く" on:click={openAppLocation}>
            <HardDrive size={14} />
          </button>
        {:else if widget.id === 'openCacheLocation'}
          <button class="grid size-8 place-items-center rounded border border-stone-700 text-stone-300 hover:bg-stone-800" title="ローカルキャッシュの場所を開く" on:click={openCacheLocation}>
            <Database size={14} />
          </button>
        {/if}
      {/each}
    </div>
    <div class="flex items-center gap-2">
      {#each footerRightGadgets as widget}
        {#if widget.id === 'today'}
          <DateTimeGadget variant="date" />
        {:else if widget.id === 'clock'}
          <DateTimeGadget variant="datetime" />
        {:else if widget.id === 'breadcrumbs'}
          <Breadcrumbs meta={parsed.meta} openTarget={openBreadcrumbTarget} />
        {:else if widget.id === 'openLocation'}
          <button class="grid size-8 place-items-center rounded border border-stone-700 text-stone-300 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50" title="開いているファイルの場所を開く" disabled={!currentFilePath} on:click={openCurrentLocation}>
            <FolderOpen size={14} />
          </button>
        {:else if widget.id === 'openAppLocation'}
          <button class="grid size-8 place-items-center rounded border border-stone-700 text-stone-300 hover:bg-stone-800" title="実行中アプリの場所を開く" on:click={openAppLocation}>
            <HardDrive size={14} />
          </button>
        {:else if widget.id === 'openCacheLocation'}
          <button class="grid size-8 place-items-center rounded border border-stone-700 text-stone-300 hover:bg-stone-800" title="ローカルキャッシュの場所を開く" on:click={openCacheLocation}>
            <Database size={14} />
          </button>
        {/if}
      {/each}
    </div>
  </footer>
</main>
