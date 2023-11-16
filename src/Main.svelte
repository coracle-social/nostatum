<script lang="ts">
  import {onMount} from 'svelte'
  import {derived} from 'svelte/store'
  import {scale} from 'svelte/transition'
  import {events, cursor, loadNotes} from './state'
  import EventCard from './EventCard.svelte'

  const event = derived([events, cursor], ([$events, $cursor]) => $cursor === null ? null : $events[$cursor])

  const prev = () => {
    const cur = $cursor

    cursor.set(null)

    setTimeout(() => cursor.set(cur - 1), 300)
  }

  const next = () => {
    const cur = $cursor

    cursor.set(null)

    setTimeout(() => cursor.set(cur + 1), 300)
  }

  let touch
  let touchX
  let touchT

  const onTouchStart = e => {
    touch = e.touches[0]
    touchX = touch.clientX
    touchT = Date.now()

    card.classList.remove('transition-all')
  }

  const onTouchMove = e => {
    touch = e.touches[0]

    card.style = `left: ${touch.clientX - touchX}px`
  }

  const onTouchEnd = () => {
    const offset = touch.clientX - touchX
    const timing = Date.now() - touchT
    const velocity = Math.abs(offset / timing)
    const showPrev = velocity > 1 && offset > 0 && $cursor > 0
    const showNext = velocity > 1 && offset < 0

    if (showPrev) {
      card.style = `left: 500px`
      prev()
    } else if (showNext) {
      card.style = `left: -500px`
      next()
    } else {
      card.classList.add('transition-all')
      card.style = `left: 0px`
    }
  }

  let card

  onMount(async () => {
    loadNotes()

    document.addEventListener('touchstart', onTouchStart)
    document.addEventListener('touchmove', onTouchMove)
    document.addEventListener('touchend', onTouchEnd)

    window.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    })
  })
</script>

{#if $event}
  <div transition:scale bind:this={card} class="flex max-h-full w-full absolute" style="left: 0px">
    <div
      class="p-12 text-yellow-300 hover:text-green-300 flex-grow flex items-center hidden sm:block cursor-pointer"
      on:click={prev}>
      <i class="fa fa-xl fa-chevron-left" />
    </div>
    <div class="py-8 flex overflow-hidden mx-4 sm:m-0">
      <EventCard event={$event} />
    </div>
    <div
      class="p-12 text-yellow-300 hover:text-green-300 flex-grow flex items-center hidden sm:block cursor-pointer"
      on:click={next}>
      <i class="fa fa-xl fa-chevron-right" />
    </div>
  </div>
{/if}
