const apiHost = typeof window !== "undefined" && window.location.hostname ? window.location.hostname : "localhost";
const BASE_URL = process.env.REACT_APP_API_URL || `http://${apiHost}:5000/api`;

const getAuthHeaders = () => {
    const headers = {
        "Content-Type": "application/json",
    };
    const token = localStorage.getItem("accessToken");
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
};

const getAuthParams = () => {
    const cached = localStorage.getItem("crm_user");
    if (cached) {
        try {
            const user = JSON.parse(cached);
            return { 
                userId: user.id || user._id, 
                role: user.role 
            };
        } catch (e) {
            return {};
        }
    }
    return {};
};

const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
        throw new Error("No refresh token found");
    }

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
    });

    if (!res.ok) {
        throw new Error("Session expired. Please log in again.");
    }

    const data = await res.json();
    localStorage.setItem("accessToken", data.accessToken);
    return data.accessToken;
};

const request = async (url, options) => {
    let res = await fetch(url, options);

    if (res.status === 401) {
        const data = await res.clone().json().catch(() => ({}));
        if (data.code === "TOKEN_EXPIRED") {
            try {
                const newToken = await refreshAccessToken();
                options.headers = {
                    ...options.headers,
                    "Authorization": `Bearer ${newToken}`
                };
                res = await fetch(url, options);
            } catch (err) {
                console.error("Session refresh expired:", err);
                localStorage.removeItem("accessToken");
                localStorage.removeItem("refreshToken");
                localStorage.removeItem("crm_user");
                window.dispatchEvent(new Event("crm_logout"));
                throw new Error("Your session has expired. Please login again. ❌");
            }
        }
    }

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error! status: ${res.status}`);
    }

    return res.json();
};

// In-memory client-side cache for instantaneous tab switching and zero duplicate calls
const requestCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

const invalidateCacheByPrefix = (prefix) => {
    for (const key of requestCache.keys()) {
        if (key.startsWith(prefix)) {
            requestCache.delete(key);
        }
    }
};

const invalidateOnMutation = (endpoint) => {
    const base = endpoint.split("?")[0].replace(/^\/api/, "").split("/").filter(Boolean)[0];
    if (base) {
        invalidateCacheByPrefix(`/${base}`);
    }
    // Cross-cutting module invalidations
    if (endpoint.includes("/approvals") || endpoint.includes("/workshops") || endpoint.includes("/papers") || endpoint.includes("/activities") || endpoint.includes("/submissions") || endpoint.includes("/certifications")) {
        invalidateCacheByPrefix("/approvals");
        invalidateCacheByPrefix("/workshops");
        invalidateCacheByPrefix("/papers");
        invalidateCacheByPrefix("/activities");
        invalidateCacheByPrefix("/submissions");
        invalidateCacheByPrefix("/certifications");
        invalidateCacheByPrefix("/analytics");
        invalidateCacheByPrefix("/users");
    }
    if (endpoint.includes("/tasks")) {
        invalidateCacheByPrefix("/tasks");
        invalidateCacheByPrefix("/analytics");
    }
    if (endpoint.includes("/notifications")) {
        invalidateCacheByPrefix("/notifications");
    }
};

export const api = {
    clearCache() {
        requestCache.clear();
    },

    invalidateCache(prefix) {
        invalidateCacheByPrefix(prefix);
    },

    async get(endpoint, params = {}, options = {}) {
        const queryParams = { ...params };
        const queryStr = Object.keys(queryParams)
            .filter(k => queryParams[k] !== undefined && queryParams[k] !== null && queryParams[k] !== "")
            .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
            .join("&");
        const url = `${BASE_URL}${endpoint}${queryStr ? `?${queryStr}` : ""}`;
        const cacheKey = `${endpoint}${queryStr ? `?${queryStr}` : ""}`;

        // Return from cache if valid and noCache is not forced
        if (!options.noCache && requestCache.has(cacheKey)) {
            const cached = requestCache.get(cacheKey);
            const isFresh = (Date.now() - cached.timestamp) < CACHE_TTL_MS;
            if (isFresh) {
                return cached.data;
            }
        }

        const data = await request(url, {
            headers: getAuthHeaders()
        });

        // Store in cache
        requestCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    },

    async post(endpoint, body = {}, useAuthParams = true) {
        invalidateOnMutation(endpoint);
        const authParams = useAuthParams ? getAuthParams() : {};
        const mergedBody = { ...authParams, ...body };
        if (authParams.userId && !mergedBody.requesterId) {
            mergedBody.requesterId = authParams.userId;
        }
        if (authParams.userId && !mergedBody.userId) {
            mergedBody.userId = authParams.userId;
        }
        const url = `${BASE_URL}${endpoint}`;
        return request(url, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(mergedBody)
        });
    },

    async put(endpoint, body = {}) {
        invalidateOnMutation(endpoint);
        const authParams = getAuthParams();
        const mergedBody = { ...authParams, ...body };
        if (authParams.userId && !mergedBody.requesterId) {
            mergedBody.requesterId = authParams.userId;
        }
        if (authParams.userId && !mergedBody.userId) {
            mergedBody.userId = authParams.userId;
        }
        const url = `${BASE_URL}${endpoint}`;
        return request(url, {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify(mergedBody)
        });
    },

    async delete(endpoint, body = {}) {
        invalidateOnMutation(endpoint);
        const authParams = getAuthParams();
        const mergedBody = { ...authParams, ...body };
        if (authParams.userId && !mergedBody.requesterId) {
            mergedBody.requesterId = authParams.userId;
        }
        if (authParams.userId && !mergedBody.userId) {
            mergedBody.userId = authParams.userId;
        }
        const url = `${BASE_URL}${endpoint}`;
        return request(url, {
            method: "DELETE",
            headers: getAuthHeaders(),
            body: JSON.stringify(mergedBody)
        });
    }
};

