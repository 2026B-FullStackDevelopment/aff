import { API_ROUTES } from '@/config/apiRoutes';
import { httpClient } from '@/services/httpClient';
import type {
  RecipientSearchResult,
} from '../types';

function buildRecipientSearchPath(
  email: string,
): string {
  const parameters = new URLSearchParams({
    email: email.trim(),
  });

  return (
    `${API_ROUTES.users.recipientSearch}`
    + `?${parameters.toString()}`
  );
}

export const recipientService = {
  // Searches active registered Recipients by email prefix.
  searchByEmail: (
    email: string,
    signal?: AbortSignal,
  ) =>
    httpClient.get<RecipientSearchResult[]>(
      buildRecipientSearchPath(email),
      { signal },
    ),
};