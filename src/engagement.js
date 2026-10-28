import {auth} from './auth.js';

const gamePattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const visitorPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function feedbackError(message, status = 0, code = 'feedback_unavailable') {
  return Object.assign(new Error(message), {status, code});
}

// Per-tab drafts survive Clerk redirects/reloads. Storage failure still keeps
// them in memory for this page. No auth tokens or account claims are stored.
export function createCommentDraftStore({storage = () => globalThis.sessionStorage} = {}) {
  const drafts = new Map();
  const key = gameId => `openarcade:comment-draft:${gameId}`;
  function valid(gameId) { return typeof gameId === 'string' && gameId.length <= 64 && gamePattern.test(gameId); }
  return {
    get(gameId) {
      if (!valid(gameId)) return '';
      if (drafts.has(gameId)) return drafts.get(gameId);
      try { const value = storage()?.getItem(key(gameId)); if (typeof value === 'string') { drafts.set(gameId, value); return value; } } catch {}
      return '';
    },
    save(gameId, text) {
      if (!valid(gameId) || typeof text !== 'string') return;
      const value = text;
      drafts.set(gameId, value);
      try { storage()?.setItem(key(gameId), value); } catch {}
    },
    clear(gameId, expectedText) {
      if (!valid(gameId) || (expectedText !== undefined && this.get(gameId) !== expectedText)) return false;
      drafts.set(gameId, '');
      try { storage()?.removeItem(key(gameId)); } catch {}
      return true;
    },
  };
}

export const commentDrafts = createCommentDraftStore();
export const getCommentDraft = gameId => commentDrafts.get(gameId);
export const saveCommentDraft = (gameId, text) => commentDrafts.save(gameId, text);
export const clearCommentDraft = (gameId, expectedText) => commentDrafts.clear(gameId, expectedText);

export function createEngagementClient({fetch: fetchRequest = (...args) => globalThis.fetch(...args), getToken = () => auth.getToken(), getAuthState = () => auth.getState(), drafts = commentDrafts, storage = () => globalThis.localStorage, randomUUID = () => globalThis.crypto.randomUUID()} = {}) {
  let cachedVisitor;
  function visitorId() {
    if (cachedVisitor) return cachedVisitor;
    try { const stored = storage()?.getItem('openarcade:visitor'); if (typeof stored === 'string' && visitorPattern.test(stored)) return cachedVisitor = stored; } catch {}
    cachedVisitor = randomUUID();
    try { storage()?.setItem('openarcade:visitor', cachedVisitor); } catch {}
    return cachedVisitor;
  }
  async function request(path, options = {}) {
    let response;
    try { response = await fetchRequest(path, {...options, headers: {'Content-Type': 'application/json', 'X-Arcade-Visitor': visitorId(), ...options.headers}}); }
    catch { throw feedbackError('Feedback is unavailable. Please try again later.'); }
    let data;
    try { data = await response.json(); } catch { throw feedbackError('Feedback is unavailable. Please try again later.'); }
    if (!response.ok) throw feedbackError(data.error || 'Feedback is unavailable. Please try again later.', response.status, data.code);
    return data;
  }
  function mutate(gameId, action, fields = {}, headers = {}) {
    return request('/api/feedback', {method: 'POST', headers, body: JSON.stringify({gameId, action, ...fields})});
  }
  return {
    getAllEngagement: () => request('/api/feedback?all=1'),
    getEngagement: gameId => request('/api/feedback?gameId=' + encodeURIComponent(gameId)),
    recordPlay: gameId => mutate(gameId, 'play'),
    setVote: (gameId, value) => mutate(gameId, 'vote', {value}),
    async addComment(gameId, rawText) {
      const text = typeof rawText === 'string' ? rawText.trim() : '';
      if (!text || Array.from(text).length > 280) throw feedbackError('Comments must contain 1 to 280 characters.', 400, 'invalid_comment');
      drafts.save(gameId, rawText);
      let token;
      try { token = await getToken(); } catch { throw feedbackError('Sign-in verification is unavailable. Please try again. Your draft is saved.', 503, 'auth_unavailable'); }
      if (!token) {
        if (getAuthState()?.status === 'signed-out') throw feedbackError('Sign in again to post your comment. Your draft is saved.', 401, 'sign_in_required');
        throw feedbackError('Sign-in verification is unavailable. Please try again. Your draft is saved.', 503, 'auth_unavailable');
      }
      const data = await mutate(gameId, 'comment', {text}, {Authorization: `Bearer ${token}`});
      // Do not erase text edited while this submission was in flight.
      drafts.clear(gameId, rawText);
      return data;
    },
  };
}

const client = createEngagementClient();
export const getAllEngagement = () => client.getAllEngagement();
export const getEngagement = gameId => client.getEngagement(gameId);
export const recordPlay = gameId => client.recordPlay(gameId);
export const setVote = (gameId, value) => client.setVote(gameId, value);
export const addComment = (gameId, text) => client.addComment(gameId, text);
