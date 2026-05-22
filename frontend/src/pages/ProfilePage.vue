<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useProfile } from '../composables/useProfile';
import { useAuth } from '../composables/useAuth';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';

const router = useRouter();
const { profile, loading, avatarUploading, error, load, saveProfile, uploadAvatar } = useProfile();
const { deleteAccount, exportMyData } = useAuth();

const editMode = ref(false);
const showDeleteConfirm = ref(false);
const deletingAccount = ref(false);
const exportingData = ref(false);
const deleteError = ref('');
const exportError = ref('');
const formDisplayName = ref('');
const formBio = ref('');
const formTimezone = ref('');
const formErrors = ref<{ displayName?: string; bio?: string; timezone?: string; avatar?: string }>({});
const avatarPreviewUrl = ref<string | null>(null);
const avatarInputEl = ref<HTMLInputElement | null>(null);
function revokeObjectPreview(url: string | null): void {
  if (!url || !url.startsWith('blob:')) return;
  URL.revokeObjectURL(url);
}


onMounted(load);

const resolvedAvatar = computed(
  () => avatarPreviewUrl.value || profile.value?.user.avatarUrl || null,
);

const timezoneOptions = computed(() => {
  if (typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone');
  }
  return ['UTC'];
});

function avatarInitial(): string {
  const name = (profile.value?.user.displayName || profile.value?.user.fullName || '').trim();
  return (name.charAt(0) || 'A').toUpperCase();
}

function startEdit(): void {
  if (!profile.value) return;
  formDisplayName.value = profile.value.user.displayName || profile.value.user.fullName || '';
  formBio.value = profile.value.user.bio || '';
  formTimezone.value = profile.value.user.timezone || 'UTC';
  formErrors.value = {};
  editMode.value = true;
}

function cancelEdit(): void {
  revokeObjectPreview(avatarPreviewUrl.value);
  avatarPreviewUrl.value = null;
  formErrors.value = {};
  editMode.value = false;
}

function validate(): boolean {
  const next: { displayName?: string; bio?: string; timezone?: string } = {};
  const name = formDisplayName.value.trim();
  const bio = formBio.value.trim();
  const timezone = formTimezone.value.trim();

  if (name.length < 2 || name.length > 60) {
    next.displayName = 'Display name must be 2 to 60 characters.';
  }
  if (bio.length > 280) {
    next.bio = 'Bio must be 280 characters or less.';
  }
  if (!timezone || !timezoneOptions.value.includes(timezone)) {
    next.timezone = 'Please choose a valid timezone.';
  }

  formErrors.value = next;
  return Object.keys(next).length === 0;
}

async function save(): Promise<void> {
  if (!validate()) return;
  await saveProfile({
    displayName: formDisplayName.value.trim(),
    bio: formBio.value.trim(),
    timezone: formTimezone.value.trim(),
  });
  editMode.value = false;
}

async function onAvatarSelected(event: Event): Promise<void> {
  formErrors.value = { ...formErrors.value, avatar: undefined };
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowed.has(file.type)) {
    formErrors.value = { ...formErrors.value, avatar: 'Avatar must be jpeg, png, or webp.' };
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    formErrors.value = { ...formErrors.value, avatar: 'Avatar must be 5MB or smaller.' };
    return;
  }

  revokeObjectPreview(avatarPreviewUrl.value);
  avatarPreviewUrl.value = URL.createObjectURL(file);
  try {
    const avatarUrl = await uploadAvatar(file);
    revokeObjectPreview(avatarPreviewUrl.value);
    avatarPreviewUrl.value = avatarUrl;
  } catch {
    revokeObjectPreview(avatarPreviewUrl.value);
    avatarPreviewUrl.value = null;
  } finally {
    if (avatarInputEl.value) {
      avatarInputEl.value.value = '';
    }
  }
}

function openDeleteConfirm(): void {
  deleteError.value = '';
  showDeleteConfirm.value = true;
}

function closeDeleteConfirm(): void {
  if (deletingAccount.value) return;
  showDeleteConfirm.value = false;
  deleteError.value = '';
}

async function confirmDeleteAccount(): Promise<void> {
  if (deletingAccount.value) return;
  deletingAccount.value = true;
  deleteError.value = '';
  try {
    await deleteAccount();
    showDeleteConfirm.value = false;
    await router.replace('/login');
  } catch (err) {
    deleteError.value = err instanceof Error ? err.message : 'Failed to delete account.';
  } finally {
    deletingAccount.value = false;
  }
}

