import * as SecureStore from 'expo-secure-store';
import type { Session } from './types';

const sessionKey = 'passage.session.v1';
const serverKey = 'passage.server.v1';
export function normalizeServer(input: string): string {
  const url = new URL(input.trim());
  if (url.protocol !== 'https:') throw new Error('Use an HTTPS server URL. Local development can use a trusted HTTPS tunnel.');
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Enter the server origin only, such as https://passage.example.com');
  return url.origin;
}
export async function readServer() { return (await SecureStore.getItemAsync(serverKey)) ?? ''; }
export async function saveServer(server: string) { await SecureStore.setItemAsync(serverKey, normalizeServer(server)); }
export async function readSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(sessionKey);
  if (!raw) return null;
  const value = JSON.parse(raw) as Session;
  if (!value.token || !value.userId || normalizeServer(value.server) !== value.server) return null;
  return value;
}
export async function saveSession(session: Session) { await SecureStore.setItemAsync(sessionKey, JSON.stringify(session)); }
export async function clearSession() { await SecureStore.deleteItemAsync(sessionKey); }
export async function signIn(server: string, email: string, password: string): Promise<Session> {
  server = normalizeServer(server);
  const response = await fetch(`${server}/api/auth/sign-in/email`, {
    method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json', Origin: server },
    body: JSON.stringify({ email: email.trim(), password })
  });
  const body = await response.json();
  if (!response.ok || !body.token || !body.user?.id) throw new Error(body.message ?? 'Sign in failed. Check server and credentials.');
  const session = { server, token: body.token, userId: body.user.id, email: body.user.email };
  await saveServer(server);
  await saveSession(session);
  return session;
}
