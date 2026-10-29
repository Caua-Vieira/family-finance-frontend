export const GOOGLE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const isGoogleSignInEnabled = Boolean(GOOGLE_CLIENT_ID);
