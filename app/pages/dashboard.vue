<template>
  <div class="page">
    <div class="card dashboard-card fade-in">
      <div class="card-header">
        <h2>Your Drops</h2>
        <NuxtLink to="/" class="btn-text">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
          Back to Upload
        </NuxtLink>
      </div>

      <div v-if="history.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4"/>
          <path d="M12 16h.01"/>
        </svg>
        <p>No uploads yet.</p>
        <NuxtLink to="/" class="btn btn-primary mt-4">Start Sharing</NuxtLink>
      </div>

      <div v-else class="drops-list">
        <div v-for="item in history" :key="item.id" class="drop-item">
          <div class="drop-info">
            <div class="drop-main">
              <span class="drop-name">{{ item.name }}</span>
              <span class="drop-size">{{ formatSize(item.size) }}</span>
            </div>
            <div class="drop-meta">
              <span>{{ new Date(item.date).toLocaleDateString() }}</span>
              <span class="status-badge" :class="getStatusClass(item.id)">
                {{ getStatusText(item.id) }}
              </span>
            </div>
          </div>
          
          <div class="drop-actions">
            <button class="btn-icon" @click="copyLink(item.url)" title="Copy Link">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            </button>
            <button 
              v-if="item.deleteToken" 
              class="btn-icon btn-delete" 
              @click="deleteFile(item)"
              :disabled="isDeleting(item.id)"
              title="Delete File"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useLocalStorage, useClipboard } from '@vueuse/core'

const history = useLocalStorage('drop-history', [])
const { copy } = useClipboard()

const statuses = ref({}) // { id: 'active' | 'expired' | 'deleted' | 'loading' }
const deletingIds = ref(new Set())

// Format file size
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function copyLink(url) {
  copy(url)
  // Optional: Show toast
}

function isDeleting(id) {
  return deletingIds.value.has(id)
}

function getStatusText(id) {
  const s = statuses.value[id]
  if (s === 'loading') return 'Checking...'
  if (s === 'active') return 'Active'
  if (s === 'expired') return 'Expired' 
  if (s === 'deleted') return 'Deleted'
  return 'Unknown'
}

function getStatusClass(id) {
  const s = statuses.value[id]
  if (s === 'active') return 'status-active'
  if (s === 'expired') return 'status-expired'
  if (s === 'deleted') return 'status-deleted'
  return 'status-loading'
}

// Check status of all items
async function checkStatuses() {
  for (const item of history.value) {
    if (!statuses.value[item.id]) {
      statuses.value[item.id] = 'loading'
      try {
        const response = await fetch(`/api/file/${item.id}`)
        if (response.ok) {
          statuses.value[item.id] = 'active'
        } else if (response.status === 410) {
          statuses.value[item.id] = 'expired'
        } else {
          statuses.value[item.id] = 'deleted'
        }
      } catch (e) {
        statuses.value[item.id] = 'deleted'
      }
    }
  }
}

// Delete file
async function deleteFile(item) {
  if (!confirm(`Are you sure you want to delete ${item.name}? This cannot be undone.`)) return
  
  deletingIds.value.add(item.id)
  try {
    const response = await fetch(`/api/file/${item.id}`, {
      method: 'DELETE',
      headers: {
        'x-delete-token': item.deleteToken
      }
    })
    
    if (response.ok) {
      statuses.value[item.id] = 'deleted'
    } else {
      alert('Failed to delete file')
    }
  } catch (err) {
    console.error('Delete failed:', err)
    alert('Failed to delete file')
  } finally {
    deletingIds.value.delete(item.id)
  }
}

onMounted(() => {
  checkStatuses()
})
</script>

<style scoped>
.dashboard-card {
  width: 100%;
  max-width: 600px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.card-header h2 {
  font-size: 1.5rem;
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.drops-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.drop-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  transition: all 0.2s;
}

.drop-item:hover {
  border-color: var(--border-color);
  background: rgba(255, 255, 255, 0.05);
}

.drop-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
  margin-right: 1rem;
}

.drop-main {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.drop-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drop-size {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.drop-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.status-badge {
  padding: 0.1rem 0.5rem;
  border-radius: 100px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-loading { background: var(--bg-secondary); color: var(--text-muted); }
.status-active { background: rgba(74, 222, 128, 0.1); color: var(--accent-green); }
.status-expired { background: rgba(248, 113, 113, 0.1); color: var(--accent-red); }
.status-deleted { background: var(--bg-secondary); color: var(--text-muted); text-decoration: line-through; }

.drop-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-delete:hover {
  color: var(--accent-red);
  background: rgba(248, 113, 113, 0.1);
}

.btn-text {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.btn-text:hover {
  color: var(--text-primary);
}
</style>
