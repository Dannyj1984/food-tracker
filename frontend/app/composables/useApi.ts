/**
 * useApi composable — authenticated API client
 * OWASP: All requests include Bearer token, handles token refresh automatically
 */
export function useApi() {
    const config = useRuntimeConfig();
    const auth = useAuth();

    async function apiFetch<T>(path: string, options: any = {}): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };

        const token = auth.accessToken.value;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const url = `${config.public.apiUrl}${path}`;

        let response = await fetch(url, {
            ...options,
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

        // Handle token expiry — try refresh
        if (response.status === 401 && token) {
            const data = await response.json().catch(() => ({}));
            if (data.code === 'TOKEN_EXPIRED') {
                const refreshed = await auth.refreshAccessToken();
                if (refreshed) {
                    headers['Authorization'] = `Bearer ${auth.accessToken.value}`;
                    response = await fetch(url, {
                        ...options,
                        headers,
                        body: options.body ? JSON.stringify(options.body) : undefined,
                    });
                } else {
                    auth.logout();
                    navigateTo('/login');
                    throw new Error('Session expired. Please log in again.');
                }
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return response.json();
    }

    return {
        get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
        post: <T>(path: string, body: any) => apiFetch<T>(path, { method: 'POST', body }),
        put: <T>(path: string, body: any) => apiFetch<T>(path, { method: 'PUT', body }),
        patch: <T>(path: string, body: any) => apiFetch<T>(path, { method: 'PATCH', body }),
        del: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
    };
}
