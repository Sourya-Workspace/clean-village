/**
 * CleanVillage - Reusable Supabase Client (Auth, Database, RPC, Storage & Realtime)
 * ============================================================================
 * Connects directly to the configured Supabase project using VITE_SUPABASE_URL
 * and VITE_SUPABASE_ANON_KEY.
 *
 * Security Rules:
 * - Only uses the public publishable/anonymous key (VITE_SUPABASE_ANON_KEY).
 * - Never includes or exposes the Supabase service_role key or admin password.
 * - Persists user sessions securely across page reloads and tabs.
 * - Subscribes to Supabase Realtime Phoenix channels for live notifications
 *   and complaint status updates.
 */

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const rawAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();
const forceDemo = String(import.meta.env.VITE_FORCE_DEMO_MODE || 'false').toLowerCase() === 'true';

export const isSupabaseConfigured = Boolean(
  !forceDemo &&
    rawUrl &&
    rawUrl.startsWith('http') &&
    !rawUrl.includes('your-project-ref') &&
    rawAnonKey &&
    !rawAnonKey.includes('your-supabase-anon-public-key') &&
    !rawAnonKey.includes('your-supabase-publishable-key')
);

/**
 * Checks whether a token string is a 3-part JWT (e.g. a user session access_token
 * or a legacy `eyJ...` anon key) rather than an opaque `sb_publishable_` / `sb_secret_` API key.
 */
export function isJwtToken(token) {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (trimmed.startsWith('sb_publishable_') || trimmed.startsWith('sb_secret_')) {
    return false;
  }
  const parts = trimmed.split('.');
  return parts.length === 3 && trimmed.startsWith('eyJ');
}

/**
 * Builds standard Supabase request headers.
 * Always attaches `apikey: rawAnonKey`, and attaches `Authorization: Bearer <token>`
 * ONLY when `token` is a valid JWT (never sending `sb_publishable_` as a Bearer JWT).
 */
function buildSupabaseHeaders(token, extra = {}) {
  const headers = {
    apikey: rawAnonKey,
    ...extra,
  };
  if (isJwtToken(token)) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  return headers;
}

const SESSION_STORAGE_KEY = 'cv_supabase_auth_session_v1';
const authListeners = new Set();

function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveStoredSession(session) {
  try {
    if (!session) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota errors
  }
}

function notifyAuthListeners(event, session) {
  for (const listener of authListeners) {
    try {
      listener(event, session);
    } catch (err) {
      console.error('Auth listener error:', err);
    }
  }
}

