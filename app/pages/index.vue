<template>
  <div class="page">
    <div class="hero">
      <div class="hero-badge">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>End-to-End Encrypted</span>
      </div>
      
      <h1>
        <span class="text-gold">007</span>-Drop
      </h1>
      
      <p class="hero-subtitle">
        Self-destructing file sharing. Upload once, download once, gone forever.
      </p>
    </div>

    <div class="upload-card card">
      <!-- Upload State -->
      <div v-if="state === 'idle'" class="upload-content">
        <div 
          class="drop-zone"
          :class="{ active: isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="openFilePicker"
        >
          <svg class="drop-zone-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          
          <div class="drop-zone-text">
            <strong>Drop your file here</strong>
            <p class="mt-1 text-muted">or click to browse • Max 50MB</p>
          </div>
        </div>
        
        <input 
          ref="fileInput"
          type="file"
          hidden
          @change="handleFileSelect"
        />
      </div>

      <!-- Ready State - File selected, optional password -->
      <div v-else-if="state === 'ready'" class="upload-content">
        <div class="file-ready-info">
          <div class="file-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
            </svg>
          </div>
          <div class="file-details">
            <p class="file-name">{{ selectedFile?.name }}</p>
            <p class="file-size text-muted">{{ formatSize(selectedFile?.size || 0) }}</p>
          </div>
          <button class="btn btn-icon btn-secondary" @click="reset" title="Remove file">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Optional Password -->
        <div class="password-section">
          <label class="password-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Password Protection (optional)
          </label>
          <input 
            v-model="password"
            type="password"
            class="input"
            placeholder="Leave empty for no password"
          />
          <p class="password-hint text-muted">
            Recipient will need this password to decrypt the file
          </p>
        </div>

        <!-- Download Limit -->
        <div class="download-limit-section">
          <label class="option-label">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            Download Limit
          </label>
          <div class="limit-options">
            <button 
              v-for="option in downloadLimitOptions" 
              :key="option.value"
              class="limit-btn"
              :class="{ active: downloadLimit === option.value }"
              @click="downloadLimit = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <button class="btn btn-primary w-full mt-4" @click="startEncryptAndUpload">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          Encrypt & Upload
        </button>
      </div>

      <!-- Uploading State -->
      <div v-else-if="state === 'uploading'" class="upload-content">
        <div class="uploading-info">
          <div class="file-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
            </svg>
          </div>
          <div class="file-details">
            <p class="file-name">{{ selectedFile?.name }}</p>
            <p class="file-size text-muted">{{ formatSize(selectedFile?.size || 0) }}</p>
          </div>
        </div>
        
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-bar-fill" :style="{ width: `${uploadProgress}%` }"></div>
          </div>
          <p class="progress-text text-muted">{{ statusText }} {{ uploadProgress }}%</p>
        </div>
      </div>

      <!-- Success State -->
      <div v-else-if="state === 'success'" class="upload-content success-content fade-in">
        <div class="success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        
        <h2>File Ready</h2>
        <p class="text-muted mb-3">Share this link. It will self-destruct after 1 download.</p>
        
        <div class="link-box">
          <code>{{ shareUrl }}</code>
          <button class="btn btn-icon btn-secondary" @click="copyLink" :title="copied ? 'Copied!' : 'Copy link'">
            <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
        </div>
        
        <div class="badges mt-3">
          <span class="badge badge-warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Expires in 24 hours
          </span>
          <span class="badge badge-success">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
            </svg>
            1 download remaining
          </span>
        </div>
        
        <button class="btn btn-secondary mt-4 w-full" @click="reset">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
            <path d="M16 21h5v-5"/>
          </svg>
          Upload Another File
        </button>
      </div>

      <!-- Error State -->
      <div v-else-if="state === 'error'" class="upload-content error-content fade-in">
        <div class="error-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/>
          </svg>
        </div>
        
        <h2>Upload Failed</h2>
        <p class="text-muted mb-3">{{ errorMessage }}</p>
        
        <button class="btn btn-primary" @click="reset">Try Again</button>
      </div>
    </div>

    <footer class="footer">
      <p class="text-muted">Files are encrypted and automatically deleted after download or 24 hours.</p>
    </footer>
  </div>
</template>

<script setup>
import { useClipboard } from '@vueuse/core'
import { 
  generateKey, 
  keyToBase64, 
  encryptFile,
  deriveKeyFromPassword,
  generateSalt,
  saltToBase64,
  combineKeys
} from '~/utils/crypto'

// State
const state = ref('idle') // idle | ready | uploading | success | error
const isDragging = ref(false)
const selectedFile = ref(null)
const uploadProgress = ref(0)
const shareUrl = ref('')
const errorMessage = ref('')
const fileInput = ref(null)
const statusText = ref('')
const password = ref('')
const downloadLimit = ref(1)

// Download limit options
const downloadLimitOptions = [
  { value: 1, label: '1' },
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 0, label: '∞' }
]

// Clipboard
const { copy, copied } = useClipboard({ source: shareUrl })

// File size formatter
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Open file picker
function openFilePicker() {
  fileInput.value?.click()
}

