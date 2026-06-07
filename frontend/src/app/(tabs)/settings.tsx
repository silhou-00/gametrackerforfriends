import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VOICE_LLM_KEY_STORAGE, VOICE_LLM_MODEL_STORAGE } from '../../hooks/useVoiceSession';
import { useApp } from '../../context/AppContext';
import { C, SHADOW } from '../../styles/tokens/colors';
import { T } from '../../styles/tokens/typography';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { Modal } from '../../components/ui/Modal';
import { Icon } from '../../components/ui/Icon';
import { Toast } from '../../components/ui/Toast';

const SERVER_URL_KEY = 'pointdrop_server_url';
export const DEFAULT_SERVER_URL = 'http://192.168.1.1:8000';

export async function getServerUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem(SERVER_URL_KEY);
  return stored || DEFAULT_SERVER_URL;
}

function WipeConfirmModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal open onClose={onClose}>
      <View style={s.wipeModal}>
        <View style={s.wipeIconWrap}>
          <Icon name="trash" size={28} color={C.error} />
        </View>
        <Text style={[T.h2, { color: C.ink, textAlign: 'center', marginBottom: 8 }]}>
          Wipe all data?
        </Text>
        <Text style={[T.body, { color: C.ink50, textAlign: 'center', marginBottom: 24 }]}>
          Permanently deletes every game, mode, match, and log on this device. No undo.
        </Text>
        <Button full tone="danger" onPress={onConfirm}>Yes, wipe everything</Button>
        <View style={{ height: 12 }} />
        <Button full tone="ghost" onPress={onClose}>Cancel</Button>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const { toast, showToast, wipeAll, games, matches } = useApp();
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const [pingStatus, setPingStatus] = useState<'idle' | 'pinging' | 'ok' | 'fail'>('idle');
  const [showWipe, setShowWipe] = useState(false);
  const [llmKey, setLlmKey] = useState('');
  const [llmModel, setLlmModel] = useState('gpt-4o-mini');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SERVER_URL_KEY),
      AsyncStorage.getItem(VOICE_LLM_KEY_STORAGE),
      AsyncStorage.getItem(VOICE_LLM_MODEL_STORAGE),
    ]).then(([url, key, model]) => {
      if (url) setServerUrl(url);
      if (key) setLlmKey(key);
      if (model) setLlmModel(model);
    });
  }, []);

  const saveLlmConfig = async () => {
    await Promise.all([
      AsyncStorage.setItem(VOICE_LLM_KEY_STORAGE, llmKey.trim()),
      AsyncStorage.setItem(VOICE_LLM_MODEL_STORAGE, llmModel.trim() || 'gpt-4o-mini'),
    ]);
    showToast({ msg: 'Voice config saved', tone: 'success', icon: 'check' });
  };

  const saveUrl = async () => {
    await AsyncStorage.setItem(SERVER_URL_KEY, serverUrl.trim());
    showToast({ msg: 'Server URL saved', tone: 'success', icon: 'check' });
  };

  const pingServer = async () => {
    setPingStatus('pinging');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${serverUrl.trim()}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      setPingStatus(res.ok ? 'ok' : 'fail');
      showToast(res.ok
        ? { msg: 'Server reachable', tone: 'success', icon: 'check' }
        : { msg: `Server returned ${res.status}`, tone: 'error', icon: 'close' }
      );
    } catch {
      setPingStatus('fail');
      showToast({ msg: 'Cannot reach server', tone: 'error', icon: 'close' });
    }
  };

  const pingColor = pingStatus === 'ok' ? C.success : pingStatus === 'fail' ? C.error : C.ink35;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.container}>
        <Header title="Settings" sub="Preferences & data" />

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >

          {/* ── PDF export ─────────────────────────────────── */}
          <SectionLabel>PDF reports</SectionLabel>
          <Card pad={18}>
            <View style={s.featureRow}>
              <View style={s.featureIcon}>
                <Icon name="pdf" size={22} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[T.bodyBold, { color: C.ink }]}>Export match reports</Text>
                <Text style={[T.small, { color: C.ink50, marginTop: 3, lineHeight: 18 }]}>
                  Open any match in History and tap the PDF icon to generate a printable score report.
                </Text>
              </View>
            </View>
          </Card>

          {/* ── Host server ────────────────────────────────── */}
          <SectionLabel>Host server</SectionLabel>
          <Card pad={18}>
            <Text style={[T.bodyBold, { color: C.ink, marginBottom: 4 }]}>Backend URL</Text>
            <Text style={[T.small, { color: C.ink50, marginBottom: 14, lineHeight: 18 }]}>
              Run the FastAPI backend on your local network. Paste the IP:port printed in the terminal.
            </Text>
            <TextInput
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://192.168.x.x:8000"
              placeholderTextColor={C.ink35}
              style={s.urlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <View style={s.urlBtns}>
              <Button
                size="sm" tone="ghost"
                onPress={pingServer}
                disabled={pingStatus === 'pinging'}
              >
                {pingStatus === 'pinging' ? 'Pinging…' : 'Test connection'}
              </Button>
              <View style={{ width: 10 }} />
              <Button size="sm" onPress={saveUrl}>Save</Button>
            </View>
            {pingStatus !== 'idle' && pingStatus !== 'pinging' && (
              <View style={s.pingResult}>
                <View style={[s.pingDot, { backgroundColor: pingColor }]} />
                <Text style={[T.small, { color: pingColor }]}>
                  {pingStatus === 'ok' ? 'Backend is online' : 'No response from server'}
                </Text>
              </View>
            )}
          </Card>

          {/* ── Device data ────────────────────────────────── */}
          <SectionLabel>Device data</SectionLabel>
          <Card pad={18}>
            <View style={s.statsRow}>
              <View style={s.stat}>
                <Text style={[T.score, { color: C.primary }]}>{games.length}</Text>
                <Text style={[T.small, { color: C.ink50, marginTop: 4 }]}>Games</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.stat}>
                <Text style={[T.score, { color: C.primary }]}>{matches.length}</Text>
                <Text style={[T.small, { color: C.ink50, marginTop: 4 }]}>Matches</Text>
              </View>
            </View>
          </Card>

          {/* ── Voice / ConvoAI ────────────────────────────────── */}
          <SectionLabel>Voice entry</SectionLabel>
          <Card pad={18}>
            <View style={s.featureRow}>
              <View style={s.featureIcon}>
                <Icon name="mic" size={22} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[T.bodyBold, { color: C.ink }]}>Agora ConvoAI Device Kit</Text>
                <Text style={[T.small, { color: C.ink50, marginTop: 3, lineHeight: 18 }]}>
                  Say "Player 1 plus 3" while a match is active. Requires R1 device + LLM API key.
                </Text>
              </View>
            </View>
            <Text style={[T.bodyBold, { color: C.ink, marginTop: 16, marginBottom: 4 }]}>LLM API key</Text>
            <TextInput
              value={llmKey}
              onChangeText={setLlmKey}
              placeholder="sk-... or your model key"
              placeholderTextColor={C.ink35}
              style={s.urlInput}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={[T.bodyBold, { color: C.ink, marginBottom: 4 }]}>Model</Text>
            <TextInput
              value={llmModel}
              onChangeText={setLlmModel}
              placeholder="gpt-4o-mini"
              placeholderTextColor={C.ink35}
              style={[s.urlInput, { marginBottom: 14 }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button size="sm" onPress={saveLlmConfig}>Save voice config</Button>
          </Card>

          <View style={s.dangerZone}>
            <Button full size="sm" tone="danger" icon="trash" onPress={() => setShowWipe(true)}>
              Wipe all local data
            </Button>
            <Text style={[T.small, { color: C.ink35, textAlign: 'center', marginTop: 8 }]}>
              Games, modes, matches, and logs — permanently deleted
            </Text>
          </View>

          {/* ── About ──────────────────────────────────────── */}
          <SectionLabel>About</SectionLabel>
          <Card pad={18}>
            <View style={s.aboutRow}>
              <View style={s.aboutIcon}>
                <Text style={{ fontFamily: 'RobotoSlab_800ExtraBold', fontSize: 14, color: C.primary }}>PD</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[T.bodyBold, { color: C.ink }]}>PointDrop</Text>
                <Text style={[T.small, { color: C.ink50, marginTop: 2 }]}>v1.0.0 · Local-first</Text>
              </View>
            </View>
            <Text style={[T.small, { color: C.ink50, marginTop: 14, lineHeight: 18 }]}>
              Scores are stored only on this device and never sent to a remote server.
            </Text>
          </Card>

        </ScrollView>

        {showWipe && (
          <WipeConfirmModal onConfirm={async () => { setShowWipe(false); await wipeAll(); }} onClose={() => setShowWipe(false)} />
        )}
        <Toast toast={toast} />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 120 },

  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  featureIcon: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },

  urlInput: {
    borderWidth: 1.5, borderColor: C.ink12, backgroundColor: C.bgSunk,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14,
    fontFamily: 'Lato_400Regular', fontSize: 14, color: C.ink,
  },
  urlBtns: { flexDirection: 'row', alignItems: 'center' },
  pingResult: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
  },
  pingDot: { width: 8, height: 8, borderRadius: 4 },

  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statDivider: { width: 1, height: 44, backgroundColor: C.ink12 },

  dangerZone: {
    marginTop: 12, marginBottom: 4,
    borderWidth: 1.5, borderColor: C.ink12, borderStyle: 'dashed',
    borderRadius: 16, padding: 16,
  },

  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  aboutIcon: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: C.primarySoft, borderWidth: 1.5, borderColor: '#B08A4F',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  wipeModal: { padding: 24 },
  wipeIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: C.errorSoft, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 16,
  },
});
