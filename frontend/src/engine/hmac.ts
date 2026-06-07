import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { AuditLog } from './types';

const SALT_KEY = 'pointdrop_hmac_salt_v1';

async function getDeviceSalt(): Promise<string> {
  let salt = await SecureStore.getItemAsync(SALT_KEY);
  if (!salt) {
    const random = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Date.now()}-${Math.random()}`
    );
    salt = random;
    await SecureStore.setItemAsync(SALT_KEY, salt);
  }
  return salt;
}

export async function signMatch(matchId: string, logs: AuditLog[]): Promise<string> {
  const salt = await getDeviceSalt();
  const payload = JSON.stringify(
    logs.map(l => ({
      id: l.id,
      player_id: l.player_id,
      delta_value: l.delta_value,
      round: l.round,
      created_at: l.created_at,
    }))
  );
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    salt + matchId + payload
  );
  return hash.slice(0, 16);
}

export async function verifyMatch(
  matchId: string,
  logs: AuditLog[],
  storedHash: string
): Promise<boolean> {
  const computed = await signMatch(matchId, logs);
  return computed === storedHash;
}