async function getValidAccessToken() {
  const session = getStoredSession();
  if (!session?.access_token) {
    return isJwtToken(rawAnonKey) ? rawAnonKey : null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at - nowSec < 60 && session.refresh_token) {
    try {
      const res = await fetch(`${rawUrl}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          apikey: rawAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      if (res.ok) {
        const refreshed = await res.json();
        const updatedSession = {
          ...refreshed,
          expires_at: refreshed.expires_at || Math.floor(Date.now() / 1000) + (refreshed.expires_in || 3600),
        };
        saveStoredSession(updatedSession);
        notifyAuthListeners('TOKEN_REFRESHED', updatedSession);
        return updatedSession.access_token;
      }
    } catch {
      // Fallback to existing token
    }
  }
  return isJwtToken(session.access_token) ? session.access_token : null;
}

class PostgrestQueryBuilder {
  constructor(table) {
    this.table = table;
    this.method = 'GET';
    this.selectCols = '*';
    this.filters = [];
    this.orders = [];
    this.limitCount = null;
    this.bodyData = null;
    this.preferHeaders = [];
    this.expectSingle = false;
  }

  select(columns = '*') {
    this.selectCols = columns;
    if (this.method !== 'GET') {
      this.preferHeaders.push('return=representation');
    }
    return this;
  }

  insert(values, options = {}) {
    this.method = 'POST';
    this.bodyData = values;
    this.preferHeaders.push('return=representation');
    if (options.upsert) {
      this.preferHeaders.push('resolution=merge-duplicates');
    }
    return this;
  }

  update(values) {
    this.method = 'PATCH';
    this.bodyData = values;
    this.preferHeaders.push('return=representation');
    return this;
  }

  delete() {
    this.method = 'DELETE';
    this.preferHeaders.push('return=representation');
    return this;
  }

  eq(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`);
    return this;
  }

  neq(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=neq.${encodeURIComponent(value)}`);
    return this;
  }

  in(column, values = []) {
    const list = values.map((v) => `"${String(v).replace(/"/g, '\\"')}"`).join(',');
    this.filters.push(`${encodeURIComponent(column)}=in.(${encodeURIComponent(list)})`);
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.orders.push(`${encodeURIComponent(column)}.${ascending ? 'asc' : 'desc'}`);
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.expectSingle = true;
    return this.execute();
  }

  maybeSingle() {
    this.expectSingle = true;
    this.allowEmptySingle = true;
    return this.execute();
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase is not configured.' } };
    }

    try {
      const token = await getValidAccessToken();
      const params = [];
      if (this.selectCols) {
        params.push(`select=${encodeURIComponent(this.selectCols)}`);
      }
      params.push(...this.filters);
      if (this.orders.length > 0) {
        params.push(`order=${this.orders.join(',')}`);
      }
      if (this.limitCount !== null) {
        params.push(`limit=${this.limitCount}`);
      }

      const queryString = params.length > 0 ? `?${params.join('&')}` : '';
      const headers = buildSupabaseHeaders(token, {
        'Content-Type': 'application/json',
      });

      if (this.preferHeaders.length > 0) {
        headers.Prefer = Array.from(new Set(this.preferHeaders)).join(',');
      }
      if (this.expectSingle) {
        headers.Accept = 'application/vnd.pgrst.object+json';
      }

      const res = await fetch(`${rawUrl}/rest/v1/${this.table}${queryString}`, {
        method: this.method,
        headers,
        body: this.bodyData !== null ? JSON.stringify(this.bodyData) : undefined,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: res.statusText }));
        if (this.allowEmptySingle && res.status === 406) {
          return { data: null, error: null };
        }
        return {
          data: null,
          error: {
            message: errBody.message || errBody.msg || errBody.details || 'Database request failed',
            code: errBody.code || String(res.status),
            details: errBody.details,
          },
        };
      }

      if (res.status === 204) {
        return { data: null, error: null };
      }

      const data = await res.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message || 'Network error' } };
    }
  }
}

class SupabaseRealtimeChannel {
  constructor(name) {
    this.name = name;
    this.bindings = [];
    this.ws = null;
    this.heartbeatTimer = null;
    this.authUnsubscribe = null;
    this.closed = false;
  }

  on(eventType, filter, callback) {
    this.bindings.push({ eventType, filter, callback });
    return this;
  }

