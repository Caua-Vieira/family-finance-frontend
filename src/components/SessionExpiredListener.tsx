import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SESSION_EXPIRED_EVENT } from "../api/client";

export function SessionExpiredListener() {
    const navigate = useNavigate();

    useEffect(() => {
        function handleSessionExpired() {
            navigate("/login", { replace: true });
        }

        window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    }, [navigate]);

    return null;
}
