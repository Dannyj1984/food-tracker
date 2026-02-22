interface User {
    id: number;
    email: string;
    name: string;
}

interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

/**
 * useAuth composable — manages authentication state
 * OWASP: Tokens stored in memory (reactive refs), not in cookies
 * Refresh token stored in localStorage for persistence across page reloads
 */
export function useAuth() {
    const user = useState<User | null>('auth_user', () => null);
    const accessToken = useState<string | null>('auth_access_token', () => null);
    const refreshToken = useState<string | null>('auth_refresh_token', () => null);
    const isAuthenticated = computed(() => !!accessToken.value && !!user.value);

    const config = useRuntimeConfig();

    // Restore refresh token from localStorage on client.
    // The actual token refresh is handled by auth.global.ts middleware,
    // which properly awaits the refresh before allowing navigation.
    if (import.meta.client) {
        const storedRefresh = localStorage.getItem('ft_refresh_token');
        if (storedRefresh && !refreshToken.value) {
            refreshToken.value = storedRefresh;
        }
    }

    async function login(email: string, password: string): Promise<void> {
        const response = await fetch(`/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({ error: 'Login failed' }));
            throw new Error(data.error || 'Login failed');
        }

        const data: AuthResponse = await response.json();
        setAuth(data);
    }

    async function register(email: string, password: string, name: string): Promise<void> {
        const response = await fetch(`/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name }),
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({ error: 'Registration failed' }));
            throw new Error(data.error || 'Registration failed');
        }

        const data: AuthResponse = await response.json();
        setAuth(data);
    }

    async function refreshAccessToken(): Promise<boolean> {
        const rt = refreshToken.value || (import.meta.client ? localStorage.getItem('ft_refresh_token') : null);
        if (!rt) return false;

        try {
            const response = await fetch(`/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: rt }),
            });

            if (!response.ok) {
                clearAuth();
                return false;
            }

            const data: AuthResponse = await response.json();
            setAuth(data);
            return true;
        } catch {
            clearAuth();
            return false;
        }
    }

    async function logout(): Promise<void> {
        try {
            if (accessToken.value) {
                await fetch(`/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken.value}`,
                    },
                    body: JSON.stringify({ refreshToken: refreshToken.value }),
                });
            }
        } catch {
            // Logout should always succeed client-side
        }
        clearAuth();
    }

    function setAuth(data: AuthResponse) {
        user.value = data.user;
        accessToken.value = data.accessToken;
        refreshToken.value = data.refreshToken;
        if (import.meta.client) {
            localStorage.setItem('ft_refresh_token', data.refreshToken);
        }
    }

    function clearAuth() {
        user.value = null;
        accessToken.value = null;
        refreshToken.value = null;
        if (import.meta.client) {
            localStorage.removeItem('ft_refresh_token');
        }
    }

    return {
        user,
        accessToken,
        refreshToken,
        isAuthenticated,
        login,
        register,
        refreshAccessToken,
        logout,
    };
}
