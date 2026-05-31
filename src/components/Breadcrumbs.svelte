<script lang="ts">
  import { FolderOpen } from 'lucide-svelte';

  export let meta: Record<string, string> = {};
  export let openTarget: (target: string) => void = () => {};

  $: project = meta.project || 'RoDots';
  $: parent = meta.parent || '';
  $: target = meta.origin || meta.local || '';
</script>

<button class="flex max-w-xl items-center gap-2 truncate rounded border border-stone-800 px-2 py-1 text-sm text-stone-300 hover:bg-stone-800" title={target || project} on:click={() => target && openTarget(target)}>
  <FolderOpen size={15} class="shrink-0 text-cyan-300" />
  <span class="truncate">{project}</span>
  {#if parent}
    <span class="text-stone-600">&gt;</span>
    <span class="truncate text-stone-400">{parent}</span>
  {/if}
</button>