  subscribe(statusCallback) {
    if (!isSupabaseConfigured || typeof WebSocket === 'undefined') {
      if (statusCallback) statusCallback('CLOSED');
      return this;
    }

    try {
      const wsBase = rawUrl.replace(/^http/, 'ws');
      const wsUrl = `${wsBase}/realtime/v1/websocket?apikey=${encodeURIComponent(rawAnonKey)}&vsn=1.0.0`;
      this.ws = new WebSocket(wsUrl);

      const handleAuthTokenChange = (_event, session) => {
        if (
          !this.closed &&
          this.ws &&
          this.ws.readyState === WebSocket.OPEN &&
          isJwtToken(session?.access_token)
        ) {
          this.ws.send(
            JSON.stringify({
              topic: `realtime:${this.name}`,
              event: 'access_token',
              payload: { access_token: session.access_token },
              ref: String(Date.now()),
            })
          );
        }
      };
      authListeners.add(handleAuthTokenChange);
      this.authUnsubscribe = () => authListeners.delete(handleAuthTokenChange);

      this.ws.onopen = async () => {
        if (this.closed) return;
        const accessToken = await getValidAccessToken();
        const postgresChanges = this.bindings
          .filter((b) => b.eventType === 'postgres_changes')
          .map((b) => ({
            event: b.filter.event || '*',
            schema: b.filter.schema || 'public',
            table: b.filter.table,
            filter: b.filter.filter || undefined,
          }));

        const joinPayload = {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
            postgres_changes: postgresChanges,
          },
        };
        if (isJwtToken(accessToken)) {
          joinPayload.access_token = accessToken;
        }

        this.ws.send(
          JSON.stringify({
            topic: `realtime:${this.name}`,
            event: 'phx_join',
            payload: joinPayload,
            ref: '1',
          })
        );

        this.heartbeatTimer = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(
              JSON.stringify({
                topic: 'phoenix',
                event: 'heartbeat',
                payload: {},
                ref: String(Date.now()),
              })
            );
          }
        }, 25000);

        if (statusCallback) statusCallback('SUBSCRIBED');
      };

      this.ws.onmessage = (msgEvent) => {
        try {
          const packet = JSON.parse(msgEvent.data);
          if (packet.event === 'postgres_changes' && packet.payload?.data) {
            const changeData = packet.payload.data;
            for (const binding of this.bindings) {
              if (
                binding.eventType === 'postgres_changes' &&
                (!binding.filter.table || binding.filter.table === changeData.table)
              ) {
                binding.callback({
                  eventType: changeData.type,
                  new: changeData.record || null,
                  old: changeData.old_record || null,
                  table: changeData.table,
                });
              }
            }
          }
        } catch {
          // Ignore malformed frame
        }
      };

      this.ws.onerror = () => {
        if (statusCallback) statusCallback('CHANNEL_ERROR');
      };
    } catch {
      if (statusCallback) statusCallback('CHANNEL_ERROR');
    }

    return this;
  }

  unsubscribe() {
    this.closed = true;
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore close errors
      }
      this.ws = null;
    }
  }
}

