<script setup lang="ts">
export interface ProfileFormErrors {
  displayName?: string;
  bio?: string;
  timezone?: string;
}

defineProps<{
  errors: ProfileFormErrors;
  loading: boolean;
  timezoneOptions: string[];
}>();

const displayName = defineModel<string>('displayName', { required: true });
const bio = defineModel<string>('bio', { required: true });
const timezone = defineModel<string>('timezone', { required: true });

const emit = defineEmits<{
  save: [];
  cancel: [];
}>();
</script>

<template>
  <section class="glass-card profile-edit">
    <div class="edit-head">
      <h2>Edit your cosmic profile</h2>
      <p>Fine-tune the details that guide your celestial experience.</p>
    </div>

    <form class="edit-grid" @submit.prevent="emit('save')">
      <label>
        <span>Display name</span>
        <input v-model="displayName" maxlength="60" required />
        <small v-if="errors.displayName" class="field-error">{{ errors.displayName }}</small>
      </label>

      <label class="field-bio">
        <span>Bio</span>
        <textarea v-model="bio" maxlength="280" rows="4" />
        <small class="hint">{{ bio.length }}/280</small>
        <small v-if="errors.bio" class="field-error">{{ errors.bio }}</small>
      </label>

      <label>
        <span>Timezone</span>
        <select v-model="timezone" required>
          <option disabled value="">Select timezone</option>
          <option v-for="tz in timezoneOptions" :key="tz" :value="tz">{{ tz }}</option>
        </select>
        <small v-if="errors.timezone" class="field-error">{{ errors.timezone }}</small>
      </label>

      <div class="actions">
        <button class="secondary-btn" type="button" :disabled="loading" @click="emit('cancel')">
          Cancel
        </button>
        <button class="primary-btn" type="submit" :disabled="loading">Save profile</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
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

.field-error {
  color: var(--error);
  font-size: var(--text-xs);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.secondary-btn,
.primary-btn {
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

.secondary-btn:disabled,
.primary-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 640px) {
  .profile-edit {
    padding: var(--space-5);
  }

  .actions {
    width: 100%;
  }

  .secondary-btn,
  .primary-btn {
    flex: 1 1 100%;
  }
}
</style>
