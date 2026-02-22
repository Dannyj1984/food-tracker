/**
 * Auth route middleware — redirects unauthenticated users to /login.
 * With ssr: false, this always runs on the client where localStorage is available.
 */
export default defineNuxtRouteMiddleware(async (to) => {
    // Skip auth check for public pages
    const publicPages = ['/login', '/register'];
    if (publicPages.includes(to.path)) {
        return;
    }

    const auth = useAuth();

    // Ensure refresh token is loaded from localStorage
    if (!auth.refreshToken.value) {
        const storedRefresh = localStorage.getItem('ft_refresh_token');
        if (storedRefresh) {
            auth.refreshToken.value = storedRefresh;
        }
    }

    // If we have a refresh token but no access token, try to refresh
    if (!auth.accessToken.value && auth.refreshToken.value) {
        const refreshed = await auth.refreshAccessToken();
        if (!refreshed) {
            return navigateTo('/login');
        }
        return;
    }

    // No tokens at all — redirect to login
    if (!auth.isAuthenticated.value) {
        return navigateTo('/login');
    }
});