async function downloadMyData(): Promise<void> {
  if (exportingData.value) return;
  exportingData.value = true;
  exportError.value = '';
  try {
    const data = await exportMyData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'astralis-data-export.json';
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    exportError.value = err instanceof Error ? err.message : 'Failed to export data.';
  } finally {
    exportingData.value = false;
  }
}
</script>

<template>
  <AppContainer size="xl">
    <ScreenLayout class="profile-page">
      <section v-if="loading && !profile" class="glass-card state-shell">
        <LoadingSpinner label="Loading profile" />
        <p class="state-subtitle">Aligning your cosmic profile...</p>
      </section>

      <section v-else-if="error" class="glass-card state-shell error-shell" role="alert">
        <h2 class="state-title">Something drifted off course</h2>
        <p class="state error">{{ error }}</p>
      </section>

      <section v-else-if="!profile" class="glass-card state-shell">
        <h2 class="state-title">No profile available</h2>
        <p class="state-subtitle">Create or complete your profile to begin your cosmic journey.</p>
      </section>

      <template v-else>
        <section class="glass-card profile-hero">
          <div class="hero-left">
            <div class="avatar-ring">
              <div v-if="resolvedAvatar" class="avatar-wrap">
                <img :src="resolvedAvatar" alt="Profile avatar" class="avatar" />
              </div>
              <div v-else class="avatar-fallback">{{ avatarInitial() }}</div>
            </div>

            <button
              class="avatar-btn"
              type="button"
              :class="{ disabled: avatarUploading }"
              :disabled="avatarUploading"
              @click="avatarInputEl?.click()"
            >
              {{ avatarUploading ? 'Uploading…' : 'Change avatar' }}
            </button>
            <input
              ref="avatarInputEl"
              id="avatar-input"
              class="hidden-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              :disabled="avatarUploading"
              @change="onAvatarSelected"
            />
            <p v-if="formErrors.avatar" class="field-error">{{ formErrors.avatar }}</p>
          </div>

          <div class="hero-right">
            <p class="hero-kicker">✦ Cosmic Identity</p>
            <h1 class="hero-name">{{ profile.user.displayName || profile.user.fullName }}</h1>
            <p class="email">{{ profile.user.email }}</p>
            <span class="profile-badge">☽ Star Seeker</span>
          </div>
        </section>

        <section v-if="!editMode" class="profile-read">
          <div class="glass-card tile">
            <p class="tile-icon" aria-hidden="true">✧</p>
            <p class="tile-label">Bio</p>
            <p class="tile-value">{{ profile.user.bio || 'No cosmic bio yet.' }}</p>
          </div>
          <div class="glass-card tile">
            <p class="tile-icon" aria-hidden="true">◎</p>
            <p class="tile-label">Timezone</p>
            <p class="tile-value">{{ profile.user.timezone || 'UTC' }}</p>
          </div>
          <div class="glass-card tile">
            <p class="tile-icon" aria-hidden="true">✦</p>
            <p class="tile-label">Email</p>
            <p class="tile-value">{{ profile.user.email || 'Unavailable' }}</p>
          </div>
          <div class="glass-card tile cta-tile">
            <p class="tile-icon" aria-hidden="true">☽</p>
            <p class="tile-label">Profile controls</p>
            <p class="tile-value">Refine your identity and personalize how your chart appears.</p>
            <div class="actions">
              <button class="primary-btn" :disabled="loading" @click="startEdit">Edit Profile</button>
            </div>
          </div>
          <div class="glass-card tile">
            <p class="tile-icon" aria-hidden="true">↓</p>
            <p class="tile-label">Privacy export</p>
            <p class="tile-value">Download your profile, birth data, chart data, subscription status, and preferences as JSON.</p>
            <p v-if="exportError" class="field-error" role="alert">{{ exportError }}</p>
            <div class="actions">
              <button class="secondary-btn" :disabled="loading || exportingData" @click="downloadMyData">
                {{ exportingData ? 'Preparing...' : 'Export my data' }}
              </button>
            </div>
          </div>
          <div class="glass-card tile danger-tile">
            <p class="tile-icon" aria-hidden="true">!</p>
            <p class="tile-label">Account deletion</p>
            <p class="tile-value">
              Permanently remove your account, profile, chart data, notification tokens, and cached
              personalized content.
            </p>
            <div class="actions">
              <button class="danger-btn" :disabled="loading" @click="openDeleteConfirm">Delete Account</button>
            </div>
          </div>
        </section>

        <section v-else class="glass-card profile-edit">
          <div class="edit-head">
            <h2>Edit your cosmic profile</h2>
            <p>Fine-tune the details that guide your celestial experience.</p>
          </div>

          <form class="edit-grid" @submit.prevent="save">
            <label>
              <span>Display name</span>
              <input v-model="formDisplayName" maxlength="60" required />
              <small v-if="formErrors.displayName" class="field-error">{{ formErrors.displayName }}</small>
            </label>

            <label class="field-bio">
              <span>Bio</span>
              <textarea v-model="formBio" maxlength="280" rows="4" />
              <small class="hint">{{ formBio.length }}/280</small>
              <small v-if="formErrors.bio" class="field-error">{{ formErrors.bio }}</small>
            </label>

            <label>
              <span>Timezone</span>
              <select v-model="formTimezone" required>
                <option disabled value="">Select timezone</option>
                <option v-for="tz in timezoneOptions" :key="tz" :value="tz">{{ tz }}</option>
              </select>
              <small v-if="formErrors.timezone" class="field-error">{{ formErrors.timezone }}</small>
            </label>

            <div class="actions">
              <button class="secondary-btn" type="button" :disabled="loading" @click="cancelEdit">Cancel</button>
              <button class="primary-btn" type="submit" :disabled="loading">Save profile</button>
            </div>
          </form>
        </section>
      </template>

      <div v-if="showDeleteConfirm" class="modal-backdrop" role="presentation" @click.self="closeDeleteConfirm">
        <section
          class="glass-card delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <p class="modal-kicker">Permanent action</p>
          <h2 id="delete-account-title">Delete your Astralis account?</h2>
          <p>
            This removes your profile, auth credentials, birth details, chart data, push tokens,
            notification preferences, and personalized cached content tied to your account.
          </p>
          <p>
            If you have an active subscription, also manage cancellation through Apple or Google
            billing settings, or the Stripe billing portal where available.
          </p>
          <p v-if="deleteError" class="field-error" role="alert">{{ deleteError }}</p>
          <div class="modal-actions">
            <button class="secondary-btn" type="button" :disabled="deletingAccount" @click="closeDeleteConfirm">
              Keep account
            </button>
            <button class="danger-btn" type="button" :disabled="deletingAccount" @click="confirmDeleteAccount">
              {{ deletingAccount ? 'Deleting...' : 'Delete permanently' }}
            </button>
          </div>
        </section>
      </div>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.state-shell {
  padding: var(--space-8);
  text-align: center;
  display: grid;
  gap: var(--space-3);
  justify-items: center;
}

