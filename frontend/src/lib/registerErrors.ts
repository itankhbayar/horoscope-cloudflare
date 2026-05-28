import { ApiClientError } from './apiClient';

export function formatRegisterApiError(err: unknown, locale: string): string {
  const isMn = locale.startsWith('mn');
  if (err instanceof ApiClientError) {
    if (err.status === 404 && /^not found$/i.test(err.message.trim())) {
      return isMn
        ? 'Уншлагын үйлчилгээ холбогдсонгүй. Дараа дахин оролдоно уу, эсвэл хөгжүүлэгчийн API асаалттай эсэхийг шалгана уу.'
        : 'We could not reach the reading service. Try again in a moment, or start the API (cd backend && npm run dev).';
    }
    if (err.message) return err.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return isMn ? 'Ямар нэг зүйл буруу боллоо.' : 'Something went wrong.';
}
