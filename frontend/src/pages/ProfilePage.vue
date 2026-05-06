<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useProfile } from '../composables/useProfile';
import LoadingSpinner from '../components/LoadingSpinner.vue';
import AppContainer from '../components/layout/AppContainer.vue';
import ScreenLayout from '../components/layout/ScreenLayout.vue';

const { profile, loading, avatarUploading, error, load, saveProfile, uploadAvatar } = useProfile();

const editMode = ref(false);
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
</script>

<template>
  <AppContainer size="xl">
    <ScreenLayout class="profile-page">
      <LoadingSpinner v-if="loading && !profile" label="Loading profile" />
      <p v-if="error" class="state error">{{ error }}</p>
      <p v-if="!loading && !profile && !error" class="state">No profile available.</p>

      <template v-if="profile">
        <section class="glass-card profile-top">
          <div class="avatar-col">
            <div v-if="resolvedAvatar" class="avatar-wrap">
              <img :src="resolvedAvatar" alt="Profile avatar" class="avatar" />
            </div>
            <div v-else class="avatar-fallback">{{ avatarInitial() }}</div>
            <label class="avatar-btn" :class="{ disabled: avatarUploading }" for="avatar-input">
              {{ avatarUploading ? 'Uploading…' : 'Change avatar' }}
            </label>
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

          <div class="details-col">
            <div v-if="!editMode" class="view-grid">
              <h1>{{ profile.user.displayName || profile.user.fullName }}</h1>
              <p class="email">{{ profile.user.email }}</p>
              <p class="row"><span class="label">Bio:</span> {{ profile.user.bio || '?' }}</p>
              <p class="row"><span class="label">Timezone:</span> {{ profile.user.timezone || 'UTC' }}</p>

              <div class="actions">
                <button class="secondary-btn" :disabled="loading" @click="startEdit">Edit Profile</button>
              </div>
            </div>

            <form v-else class="edit-grid" @submit.prevent="save">
              <label>
                <span>Display name</span>
                <input v-model="formDisplayName" maxlength="60" required />
                <small v-if="formErrors.displayName" class="field-error">{{ formErrors.displayName }}</small>
              </label>

              <label>
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
          </div>
        </section>
      </template>
    </ScreenLayout>
  </AppContainer>
</template>

<style scoped>
.profile-page { display: flex; flex-direction: column; gap: 1.5rem; }
.state { color: var(--text-muted); }
.state.error { color: #ef9a9a; }
.profile-top { padding: 1.2rem; display: grid; grid-template-columns: 140px 1fr; gap: 1rem; }
.avatar-col { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }
.avatar-wrap, .avatar-fallback { width: 88px; height: 88px; border-radius: 999px; overflow: hidden; }
.avatar { width: 100%; height: 100%; object-fit: cover; }
.avatar-fallback {
  display: flex; align-items: center; justify-content: center;
  background: rgba(139, 107, 255, 0.25); color: var(--text-primary); font-size: 1.8rem; font-weight: 700;
}
.avatar-btn { cursor: pointer; color: var(--gold); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 1px; }
.avatar-btn.disabled { pointer-events: none; opacity: 0.65; }
.hidden-input { display: none; }
.details-col h1 { font-family: var(--font-display); font-size: 1.45rem; margin-bottom: 0.3rem; }
.email { color: var(--text-secondary); font-size: 0.92rem; margin-bottom: 0.6rem; }
.row { color: var(--text-primary); margin-bottom: 0.35rem; }
.label { color: var(--text-muted); margin-right: 0.4rem; }
.view-grid, .edit-grid { display: flex; flex-direction: column; }
.edit-grid label { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.65rem; }
.edit-grid span { color: var(--text-muted); font-size: 0.82rem; }
.edit-grid input, .edit-grid textarea, .edit-grid select {
  border: 1px solid var(--glass-border);
  background: rgba(0,0,0,0.25);
  color: var(--text-primary);
  border-radius: 10px;
  padding: 0.62rem 0.72rem;
  font: inherit;
}
.hint { color: var(--text-muted); font-size: 0.75rem; }
.field-error { color: #f6a3a3; font-size: 0.78rem; }
.actions { display: flex; flex-wrap: wrap; gap: 0.55rem; margin-top: 0.6rem; }
.secondary-btn, .primary-btn {
  min-height: 42px;
  padding: 0.62rem 1rem;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
  font-size: 0.82rem;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.secondary-btn { background: transparent; color: var(--gold); border-color: var(--gold); }
.primary-btn { background: var(--gold); color: var(--bg-deep); }
@media (max-width: 900px) {
  .profile-top { grid-template-columns: 1fr; }
  .avatar-col { align-items: flex-start; }
}
</style>
