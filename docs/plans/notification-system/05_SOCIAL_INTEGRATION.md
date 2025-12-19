# Phase 5: Social/RANK Integration

## Overview

Integrate the notification system with RANK voting to notify users of social activity related to their profiles.

**Priority**: P3 (Lower)
**Estimated Effort**: 0.5 days
**Dependencies**: Phase 1 (Settings Page)
**Coordination**: Should be done alongside `unified-remaining-tasks` Phase 2 (Social/RANK)

---

## Goals

1. Notify users when they receive votes on their linked profiles
2. Notify users when their votes are confirmed
3. Link notifications to profile pages

---

## 1. RANK Store Integration

### Update: `stores/rank.ts` (or equivalent)

Add notification triggers for RANK voting events.

```ts
// Add import at top of file
import { useNotificationStore } from './notifications'

// When user's linked profile receives a vote
function onVoteReceived(profile: RankProfile, vote: Vote) {
  const notificationStore = useNotificationStore()

  const voteType = vote.amount > 0 ? 'upvote' : 'downvote'
  const amount = Math.abs(vote.amount)

  notificationStore.addNotification({
    type: 'social',
    title: `New ${voteType}`,
    message: `Your ${profile.platform} profile received ${amount} XPI ${voteType}`,
    actionUrl: `/explore/social/${profile.platform}/${profile.handle}`,
    actionLabel: 'View Profile',
    data: {
      profileId: profile.id,
      platform: profile.platform,
      handle: profile.handle,
      amount: vote.amount,
    },
  })
}

// When user's vote is confirmed on-chain
function onVoteConfirmed(profile: RankProfile, txid: string, amount: number) {
  const notificationStore = useNotificationStore()

  const voteType = amount > 0 ? 'upvote' : 'downvote'

  notificationStore.addNotification({
    type: 'social',
    title: 'Vote Confirmed',
    message: `Your ${voteType} for @${profile.handle} is confirmed`,
    actionUrl: `/explore/explorer/tx/${txid}`,
    actionLabel: 'View Transaction',
    data: {
      profileId: profile.id,
      txid,
      amount,
    },
  })
}

// When user claims/links a profile
function onProfileLinked(profile: RankProfile) {
  const notificationStore = useNotificationStore()

  notificationStore.addNotification({
    type: 'system',
    title: 'Profile Linked',
    message: `Your ${profile.platform} profile @${profile.handle} is now linked`,
    actionUrl: `/explore/social/${profile.platform}/${profile.handle}`,
    actionLabel: 'View Profile',
    data: {
      profileId: profile.id,
      platform: profile.platform,
      handle: profile.handle,
    },
  })
}
```

---

## 2. Polling for Incoming Votes

Since RANK votes are on-chain, the wallet needs to poll or subscribe to detect incoming votes.

### Strategy Options

1. **Chronik WebSocket**: Subscribe to the profile's RANK address for incoming transactions
2. **RANK API Polling**: Periodically check the RANK API for new votes
3. **On-demand**: Only show notifications when user visits the social page

### Recommended: RANK API Polling

```ts
// In stores/rank.ts or a service

const POLL_INTERVAL = 60000 // 1 minute

let pollInterval: ReturnType<typeof setInterval> | null = null

function startVotePolling(linkedProfiles: RankProfile[]) {
  if (pollInterval) return

  pollInterval = setInterval(async () => {
    for (const profile of linkedProfiles) {
      const newVotes = await checkForNewVotes(profile)

      for (const vote of newVotes) {
        onVoteReceived(profile, vote)
      }
    }
  }, POLL_INTERVAL)
}

function stopVotePolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

async function checkForNewVotes(profile: RankProfile): Promise<Vote[]> {
  // Call RANK API to get recent votes
  // Compare with last known vote timestamp
  // Return only new votes
  const lastCheck = profile.lastVoteCheck || 0
  const votes = await rankApi.getVotes(profile.platform, profile.handle, {
    since: lastCheck,
  })

  // Update last check timestamp
  profile.lastVoteCheck = Date.now()

  return votes
}
```

---

## 3. Linked Profile Management

Users need to link their social profiles to receive vote notifications.

### Profile Linking Flow

1. User navigates to their profile on the social page
2. User clicks "Claim this profile"
3. User completes verification (e.g., tweet with wallet address)
4. Profile is linked and vote notifications are enabled

### Store State

```ts
interface RankState {
  linkedProfiles: RankProfile[]
  // ...
}

interface RankProfile {
  id: string
  platform: 'twitter' | 'youtube' | 'github' | 'telegram'
  handle: string
  verified: boolean
  lastVoteCheck: number
}
```

---

## 4. Notification Preferences

The social notification preference already exists in the notification store. Ensure it's respected:

```ts
// In onVoteReceived
function onVoteReceived(profile: RankProfile, vote: Vote) {
  const notificationStore = useNotificationStore()

  // This check is done inside addNotification, but we can also check here
  // to avoid unnecessary processing
  if (!notificationStore.preferences.social) {
    return
  }

  notificationStore.addNotification({
    type: 'social',
    // ...
  })
}
```

---

## 5. Implementation Checklist

### RANK Store Updates

- [ ] Import `useNotificationStore` in rank store
- [ ] Add notification for incoming votes
- [ ] Add notification for confirmed votes
- [ ] Add notification for profile linking

### Vote Polling

- [ ] Implement vote polling for linked profiles
- [ ] Track last vote check timestamp
- [ ] Start/stop polling based on linked profiles

### Profile Linking

- [ ] Implement profile linking flow (if not already present)
- [ ] Store linked profiles in state
- [ ] Enable vote notifications for linked profiles

### Testing

- [ ] Test vote notification appears for linked profile
- [ ] Test clicking notification navigates to profile page
- [ ] Test notification preferences are respected
- [ ] Test polling starts/stops correctly

---

## Notes

- This phase depends on the RANK API being available
- Profile linking is a prerequisite for receiving vote notifications
- Polling interval should be configurable or adaptive
- Consider using WebSocket if RANK API supports it in the future
- This phase should be coordinated with `unified-remaining-tasks` Phase 2

---

## Completion

This is the final phase of the notification system implementation plan. After completing all phases:

1. Update STATUS.md to mark all phases complete
2. Run final verification tests
3. Update the `unified-remaining-tasks` and `unified-p2p-musig2-ui` plans to reference this completed work
