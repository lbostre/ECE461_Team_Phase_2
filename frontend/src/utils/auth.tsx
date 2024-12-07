// utils/auth.ts
export function getAuthToken() {
    return localStorage.getItem("authToken");
}
