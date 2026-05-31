<script lang="ts">
  import { Save } from 'lucide-svelte';
  import type { FileTemplateId } from '../lib/fileTemplates';

  export let onSave: (template: FileTemplateId) => void = () => {};

  let selected: FileTemplateId = 'minutes';
</script>

<div class="flex items-center gap-1">
  <select class="h-9 rounded border border-stone-700 bg-[#202225] px-2 text-xs text-stone-200 outline-none" bind:value={selected} title="テンプレート名で保存">
    <option value="minutes">議事録</option>
    <option value="report">報告書</option>
    <option value="spec">仕様書</option>
  </select>
  <button class="grid size-9 place-items-center rounded border border-stone-700 text-stone-300 hover:bg-stone-800" title="テンプレート名で保存" on:click={() => onSave(selected)}>
    <Save size={16} />
  </button>
</div>
