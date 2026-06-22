<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useProfile } from '../composables/useProfile';
import { useAuth } from '../composables/useAuth';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';

const { t } = useI18n();
const router = useRouter();
const { profile, loading, avatarUploading, error, load, saveProfile, uploadAvatar } = useProfile();
const { user, deleteAccount, exportMyData } = useAuth();
const isPremium = computed(() => Boolean(profile.value?.user.isPremium ?? user.value?.isPremium));

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
    next.displayName = t('profile.errDisplayName');
  }
  if (bio.length > 280) {
    next.bio = t('profile.errBio');
  }
  if (!timezone || !timezoneOptions.value.includes(timezone)) {
    next.timezone = t('profile.errTimezone');
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
    formErrors.value = { ...formErrors.value, avatar: t('profile.errAvatarType') };
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    formErrors.value = { ...formErrors.value, avatar: t('profile.errAvatarSize') };
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
    deleteError.value = err instanceof Error ? err.message : t('profile.errDeleteFailed');
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
    exportError.value = err instanceof Error ? err.message : t('profile.errExportFailed');
  } finally {
    exportingData.value = false;
  }
}
</script>

<template>
  <AppContainer size="xl">
    <ScreenLayout class="profile-page">
      <section v-if="loading && !profile" class="glass-card state-shell">
        <LoadingSpinner :label="t('profile.loadingProfile')" />
        <p class="state-subtitle">{{ t('profile.aligning') }}</p>
      </section>

      <section v-else-if="error" class="glass-card state-shell error-shell" role="alert">
        <h2 class="state-title">{{ t('profile.errorTitle') }}</h2>
        <p class="state error">{{ error }}</p>
      </section>

      <section v-else-if="!profile" class="glass-card state-shell">
        <h2 class="state-title">{{ t('profile.noProfileTitle') }}</h2>
        <p class="state-subtitle">{{ t('profile.noProfileHint') }}</p>
      </section>

      <template v-else>
        <section class="glass-card profile-hero">
          <div class="hero-left">
            <div class="avatar-ring">
              <div v-if="resolvedAvatar" class="avatar-wrap">
                <img :src="resolvedAvatar" :alt="t('profile.avatarAlt')" class="avatar" loading="lazy" decoding="async" />
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
              {{ avatarUploading ? t('profile.uploading') : t('profile.changeAvatar') }}
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
            <p class="hero-kicker">✦ {{ t('profile.cosmicIdentity') }}</p>
            <h1 class="hero-name">{{ profile.user.displayName || profile.user.fullName }}</h1>
            <p class="email">{{ profile.user.email }}</p>
            <span class="profile-badge">☽ {{ t('profile.starSeeker') }}</span>
          </div>
        </section>

        <section v-if="!editMode" class="profile-read">
          <div class="glass-card tile">
            <p class="tile-icon" aria-hidden="true">{{ isPremium ? '★' : '☆' }}</p>
            <p class="tile-label">{{ t('profile.membership') }}</p>
            <p class="tile-value">
              <span class="member-badge" :class="isPremium ? 'is-premium' : 'is-free'">
                {{ isPremium ? t('profile.premium') : t('profile.free') }}
              </span>
            </p>
          </div>
          <div class="glass-card tile">
            <p class="tile-icon" aria-hidden="true">✧</p>
            <p class="tile-label">{{ t('profile.bioLabel') }}</p>
            <p class="tile-value">{{ profile.user.bio || t('profile.noBio') }}</p>
          </div>
          <div class="glass-card tile">
            <p class="tile-icon" aria-hidden="true">◎</p>
            <p class="tile-label">{{ t('profile.timezoneLabel') }}</p>
            <p class="tile-value">{{ profile.user.timezone || 'UTC' }}</p>
          </div>
          <div class="glass-card tile">
            <p class="tile-icon" aria-hidden="true">✦</p>
            <p class="tile-label">{{ t('profile.emailLabel') }}</p>
            <p class="tile-value">{{ profile.user.email || t('profile.unavailable') }}</p>
          </div>
          <div class="glass-card tile cta-tile">
            <p class="tile-icon" aria-hidden="true">☽</p>
            <p class="tile-label">{{ t('profile.controls') }}</p>
            <p class="tile-value">{{ t('profile.controlsHint') }}</p>
            <div class="actions">
              <button class="primary-btn" :disabled="loading" @click="startEdit">{{ t('profile.editProfile') }}</button>
            </div>
          </div>
          <div class="glass-card tile">
            <p class="tile-icon" aria-hidden="true">↓</p>
            <p class="tile-label">{{ t('profile.privacyExport') }}</p>
            <p class="tile-value">{{ t('profile.privacyExportHint') }}</p>
            <p v-if="exportError" class="field-error" role="alert">{{ exportError }}</p>
            <div class="actions">
              <button class="secondary-btn" :disabled="loading || exportingData" @click="downloadMyData">
                {{ exportingData ? t('profile.preparing') : t('profile.exportMyData') }}
              </button>
            </div>
          </div>
          <div class="glass-card tile danger-tile">
            <p class="tile-icon" aria-hidden="true">!</p>
            <p class="tile-label">{{ t('profile.accountDeletion') }}</p>
            <p class="tile-value">
              {{ t('profile.accountDeletionHint') }}
            </p>
            <div class="actions">
              <button class="danger-btn" :disabled="loading" @click="openDeleteConfirm">{{ t('profile.deleteAccount') }}</button>
            </div>
          </div>
        </section>

        <section v-else class="glass-card profile-edit">
          <div class="edit-head">
            <h2>{{ t('profile.editTitle') }}</h2>
            <p>{{ t('profile.editHint') }}</p>
          </div>

          <form class="edit-grid" @submit.prevent="save">
            <label>
              <span>{{ t('profile.displayName') }}</span>
              <input v-model="formDisplayName" maxlength="60" required />
              <small v-if="formErrors.displayName" class="field-error">{{ formErrors.displayName }}</small>
            </label>

            <label class="field-bio">
              <span>{{ t('profile.bioLabel') }}</span>
              <textarea v-model="formBio" maxlength="280" rows="4" />
              <small class="hint">{{ formBio.length }}/280</small>
              <small v-if="formErrors.bio" class="field-error">{{ formErrors.bio }}</small>
            </label>

            <label>
              <span>{{ t('profile.timezoneLabel') }}</span>
              <select v-model="formTimezone" required>
                <option disabled value="">{{ t('profile.selectTimezone') }}</option>
                <option v-for="tz in timezoneOptions" :key="tz" :value="tz">{{ tz }}</option>
              </select>
              <small v-if="formErrors.timezone" class="field-error">{{ formErrors.timezone }}</small>
            </label>

            <div class="actions">
              <button class="secondary-btn" type="button" :disabled="loading" @click="cancelEdit">{{ t('profile.cancel') }}</button>
              <button class="primary-btn" type="submit" :disabled="loading">{{ t('profile.saveProfile') }}</button>
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
          <p class="modal-kicker">{{ t('profile.permanentAction') }}</p>
          <h2 id="delete-account-title">{{ t('profile.deleteConfirmTitle') }}</h2>
          <p>
            {{ t('profile.deleteConfirmBody') }}
          </p>
          <p>
            {{ t('profile.deleteSubscriptionNote') }}
          </p>
          <p v-if="deleteError" class="field-error" role="alert">{{ deleteError }}</p>
          <div class="modal-actions">
            <button class="secondary-btn" type="button" :disabled="deletingAccount" @click="closeDeleteConfirm">
              {{ t('profile.keepAccount') }}
            </button>
            <button class="danger-btn" type="button" :disabled="deletingAccount" @click="confirmDeleteAccount">
              {{ deletingAccount ? t('profile.deleting') : t('profile.deletePermanently') }}
            </button>
          </div>
        </section>
      </div>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.member-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.3rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
}
.member-badge.is-premium {
  color: #1a1430;
  background: linear-gradient(135deg, #f4d98b, #c9a84c);
  border-color: rgba(201, 168, 76, 0.6);
}
.member-badge.is-free {
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.05);
}
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