.state-title {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--text-primary);
}

.state {
  color: var(--text-secondary);
  font-size: var(--text-md);
}

.state.error {
  color: var(--error);
}

.state-subtitle {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.error-shell {
  border-color: rgba(255, 107, 107, 0.3);
}

.profile-hero {
  padding: var(--space-8);
  display: grid;
  grid-template-columns: minmax(220px, 280px) 1fr;
  gap: var(--space-8);
  align-items: center;
}

.hero-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
}

.avatar-ring {
  width: 138px;
  height: 138px;
  border-radius: 999px;
  padding: 4px;
  background: linear-gradient(135deg, var(--gold), rgba(201, 168, 76, 0.2), var(--gold-light));
  box-shadow: 0 0 35px var(--gold-glow);
}

.avatar-wrap,
.avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  border: 2px solid rgba(14, 12, 30, 0.8);
}

.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 30% 20%, rgba(201, 168, 76, 0.22), rgba(90, 66, 160, 0.2));
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
}

.avatar-btn {
  min-height: 42px;
  min-width: 160px;
  border-radius: var(--radius-md);
  border: 1px solid var(--glass-border-hover);
  background: linear-gradient(135deg, rgba(201, 168, 76, 0.12), rgba(201, 168, 76, 0.04));
  color: var(--gold-light);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.avatar-btn:hover:not(:disabled) {
  border-color: var(--gold-light);
  box-shadow: 0 0 18px var(--gold-glow);
}

.avatar-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--gold-glow);
}

.avatar-btn.disabled {
  opacity: 0.7;
  cursor: wait;
}

.hidden-input {
  display: none;
}

.field-error {
  color: var(--error);
  font-size: var(--text-xs);
}

.hero-right {
  display: grid;
  gap: var(--space-2);
}

.hero-kicker {
  color: var(--gold-light);
  text-transform: uppercase;
  letter-spacing: 1.6px;
  font-size: var(--text-xs);
}

