export const CONFIG = Object.freeze({
  MAX_ITEMS: 99,
  PAGE_SIZE: 50,
  REQUEST_TIMEOUT_MS: 12000,
  CACHE_TTL_MS: 60_000,
  APIS: Object.freeze({
    users: 'https://users.roblox.com',
    friends: 'https://friends.roblox.com',
    avatar: 'https://avatar.roblox.com',
    thumbnails: 'https://thumbnails.roblox.com',
    account: 'https://accountinformation.roblox.com',
    games: 'https://games.roblox.com',
    inventory: 'https://inventory.roblox.com',
    catalog: 'https://catalog.roblox.com'
  }),
  AVATAR_PNG: Object.freeze({
    size: '420x420',
    format: 'Png',
    isCircular: 'false'
  })
});
