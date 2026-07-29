const BASE_URL = import.meta.env.VITE_API_URL;

export const SESSION_EXPIRED_EVENT = "auth:session-expired";

class ApiError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
    }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem("token");

    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (response.status === 401) {
        localStorage.removeItem("token");
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        throw new ApiError("Sessão expirada", 401);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new ApiError(data?.message || "Ocorreu um erro", response.status);
    }

    return data as T;
}

export const api = {
    get: <T>(path: string) => request<T>(path, { method: "GET" }),
    post: <T>(path: string, body: unknown) =>
        request<T>(path, { method: "POST", body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) =>
        request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};