.hero-name {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 2.8rem);
  line-height: 1;
  color: var(--text-primary);
}

.email {
  color: var(--text-secondary);
  word-break: break-word;
}

.profile-badge {
  margin-top: var(--space-2);
  width: fit-content;
  padding: 0.35rem 0.7rem;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  font-size: var(--text-xs);
  color: var(--gold-light);
  background: rgba(201, 168, 76, 0.08);
}

.profile-read {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
}

.tile {
  padding: var(--space-5);
  display: grid;
  gap: var(--space-2);
  min-height: 168px;
  align-content: start;
}

.tile-icon {
  font-size: 1rem;
  color: var(--gold-light);
}

.tile-label {
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

.tile-value {
  color: var(--text-primary);
  font-size: var(--text-md);
  overflow-wrap: anywhere;
}

.cta-tile .tile-value {
  color: var(--text-secondary);
}

.danger-tile {
  border-color: rgba(255, 107, 107, 0.28);
}

.danger-tile .tile-icon,
.danger-tile .tile-label {
  color: var(--error);
}

.profile-edit {
  padding: var(--space-8);
  display: grid;
  gap: var(--space-5);
}

.edit-head h2 {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 4vw, 2rem);
  color: var(--text-primary);
}

.edit-head p {
  color: var(--text-muted);
  margin-top: var(--space-1);
}

.edit-grid {
  display: grid;
  gap: var(--space-4);
}

.edit-grid label {
  display: grid;
  gap: var(--space-2);
}

.edit-grid span {
  color: var(--text-secondary);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 1.2px;
}

.edit-grid input,
.edit-grid textarea,
.edit-grid select {
  width: 100%;
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text-primary);
  border-radius: var(--radius-md);
  padding: 0.72rem 0.8rem;
  font: inherit;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.edit-grid textarea {
  resize: vertical;
  min-height: 120px;
}

.edit-grid input:focus,
.edit-grid textarea:focus,
.edit-grid select:focus {
  outline: none;
  border-color: var(--gold-light);
  box-shadow: 0 0 0 3px var(--gold-glow);
  background: rgba(255, 255, 255, 0.06);
}

.hint {
  color: var(--text-muted);
  font-size: var(--text-xs);
  justify-self: end;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.secondary-btn,
.primary-btn,
.danger-btn {
  min-height: 44px;
  padding: 0.7rem 1.2rem;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.secondary-btn {
  background: transparent;
  color: var(--gold-light);
  border-color: var(--glass-border-hover);
}

.secondary-btn:hover:not(:disabled) {
  border-color: var(--gold-light);
}

.primary-btn {
  background: linear-gradient(135deg, var(--gold), #b8962e);
  color: #1f1300;
  font-weight: 600;
}

.primary-btn:hover:not(:disabled) {
  box-shadow: 0 0 20px var(--gold-glow);
  transform: translateY(-1px);
}

.danger-btn {
  background: rgba(255, 107, 107, 0.14);
  color: #ffb3b3;
  border-color: rgba(255, 107, 107, 0.45);
  font-weight: 700;
}

.danger-btn:hover:not(:disabled) {
  border-color: var(--error);
  box-shadow: 0 0 18px rgba(255, 107, 107, 0.15);
  transform: translateY(-1px);
}

.secondary-btn:disabled,
.primary-btn:disabled,
.danger-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  background: rgba(5, 5, 16, 0.74);
}

.delete-modal {
  width: min(560px, 100%);
  padding: var(--space-8);
  display: grid;
  gap: var(--space-4);
  border-color: rgba(255, 107, 107, 0.32);
}

.delete-modal h2 {
  font-family: var(--font-display);
  font-size: clamp(1.7rem, 5vw, 2.35rem);
  color: var(--text-primary);
}

.delete-modal p {
  color: var(--text-secondary);
}

.modal-kicker {
  color: var(--error) !important;
  text-transform: uppercase;
  letter-spacing: 1.4px;
  font-size: var(--text-xs);
}

.modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

@media (max-width: 980px) {
  .profile-hero {
    grid-template-columns: 1fr;
    gap: var(--space-6);
  }

  .hero-left {
    align-items: flex-start;
  }

  .profile-read {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .profile-hero,
  .profile-edit,
  .state-shell {
    padding: var(--space-5);
  }

  .actions {
    width: 100%;
  }

  .secondary-btn,
  .primary-btn,
  .danger-btn {
    flex: 1 1 100%;
  }
}
</style>
