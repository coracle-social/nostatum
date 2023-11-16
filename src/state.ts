import {nip19} from 'nostr-tools'
import {sortBy, identity, uniq, uniqBy, prop} from 'ramda'
import {batch} from 'hurdak'
import {writable, get} from 'svelte/store'
import {isShareableRelay, Executor, Pool, Relays} from "paravel"

// State

export const people = new Map()

export const events = writable([])

export const cursor = writable(0)


// Fetch helpers

export const day = 86400

export const pool = new Pool()

export const defaultUrls = [
  "wss://purplepag.es",
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://relay.snort.social",
  "wss://relayable.org",
  "wss://nostr.wine",
]

export const getExecutor = urls => new Executor(new Relays(urls.map(url => pool.get(url))))

export const loadPeople = (urls, pubkeys) => {
  const authors = uniq(pubkeys.filter(pk => !people.has(pk)))

  if (authors.length > 0) {
    const executor = getExecutor(urls)

    executor.load([{kinds: [0], authors}], {
      onEvent: (url, e) => {
        try {
          people.set(e.pubkey, JSON.parse(e.content))
        } catch (err) {
          console.error(err)
        }
      },
      onClose: () => {
        executor.target.cleanup()
      }
    })
  }
}

export const loadNotes = async () => {
  const filters = [{kinds: [1], authors: ['baf27a4cc4da49913e7fdecc951fd3b971c9279959af62b02b761a043c33384c']}]

  const relays = [
    "wss://nostr.bitcoiner.social/",
    "wss://nostr.orangepill.dev/",
    "wss://relay.damus.io/",
  ]

  const onEvent = batch(500, chunk => {
    const filtered = chunk.filter(e => !e.tags.find(t => t[0] === "e") && e.content.length > 200)
    const personMatches = uniq(chunk.flatMap(e => e.content.match(/nostr:n(pub|profile)\w+/) || []))
    const pubkeys = personMatches.map(entity => {
      try {
        const {data} = nip19.decode(entity.slice(6))

        return data.pubkey || data
      } catch (e) {
        return null
      }
    })

    loadPeople(["wss://purplepag.es/"], pubkeys.concat(chunk.map(e => e.pubkey)).filter(identity))

    events.update($events => {
      const $cursor = get(cursor)
      const newEvents = uniqBy(prop('id'), [...$events, ...filtered])

      return [
        ...newEvents.slice(0, $cursor + 1),
        ...sortBy(e => -e.created_at, newEvents.slice($cursor + 1)),
      ]
    })
  })

  const executor = getExecutor(relays)

  executor.load(filters, {
    timeout: 5000,
    onEvent: (url, e) => onEvent(e),
    onClose: () => {
      loadPageIfNeeded()

      executor.target.cleanup()
    },
  })
}