export const supabase = {
  auth: {
    async getSession() {
      if (!isSupabaseConfigured) return { data: { session: null }, error: null };
      const session = getStoredSession();
      if (!session) return { data: { session: null }, error: null };
      await getValidAccessToken();
      return { data: { session: getStoredSession() }, error: null };
    },

    async signUp({ email, password, options = {} }) {
      if (!isSupabaseConfigured) {
        return { data: null, error: { message: 'Supabase is not configured.' } };
      }
      try {
        const res = await fetch(`${rawUrl}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            apikey: rawAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            data: options.data || {},
          }),
        });
        const body = await res.json();
        if (!res.ok) {
          return {
            data: null,
            error: { message: body.msg || body.error_description || body.message || 'Sign up failed' },
          };
        }
        const session = body.access_token
          ? {
              ...body,
              expires_at: body.expires_at || Math.floor(Date.now() / 1000) + (body.expires_in || 3600),
            }
          : null;
        if (session) {
          saveStoredSession(session);
          notifyAuthListeners('SIGNED_IN', session);
        }
        return { data: { user: body.user || body, session }, error: null };
      } catch (err) {
        return { data: null, error: { message: err.message } };
      }
    },

    async signInWithPassword({ email, password }) {
      if (!isSupabaseConfigured) {
        return { data: null, error: { message: 'Supabase is not configured.' } };
      }
      try {
        const res = await fetch(`${rawUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            apikey: rawAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        const body = await res.json();
        if (!res.ok) {
          return {
            data: null,
            error: {
              message: body.error_description || body.msg || body.message || 'Invalid login credentials',
            },
          };
        }
        const session = {
          ...body,
          expires_at: body.expires_at || Math.floor(Date.now() / 1000) + (body.expires_in || 3600),
        };
        saveStoredSession(session);
        notifyAuthListeners('SIGNED_IN', session);
        return { data: { user: body.user, session }, error: null };
      } catch (err) {
        return { data: null, error: { message: err.message } };
      }
    },

    async signOut() {
      const session = getStoredSession();
      saveStoredSession(null);
      notifyAuthListeners('SIGNED_OUT', null);
      if (isSupabaseConfigured && isJwtToken(session?.access_token)) {
        try {
          await fetch(`${rawUrl}/auth/v1/logout`, {
            method: 'POST',
            headers: buildSupabaseHeaders(session.access_token),
          });
        } catch {
          // Ignore network error on logout
        }
      }
      return { error: null };
    },

    async resetPasswordForEmail(email, options = {}) {
      if (!isSupabaseConfigured) {
        return {
          data: null,
          error: {
            message:
              'Supabase environment variables are not configured yet. Connect your Supabase project in .env to send live password recovery emails.',
          },
        };
      }
      try {
        const redirectTo = options.redirectTo || `${window.location.origin}/login`;
        const res = await fetch(
          `${rawUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
          {
            method: 'POST',
            headers: {
              apikey: rawAnonKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          return {
            data: null,
            error: { message: body.msg || body.message || 'Failed to send password reset email' },
          };
        }
        return { data: {}, error: null };
      } catch (err) {
        return { data: null, error: { message: err.message } };
      }
    },

    onAuthStateChange(callback) {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => authListeners.delete(callback),
          },
        },
      };
    },
  },

  from(table) {
    return new PostgrestQueryBuilder(table);
  },

  async rpc(fnName, params = {}) {
    if (!isSupabaseConfigured) {
      return { data: null, error: { message: 'Supabase is not configured.' } };
    }
    try {
      const token = await getValidAccessToken();
      const res = await fetch(`${rawUrl}/rest/v1/rpc/${encodeURIComponent(fnName)}`, {
        method: 'POST',
        headers: buildSupabaseHeaders(token, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ message: res.statusText }));
        return {
          data: null,
          error: { message: errBody.message || errBody.details || 'RPC execution failed' },
        };
      }
      if (res.status === 204) return { data: null, error: null };
      const data = await res.json();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { message: err.message } };
    }
  },

  storage: {
    from(bucket) {
      return {
        async upload(path, fileOrBlob, options = {}) {
          if (!isSupabaseConfigured) {
            return { data: null, error: { message: 'Supabase is not configured.' } };
          }
          try {
            const token = await getValidAccessToken();
            const res = await fetch(
              `${rawUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${path
                .split('/')
                .map(encodeURIComponent)
                .join('/')}`,
              {
                method: 'POST',
                headers: buildSupabaseHeaders(token, {
                  'Content-Type': options.contentType || fileOrBlob.type || 'application/octet-stream',
                  'x-upsert': options.upsert ? 'true' : 'false',
                }),
                body: fileOrBlob,
              }
            );
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
              return { data: null, error: { message: body.message || body.error || 'Upload failed' } };
            }
            return { data: { path, Key: body.Key || path }, error: null };
          } catch (err) {
            return { data: null, error: { message: err.message } };
          }
        },

        async createSignedUrl(path, expiresIn = 3600) {
          if (!isSupabaseConfigured || !path) {
            return { data: null, error: { message: 'Invalid storage path' } };
          }
          try {
            const token = await getValidAccessToken();
            const res = await fetch(
              `${rawUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${path
                .split('/')
                .map(encodeURIComponent)
                .join('/')}`,
              {
                method: 'POST',
                headers: buildSupabaseHeaders(token, {
                  'Content-Type': 'application/json',
                }),
                body: JSON.stringify({ expiresIn }),
              }
            );
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.signedURL) {
              return { data: null, error: { message: body.message || 'Could not sign URL' } };
            }
            const signedUrl = body.signedURL.startsWith('http')
              ? body.signedURL
              : `${rawUrl}/storage/v1${body.signedURL}`;
            return { data: { signedUrl }, error: null };
          } catch (err) {
            return { data: null, error: { message: err.message } };
          }
        },
      };
    },
  },

  channel(name) {
    return new SupabaseRealtimeChannel(name);
  },

  removeChannel(channelInstance) {
    if (channelInstance && typeof channelInstance.unsubscribe === 'function') {
      channelInstance.unsubscribe();
    }
  },
};