// Handle file selection - go to ready state for password input
function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (file) selectFile(file)
}

// Handle drop
function handleDrop(event) {
  isDragging.value = false
  const file = event.dataTransfer.files?.[0]
  if (file) selectFile(file)
}

// Select file and show ready state
function selectFile(file) {
  // Validate file size (50MB max)
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    state.value = 'error'
    errorMessage.value = 'File size exceeds 50MB limit.'
    return
  }
  
  selectedFile.value = file
  password.value = ''
  state.value = 'ready'
}

// Start encrypt and upload
async function startEncryptAndUpload() {
  if (!selectedFile.value) return
  
  const file = selectedFile.value
  state.value = 'uploading'
  uploadProgress.value = 0
  statusText.value = 'Generating encryption key...'
  
  try {
    // Step 1: Generate encryption key
    let key = await generateKey()
    let keyBase64 = await keyToBase64(key)
    let salt = null
    let saltBase64 = null
    
    // Step 1b: If password provided, combine with password-derived key
    if (password.value) {
      statusText.value = 'Deriving key from password...'
      uploadProgress.value = 5
      
      salt = generateSalt()
      saltBase64 = saltToBase64(salt)
      const passwordKey = await deriveKeyFromPassword(password.value, salt)
      key = await combineKeys(key, passwordKey)
    }
    
    uploadProgress.value = 10
    statusText.value = 'Encrypting file...'
    
    // Step 2: Encrypt the file in browser
    const encryptedData = await encryptFile(file, key)
    
    uploadProgress.value = 40
    statusText.value = 'Uploading encrypted file...'
    
    // Step 3: Create encrypted blob with original filename metadata
    const encryptedBlob = new Blob([encryptedData], { type: 'application/octet-stream' })
    
    // Create FormData with encrypted file
    const formData = new FormData()
    formData.append('file', encryptedBlob, file.name + '.encrypted')
    formData.append('originalName', file.name)
    formData.append('originalSize', file.size.toString())
    formData.append('originalType', file.type)
    
    // Add password protection flag and salt
    if (password.value && saltBase64) {
      formData.append('isPasswordProtected', 'true')
      formData.append('passwordSalt', saltBase64)
    }
    
    // Add download limit (0 = unlimited)
    formData.append('downloadLimit', downloadLimit.value.toString())
    
    // Step 4: Upload encrypted blob via API
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    
    uploadProgress.value = 80
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Upload failed')
    }
    
    const data = await response.json()
    
    uploadProgress.value = 100
    statusText.value = 'Done!'
    
    // Step 5: Create share URL with encryption key in fragment
    shareUrl.value = `${window.location.origin}/d/${data.id}#${keyBase64}`
    state.value = 'success'
    
  } catch (err) {
    console.error('Upload error:', err)
    state.value = 'error'
    errorMessage.value = err.message || 'Something went wrong. Please try again.'
  }
}

// Copy link
function copyLink() {
  copy(shareUrl.value)
}

// Reset to initial state
function reset() {
  state.value = 'idle'
  selectedFile.value = null
  uploadProgress.value = 0
  shareUrl.value = ''
  errorMessage.value = ''
  statusText.value = ''
  password.value = ''
  downloadLimit.value = 1
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<style scoped>
.hero {
  text-align: center;
  margin-bottom: 2.5rem;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  color: var(--accent-gold);
  background: var(--accent-gold-dim);
  border-radius: 100px;
  margin-bottom: 1.5rem;
}

.hero-subtitle {
  font-size: 1.15rem;
  color: var(--text-secondary);
  max-width: 400px;
  margin: 1rem auto 0;
}

.upload-card {
  width: 100%;
  max-width: 520px;
}

.upload-content {
  display: flex;
  flex-direction: column;
}

/* Uploading State */
.uploading-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  margin-bottom: 1.5rem;
}

.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  color: var(--accent-gold);
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 0.875rem;
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.progress-text {
  font-size: 0.875rem;
  text-align: center;
}

/* Success State */
.success-content {
  text-align: center;
}

.success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  background: rgba(74, 222, 128, 0.1);
  border-radius: 50%;
  color: var(--accent-green);
}

.badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

/* Error State */
.error-content {
  text-align: center;
}

.error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
  background: rgba(248, 113, 113, 0.1);
  border-radius: 50%;
  color: var(--accent-red);
}

/* Footer */
.footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.875rem;
}

/* File Ready State */
.file-ready-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  margin-bottom: 1.5rem;
}

/* Password Section */
.password-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.password-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.password-hint {
  font-size: 0.8rem;
  margin-top: 0.25rem;
}

/* Download Limit Section */
.download-limit-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.limit-options {
  display: flex;
  gap: 0.5rem;
}

.limit-btn {
  flex: 1;
  padding: 0.6rem 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.limit-btn:hover {
  border-color: var(--accent-gold);
  color: var(--text-primary);
}

.limit-btn.active {
  background: var(--accent-gold);
  border-color: var(--accent-gold);
  color: var(--bg-primary);
}
</style>
