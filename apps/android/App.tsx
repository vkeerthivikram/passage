import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { nativeCapture, type SharedPassage } from './modules/passage-native';
import { api } from './src/api';
import { registerBackgroundSync } from './src/background';
import { cachedReview, capture, database, editHighlight, rows } from './src/database';
import { clearSession, normalizeServer, readServer, readSession, signIn } from './src/session';
import { retrySyncErrors, synchronize } from './src/sync';
import type { Highlight, Review, Session, Source } from './src/types';

type Tab = 'Today' | 'Library' | 'Capture' | 'Settings';
const blank = { title: '', author: '', text: '', note: '', tags: '', location: '', sourceId: undefined as string | undefined };
const colors = { bg: '#151714', panel: '#20241e', text: '#f1f0df', dim: '#a7ae9c', gold: '#ddb774', line: '#353d30', danger: '#ffb2a6' };

function Button({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, secondary && s.secondary, disabled && { opacity: 0.45 }]}><Text style={[s.buttonText, secondary && { color: colors.text }]}>{title}</Text></Pressable>;
}
function Field({ label, value, onChangeText, multiline = false, secure = false, placeholder }: { label: string; value: string; onChangeText: (text: string) => void; multiline?: boolean; secure?: boolean; placeholder?: string }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput accessibilityLabel={label} style={[s.input, multiline && { minHeight: 110, textAlignVertical: 'top' }]} value={value} onChangeText={onChangeText} multiline={multiline} secureTextEntry={secure} autoCapitalize="none" placeholder={placeholder} placeholderTextColor={colors.dim} /></View>;
}

