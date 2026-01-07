<template>
  <div class="page">
    <div class="download-card card fade-in">
      <!-- Loading State -->
      <div v-if="status === 'loading'" class="download-content">
        <div class="loading-icon pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
        </div>
        <p class="text-muted">Retrieving file...</p>
      </div>

      <!-- Ready State -->
      <div v-else-if="status === 'ready'" class="download-content text-center">
        <div class="file-preview">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
            <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
          </svg>
        </div>
        
        <h2>{{ fileInfo?.name }}</h2>
        <p class="file-size text-muted">{{ formatSize(fileInfo?.size || 0) }}</p>
        
        <div class="badges mt-3 mb-4">
          <span class="badge badge-warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            {{ fileInfo?.isUnlimited ? 'Unlimited downloads' : `${fileInfo?.downloadsRemaining} download${fileInfo?.downloadsRemaining === 1 ? '' : 's'} left` }}
          </span>
          <span v-if="fileInfo?.isPasswordProtected" class="badge badge-gold">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Password Protected
          </span>
        </div>
        
        <!-- Password Input (if protected) -->
        <div v-if="fileInfo?.isPasswordProtected" class="password-section mb-4">
          <input 
            v-model="password"
            type="password"
            class="input"
            placeholder="Enter password to decrypt"
          />
          <p v-if="passwordError" class="password-error text-error">{{ passwordError }}</p>
        </div>
        
        <p class="warning-text text-muted mb-4">
          ⚠️ This file will be permanently deleted after you download it.
        </p>
        
        <button 
          class="btn btn-primary w-full" 
          @click="download" 
          :disabled="downloading || (fileInfo?.isPasswordProtected && !password)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
          {{ downloading ? statusText : 'Download & Decrypt' }}
        </button>
      </div>

      <!-- Expired/Not Found State -->
      <div v-else-if="status === 'expired'" class="download-content text-center">
        <div class="expired-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" x2="12" y1="8" y2="12"/>
            <line x1="12" x2="12.01" y1="16" y2="16"/>
          </svg>
        </div>
        
        <h2>File Unavailable</h2>
        <p class="text-muted mb-4">
          This file has either been downloaded, expired, or doesn't exist.
        </p>
        
        <NuxtLink to="/" class="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          Upload a New File
        </NuxtLink>
      </div>

      <!-- Downloaded Success State -->
      <div v-else-if="status === 'downloaded'" class="download-content text-center">
        <div class="success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        
        <h2>Download Complete</h2>
        <p class="text-muted mb-4">
          The file has been deleted from our servers.
        </p>
        
        <NuxtLink to="/" class="btn btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          Upload Another File
        </NuxtLink>
      </div>

      <!-- No Key / Invalid Key State -->
      <div v-else-if="status === 'nokey'" class="download-content text-center">
        <div class="expired-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
          </svg>
        </div>
        
        <h2>Decryption Key Missing</h2>
        <p class="text-muted mb-4">
          This file is encrypted and requires the complete link with the decryption key.
        </p>
        
        <NuxtLink to="/" class="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          Upload a New File
        </NuxtLink>
      </div>
    </div>

    <footer class="footer">
      <NuxtLink to="/" class="footer-link">
        <span class="text-gold">007</span>-Drop
      </NuxtLink>
    </footer>
  </div>
</template>

<script setup>
import { base64ToKey, decryptFile, deriveKeyFromPassword, base64ToSalt, combineKeys } from '~/utils/crypto'

const route = useRoute()
const fileId = route.params.id

// State
const status = ref('loading') // loading | ready | expired | downloaded | nokey | decrypting
const fileInfo = ref(null)
const downloading = ref(false)
const encryptionKey = ref(null)
const statusText = ref('')
const password = ref('')
const passwordError = ref('')

// Format file size
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Fetch file info on mount
onMounted(async () => {
  // Extract encryption key from URL hash
  const hash = window.location.hash.slice(1) // Remove the # prefix
  
  if (!hash) {
    status.value = 'nokey'
    return
  }
  
  try {
    // Parse the encryption key
    encryptionKey.value = await base64ToKey(hash)
  } catch (err) {
    console.error('Invalid encryption key:', err)
    status.value = 'nokey'
    return
  }
  
  try {
    const response = await fetch(`/api/file/${fileId}`)
    
    if (!response.ok) {
      status.value = 'expired'
      return
    }
    
    fileInfo.value = await response.json()
    status.value = 'ready'
  } catch (err) {
    console.error('Error fetching file:', err)
    status.value = 'expired'
  }
})

// Download and decrypt file
async function download() {
  downloading.value = true
  passwordError.value = ''
  statusText.value = 'Fetching encrypted file...'
  
  try {
    // Prepare decryption key (combine with password if protected)
    let decryptKey = encryptionKey.value
    
    if (fileInfo.value?.isPasswordProtected) {
      if (!password.value) {
        passwordError.value = 'Password is required'
        downloading.value = false
        return
      }
      
      statusText.value = 'Deriving key from password...'
      
      // Get salt and derive password key
      const salt = base64ToSalt(fileInfo.value.passwordSalt)
      const passwordKey = await deriveKeyFromPassword(password.value, salt)
      
      // Combine URL key with password key
      decryptKey = await combineKeys(encryptionKey.value, passwordKey)
    }
    
    // Get download URL from API
    const response = await fetch(`/api/download/${fileId}`)
    
    if (!response.ok) {
      status.value = 'expired'
      return
    }
    
    const data = await response.json()
    
    statusText.value = 'Downloading encrypted file...'
    
    // Fetch the actual encrypted file
    const fileResponse = await fetch(data.url)
    if (!fileResponse.ok) {
      throw new Error('Failed to download file')
    }
    
    const encryptedData = await fileResponse.arrayBuffer()
    
    statusText.value = 'Decrypting file...'
    
    // Decrypt the file in browser
    const decryptedBlob = await decryptFile(
      encryptedData,
      decryptKey,
      fileInfo.value?.mimeType || 'application/octet-stream'
    )
    
    statusText.value = 'Preparing download...'
    
    // Create download link for decrypted file
    const url = URL.createObjectURL(decryptedBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileInfo.value?.name || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up
    URL.revokeObjectURL(url)
    
    // Show success
    status.value = 'downloaded'
  } catch (err) {
    console.error('Download error:', err)
    if (err.message?.includes('decrypt') || err.name === 'OperationError') {
      // Decryption failed - likely wrong password
      if (fileInfo.value?.isPasswordProtected) {
        passwordError.value = 'Incorrect password'
        downloading.value = false
        return
      }
      status.value = 'nokey'
    } else {
      status.value = 'expired'
    }
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.download-card {
  width: 100%;
  max-width: 440px;
}

.download-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.loading-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: 1rem;
  color: var(--accent-gold);
}

.file-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: 1.5rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  color: var(--accent-gold);
}

.file-size {
  font-size: 0.9rem;
}

.warning-text {
  font-size: 0.875rem;
  padding: 0.75rem 1rem;
  background: rgba(212, 175, 55, 0.1);
  border-radius: var(--radius-md);
}

.badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.expired-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: 1.5rem;
  background: rgba(248, 113, 113, 0.1);
  border-radius: 50%;
  color: var(--accent-red);
}

.success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: 1.5rem;
  background: rgba(74, 222, 128, 0.1);
  border-radius: 50%;
  color: var(--accent-green);
}

.footer {
  margin-top: 2rem;
  text-align: center;
}

.footer-link {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.footer-link:hover {
  color: var(--accent-gold);
}
</style>
