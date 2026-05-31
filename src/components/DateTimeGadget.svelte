<script lang="ts">
  import { CalendarDays, Clock } from 'lucide-svelte';
  import { onMount } from 'svelte';

  export let variant: 'date' | 'datetime' = 'date';

  let now = new Date();
  let timer: number | undefined;

  onMount(() => {
    timer = window.setInterval(() => {
      now = new Date();
    }, 1000);

    return () => window.clearInterval(timer);
  });

  $: label =
    variant === 'date'
      ? new Intl.DateTimeFormat('ja-JP', { dateStyle: 'full' }).format(now)
      : new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium', timeStyle: 'medium' }).format(now);
</script>

<div class="inline-flex h-8 items-center gap-2 rounded border border-stone-800 px-2 text-xs text-stone-400">
  {#if variant === 'date'}
    <CalendarDays size={14} class="text-cyan-300" />
  {:else}
    <Clock size={14} class="text-cyan-300" />
  {/if}
  <span>{label}</span>
</div>