function Passage() {
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [server, setServer] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<Tab>('Today');
  const [sources, setSources] = useState<Source[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(blank);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Highlight | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [selectedBlocks, setSelectedBlocks] = useState<number[]>([]);
  const syncBusy = useRef(false);

  const refresh = useCallback(async (current: Session) => {
    const db = await database(current);
    const [nextSources, nextHighlights, nextReview, count] = await Promise.all([
      rows<Source>(db, 'sources'), rows<Highlight>(db, 'highlights'), cachedReview(current),
      db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM outbox')
    ]);
    if (sessionRef.current?.userId !== current.userId || sessionRef.current?.server !== current.server) return;
    setSources(nextSources); setHighlights(nextHighlights); setReview(nextReview); setPending(count?.count ?? 0);
  }, []);

  const sync = useCallback(async (current: Session, retry = false) => {
    if (syncBusy.current) return;
    syncBusy.current = true; setSyncing(true);
    try {
      if (retry) await retrySyncErrors(current); else await synchronize(current);
      if (sessionRef.current === current) setMessage('Everything is synced.');
    } catch (error) {
      if (sessionRef.current === current) setMessage(error instanceof Error ? error.message : 'Offline. Your captures are safe on this device.');
    } finally {
      await refresh(current); syncBusy.current = false; setSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    void (async () => {
      try {
        setServer(await readServer());
        const saved = await readSession();
        sessionRef.current = saved; setSession(saved);
      } catch { setMessage('Could not restore session. Sign in again.'); }
      finally { setReady(true); }
    })();
  }, []);
  useEffect(() => {
    if (!session) return;
    void refresh(session); void sync(session);
    void registerBackgroundSync().catch(() => setMessage('Background sync unavailable. Open Passage to sync.'));
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void sync(session); });
    return () => listener.remove();
  }, [session, refresh, sync]);

  const recognize = useCallback(async (uri: string) => {
    setImageUri(uri); setBusy(true); setBlocks([]); setSelectedBlocks([]);
    try {
      if (!nativeCapture) throw new Error('OCR requires the Passage Android development build. Expo Go cannot load the native OCR module.');
      const result = await nativeCapture.recognizeText(uri);
      setBlocks(result.blocks.map(block => block.text));
      setForm(value => ({ ...value, text: result.text }));
      setMessage(result.text ? 'Tap text blocks to select passage, then correct text below.' : 'No text found. Try a sharper, well-lit photo.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not read image.'); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => {
    if (!session || !nativeCapture) return;
    const accept = async () => {
      const share: SharedPassage | null = await nativeCapture.getPendingShare();
      if (!share || sessionRef.current !== session) return;
      setTab('Capture');
      setForm(value => ({ ...value, text: share.text ?? value.text, title: share.title ?? value.title }));
      if (share.imageUri) await recognize(share.imageUri);
    };
    void accept().catch(() => setMessage('Could not open shared passage.'));
    const listener = nativeCapture.addListener('onShare', () => { void accept().catch(() => setMessage('Could not open shared passage.')); });
    return () => listener.remove();
  }, [session, recognize]);

  async function login() {
    setBusy(true); setMessage('');
    try {
      const current = await signIn(normalizeServer(server), email, password);
      setPassword(''); sessionRef.current = current; setSession(current);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not sign in.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    const current = session;
    // Clear visible state before another account can be selected.
    sessionRef.current = null; setSession(null); setSources([]); setHighlights([]); setReview(null); setPending(0);
    setForm(blank); setEditing(null); setImageUri(null); setBlocks([]); setEmail(''); setMessage('Signed out. Local captures remain scoped to this account.');
    await clearSession();
    if (current) void fetch(`${current.server}/api/auth/sign-out`, { method: 'POST', credentials: 'omit', headers: { Authorization: `Bearer ${current.token}`, 'Content-Type': 'application/json', Origin: current.server }, body: '{}' }).catch(() => undefined);
  }
  async function pickImage(camera: boolean) {
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) { setMessage('Camera permission needed to photograph a page.'); return; }
      const result = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: true }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: true });
      const image = result.assets?.[0];
      if (!result.canceled && image) await recognize(image.uri);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not open camera or photos.'); }
  }
  async function saveCapture() {
    if (!session) return;
    setBusy(true);
    try {
      await capture(session, { ...form, tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean) });
      setForm(blank); setImageUri(null); setBlocks([]); setSelectedBlocks([]); setMessage('Passage saved on this device.');
      await refresh(session); setTab('Library'); void sync(session);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save.'); }
    finally { setBusy(false); }
  }
  async function updateHighlight(remove = false) {
    if (!session || !editing) return;
    setBusy(true);
    try { await editHighlight(session, editing, remove); setEditing(null); await refresh(session); setMessage('Change saved on device.'); void sync(session); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save change.'); }
    finally { setBusy(false); }
  }
  async function reviewAction(id: string, action: 'keep' | 'skip' | 'discard') {
    if (!session) return;
    setBusy(true);
    try {
      await api(session, `/daily-review/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ action }) });
      await sync(session);
    } catch { setMessage('Review actions need a connection. Cached cards remain available.'); }
    finally { setBusy(false); }
  }
  function selectBlock(index: number) {
    const selected = selectedBlocks.includes(index) ? selectedBlocks.filter(value => value !== index) : [...selectedBlocks, index].sort((a, b) => a - b);
    setSelectedBlocks(selected); setForm(value => ({ ...value, text: selected.map(value => blocks[value]).join('\n\n') }));
  }

  if (!ready) return <SafeAreaView style={s.screen}><ActivityIndicator color={colors.gold} /></SafeAreaView>;
  if (!session) return <SafeAreaView style={s.screen}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <Text style={s.wordmark}>PASSAGE</Text><View style={{ height: 64 }} /><Text style={s.eyebrow}>YOUR WORDS, KEPT CLOSE</Text>
    <Text style={s.hero}>A place for what{ '\n' }stays with you.</Text><Text style={s.body}>Connect to your own Passage server. Capture, revisit, and carry your reading with you.</Text>
    <Field label="Server URL" value={server} onChangeText={setServer} placeholder="https://passage.example.com" />
    <Field label="Email" value={email} onChangeText={setEmail} /><Field label="Password" value={password} onChangeText={setPassword} secure />
    <Button title={busy ? 'Connecting…' : 'Sign in'} onPress={() => void login()} disabled={busy} />
    {!!message && <Text accessibilityRole="alert" style={s.message}>{message}</Text>}
    <Text style={s.small}>Create your account on your server’s web app first. HTTPS protects credentials in transit. Your server address stays on this installation.</Text>
  </ScrollView></SafeAreaView>;

  const sourceFor = (id: string) => sources.find(source => source.id === id);
  const visible = highlights.filter(highlight => `${highlight.text} ${highlight.note ?? ''} ${highlight.tags.join(' ')} ${sourceFor(highlight.sourceId)?.title ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  return <SafeAreaView style={s.screen}><StatusBar barStyle="light-content" /><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={s.top}><Text style={s.wordmark}>PASSAGE</Text><Pressable onPress={() => void sync(session)} accessibilityRole="button" accessibilityLabel="Sync now"><Text style={s.small}>{syncing ? 'Syncing…' : pending ? `${pending} waiting ↻` : 'Synced ↻'}</Text></Pressable></View>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {!!message && <Pressable onPress={() => setMessage('')}><Text accessibilityRole="alert" style={s.message}>{message}</Text></Pressable>}
      {tab === 'Today' && <>
        <Text style={s.eyebrow}>A LITTLE, EVERY DAY</Text><Text style={s.hero}>Return to{ '\n' }what matters.</Text>
        <Text style={s.body}>{review ? `${review.date} · ${review.completed} reviewed · ${review.streak} day streak` : 'Connect once to bring your daily review here.'}</Text>
        {!review?.cards.length && <View style={s.card}><Text style={s.quote}>{highlights.length ? 'Room for another thought.' : 'Your first passage is waiting.'}</Text><Text style={s.body}>Capture a line worth keeping. Your server prepares the next daily review.</Text><Button title="Capture a passage" onPress={() => setTab('Capture')} /></View>}
        {review?.cards.map((card, index) => <View style={s.card} key={card.id}><Text style={s.eyebrow}>{String(index + 1).padStart(2, '0')} / TODAY’S PASSAGE</Text><Text selectable style={s.quote}>{card.text}</Text><Text style={s.small}>{sourceFor(card.sourceId)?.title ?? 'Saved source'}{card.location ? ` · ${card.location}` : ''}</Text>{!!card.note && <Text style={s.body}>{card.note}</Text>}<View style={s.row}><Button title="Keep" onPress={() => void reviewAction(card.id, 'keep')} disabled={busy} /><Button title="Skip" secondary onPress={() => void reviewAction(card.id, 'skip')} disabled={busy} /><Button title="Discard" secondary onPress={() => Alert.alert('Discard from review?', 'This card will be marked discarded in today’s review.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Discard', onPress: () => void reviewAction(card.id, 'discard') }])} disabled={busy} /></View></View>)}
        {!!review && <Text style={s.small}>Cached review remains readable offline. Review actions need a connection.</Text>}
      </>}
      {tab === 'Library' && <>
        <Text style={s.eyebrow}>YOUR COMMONPLACE</Text><Text style={s.hero}>The library.</Text><Text style={s.body}>{highlights.length} passages · {sources.length} sources on this device</Text>
        <Field label="Search passages, sources, tags" value={search} onChangeText={setSearch} />
        {editing ? <View style={s.card}><Text style={s.eyebrow}>EDIT PASSAGE</Text><Field label="Passage" value={editing.text} multiline onChangeText={text => setEditing({ ...editing, text })} /><Field label="Note" value={editing.note ?? ''} multiline onChangeText={note => setEditing({ ...editing, note })} /><Field label="Tags, separated by commas" value={editing.tags.join(', ')} onChangeText={tags => setEditing({ ...editing, tags: tags.split(',').map(tag => tag.trim()) })} /><Button title="Save changes" onPress={() => void updateHighlight()} disabled={busy || !editing.text.trim()} /><Button title="Cancel" secondary onPress={() => setEditing(null)} /><Button title="Delete passage" secondary onPress={() => Alert.alert('Delete passage?', 'Deletion syncs to your server and other devices.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void updateHighlight(true) }])} /></View> : visible.map(highlight => <Pressable key={highlight.id} style={s.card} onPress={() => setEditing(highlight)} accessibilityRole="button" accessibilityLabel="Edit saved passage"><Text style={s.eyebrow}>{sourceFor(highlight.sourceId)?.title ?? 'Saved source'}</Text><Text selectable style={s.quote}>{highlight.text}</Text>{!!highlight.note && <Text style={s.body}>{highlight.note}</Text>}<Text style={s.small}>{[highlight.location, ...highlight.tags.map(tag => `#${tag}`)].filter(Boolean).join(' · ')}</Text></Pressable>)}
        {!visible.length && <Text style={s.body}>No passages here yet. Capture a thought, or sync your server library.</Text>}
      </>}
      {tab === 'Capture' && <>
        <Text style={s.eyebrow}>KEEP A LITTLE LIGHT</Text><Text style={s.hero}>Worth keeping.</Text><Text style={s.body}>Write it down, share text here, or read a page with your camera.</Text>
        <View style={s.row}><Button title="Photograph page" onPress={() => void pickImage(true)} disabled={busy} /><Button title="Choose image" secondary onPress={() => void pickImage(false)} disabled={busy} /></View>
        {imageUri && <Image source={{ uri: imageUri }} style={s.preview} resizeMode="contain" accessibilityLabel="Page selected for local OCR" />}
        {busy && <ActivityIndicator color={colors.gold} />}
        {!!blocks.length && <View style={s.card}><Text style={s.label}>Tap blocks to keep. Then correct passage below.</Text>{blocks.map((block, index) => <Pressable key={index} style={[s.block, selectedBlocks.includes(index) && { borderColor: colors.gold }]} onPress={() => selectBlock(index)} accessibilityRole="checkbox" accessibilityState={{ checked: selectedBlocks.includes(index) }}><Text style={s.body}>{block}</Text></Pressable>)}</View>}
        {!!sources.length && <><Text style={s.label}>Source</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}><Button title="New source" secondary={!!form.sourceId} onPress={() => setForm(value => ({ ...value, sourceId: undefined, title: '', author: '' }))} />{sources.map(source => <View key={source.id} style={{ marginLeft: 8 }}><Button title={source.title} secondary={form.sourceId !== source.id} onPress={() => setForm(value => ({ ...value, sourceId: source.id, title: source.title, author: source.author ?? '' }))} /></View>)}</ScrollView></>}
        {!form.sourceId && <><Field label="Source title" value={form.title} onChangeText={title => setForm(value => ({ ...value, title }))} /><Field label="Author" value={form.author} onChangeText={author => setForm(value => ({ ...value, author }))} /></>}
        <Field label="Passage — select and correct before saving" value={form.text} onChangeText={text => setForm(value => ({ ...value, text }))} multiline />
        <Field label="Your note" value={form.note} onChangeText={note => setForm(value => ({ ...value, note }))} multiline /><Field label="Page or location" value={form.location} onChangeText={location => setForm(value => ({ ...value, location }))} /><Field label="Tags, separated by commas" value={form.tags} onChangeText={tags => setForm(value => ({ ...value, tags }))} />
        <Button title="Save passage" onPress={() => void saveCapture()} disabled={busy || !form.text.trim() || !form.title.trim()} /><Text style={s.small}>OCR happens on device. Only text you save syncs to your server.</Text>
      </>}
      {tab === 'Settings' && <>
        <Text style={s.eyebrow}>YOUR OWN CORNER</Text><Text style={s.hero}>Connected{ '\n' }to you.</Text><View style={s.card}><Text style={s.label}>SERVER</Text><Text selectable style={s.body}>{session.server}</Text><Text style={s.label}>ACCOUNT</Text><Text style={s.body}>{session.email}</Text><Text style={s.small}>{pending} operations waiting to sync. Local data stays separated by server and account.</Text></View>
        <Button title="Sync now" onPress={() => void sync(session)} disabled={syncing} /><Button title="Retry blocked sync" secondary onPress={() => void sync(session, true)} disabled={syncing} /><Text style={s.small}>Concurrent edits stop for attention. Retry preserves the same operation ID; server conflicts remain visible instead of overwriting another device.</Text>
        <Button title="Sign out / change server" secondary onPress={() => { void logout(); }} /><Text style={s.small}>Your password is never saved. Session token is stored in Android’s protected keystore. Cached reading data is app-private SQLite; it is not separately encrypted. Device screen lock is recommended. Android controls background sync timing, so opening Passage always retries sync.</Text>
      </>}
      <View style={{ height: 36 }} />
    </ScrollView>
    <View style={s.tabs}>{(['Today', 'Library', 'Capture', 'Settings'] as Tab[]).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }} onPress={() => { setTab(item); setEditing(null); }} style={s.tab}><Text style={[s.tabText, tab === item && { color: colors.gold }]}>{item}</Text><View style={[s.dot, tab === item && { backgroundColor: colors.gold }]} /></Pressable>)}</View>
  </KeyboardAvoidingView></SafeAreaView>;
}

export default function App() { return <SafeAreaProvider><Passage /></SafeAreaProvider>; }
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, content: { padding: 24, paddingBottom: 28 },
  top: { paddingHorizontal: 24, paddingVertical: 17, borderBottomWidth: 1, borderColor: colors.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordmark: { color: colors.text, letterSpacing: 6, fontSize: 15, fontWeight: '700' }, eyebrow: { color: colors.gold, fontSize: 10, lineHeight: 17, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  hero: { color: colors.text, fontFamily: 'serif', fontSize: 42, lineHeight: 48, marginBottom: 18 }, body: { color: colors.dim, fontSize: 15, lineHeight: 24, marginVertical: 8 },
  small: { color: colors.dim, fontSize: 12, lineHeight: 20, marginVertical: 9 }, label: { color: colors.dim, fontSize: 11, letterSpacing: 1, marginBottom: 9 },
  field: { marginTop: 15, marginBottom: 4 }, input: { color: colors.text, padding: 14, borderColor: colors.line, borderWidth: 1, borderRadius: 9, fontSize: 16, backgroundColor: colors.panel },
  button: { backgroundColor: colors.gold, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 9, alignItems: 'center', marginVertical: 9 }, buttonText: { color: colors.bg, fontWeight: '600', fontSize: 13 }, secondary: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  card: { backgroundColor: colors.panel, borderRadius: 14, padding: 22, marginTop: 20, borderWidth: 1, borderColor: colors.line }, quote: { color: colors.text, fontFamily: 'serif', fontSize: 23, lineHeight: 34, marginVertical: 12 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, message: { color: colors.gold, backgroundColor: '#292a20', borderRadius: 9, padding: 13, fontSize: 12, lineHeight: 19, marginBottom: 18 },
  preview: { width: '100%', height: 210, marginTop: 15, borderRadius: 12, backgroundColor: '#090b08' }, block: { borderWidth: 1, borderColor: colors.line, padding: 10, borderRadius: 7, marginTop: 10 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.bg }, tab: { flex: 1, alignItems: 'center', paddingVertical: 15 }, tabText: { color: colors.dim, fontSize: 12 }, dot: { width: 4, height: 4, borderRadius: 2, marginTop: 7 }
});
