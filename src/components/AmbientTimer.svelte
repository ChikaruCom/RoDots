<script lang="ts">
  export let initialMinutes = 25;
  export let color = '#26a269';

  let minutes = initialMinutes;
  let startedAt = 0;
  let durationMs = initialMinutes * 60_000;
  let remainingRatio = 1;
  let running = false;
  let timer: number | undefined;

  function start(): void {
    durationMs = Math.max(1, minutes) * 60_000;
    startedAt = Date.now();
    remainingRatio = 1;
    running = true;
    window.clearInterval(timer);
    timer = window.setInterval(tick, 500);
  }

  function tick(): void {
    const elapsed = Date.now() - startedAt;
    remainingRatio = Math.max(0, 1 - elapsed / durationMs);
    if (remainingRatio === 0) {
      running = false;
      window.clearInterval(timer);
    }
  }
</script>

<div class="grid min-w-48 gap-1">
  <div class="h-1.5 overflow-hidden rounded bg-stone-100/90" title="アンビエントタイマー">
    <div class="h-full transition-[width] duration-500" style:background-color={color} style:width={`${remainingRatio * 100}%`}></div>
  </div>
  <div class="flex items-center gap-1">
    <input class="h-7 w-14 rounded border border-stone-700 bg-[#202225] px-2 text-xs text-stone-100 outline-none" type="number" min="1" bind:value={minutes} />
    <input class="h-7 w-8 rounded border border-stone-700 bg-[#202225]" type="color" bind:value={color} title="タイマー色" />
    <button class="h-7 rounded border border-stone-700 px-2 text-xs text-stone-300 hover:bg-stone-800" on:click={start}>
      {running ? 'Reset' : 'Start'}
    </button>
  </div>
</div>
