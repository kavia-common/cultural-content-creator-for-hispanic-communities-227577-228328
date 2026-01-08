import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { CaptionVariationType } from '../services/openaiCaptions';

const STORAGE_PREFIX = 'ccch.artifacts.v1';

const ArtifactType = Object.freeze({
  captions: 'captions',
  scripts: 'scripts',
  outlines: 'outlines'
});

function nowTs() {
  return Date.now();
}

function storageKeyForArtifact(artifactId) {
  return `${STORAGE_PREFIX}.${artifactId || 'default'}`;
}

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function newId(prefix) {
  return `${prefix}-${nowTs()}-${Math.random().toString(16).slice(2)}`;
}

function makeItem({ variationType, text, language, emotion }) {
  const id = newId(`item-${variationType}`);
  const versionId = newId('v');
  return {
    id,
    variationType,
    text: (text || '').toString(),
    language: (language || 'en').toString(),
    emotion: (emotion || '').toString(),
    versions: [
      {
        id: versionId,
        ts: nowTs(),
        actor: 'system',
        note: 'generated',
        text: (text || '').toString()
      }
    ]
  };
}

function addAudit(state, entry) {
  const e = {
    id: entry.id || newId('audit'),
    ts: entry.ts || nowTs(),
    actor: entry.actor || 'user',
    action: entry.action || 'updated',
    artifactType: entry.artifactType || '',
    variationType: entry.variationType || null,
    details: entry.details || ''
  };
  return { ...state, audit: [e, ...(state.audit || [])].slice(0, 200) };
}

function normalizeVariation(type) {
  if (type === CaptionVariationType.long) return CaptionVariationType.long;
  if (type === CaptionVariationType.short) return CaptionVariationType.short;
  if (type === CaptionVariationType.question) return CaptionVariationType.question;
  return CaptionVariationType.short;
}

function normalizeList(rawList) {
  const list = Array.isArray(rawList) ? rawList : [];
  const byType = new Map(list.map((i) => [normalizeVariation(i.variationType), i]));
  const order = [CaptionVariationType.long, CaptionVariationType.short, CaptionVariationType.question];
  return order
    .map((type) => byType.get(type))
    .filter(Boolean)
    .map((i) => ({
      id: i.id || newId(`item-${type}`),
      variationType: normalizeVariation(i.variationType),
      text: (i.text || '').toString(),
      language: (i.language || 'en').toString(),
      emotion: (i.emotion || '').toString(),
      versions: Array.isArray(i.versions) && i.versions.length ? i.versions : []
    }));
}

function createInitialState(artifactId) {
  return {
    artifactId: artifactId || 'default',
    context: {
      topic: '',
      niche: 'telemedicine',
      emotion: 'closeness',
      language: 'en'
    },
    captions: { items: [], approvedId: '' },
    scripts: { items: [], approvedId: '' },
    outlines: { items: [], approvedId: '' },
    engagement: {
      survey: '',
      openQuestion: '',
      challenge: ''
    },
    predictive: {
      segments: [],
      tweaks: []
    },
    audit: []
  };
}

function normalizeLoadedState(raw, artifactId) {
  const base = createInitialState(artifactId);
  if (!raw || typeof raw !== 'object') return base;

  const context = {
    topic: typeof raw.context?.topic === 'string' ? raw.context.topic : '',
    niche: typeof raw.context?.niche === 'string' ? raw.context.niche : 'telemedicine',
    emotion: typeof raw.context?.emotion === 'string' ? raw.context.emotion : 'closeness',
    language: raw.context?.language === 'es' ? 'es' : 'en'
  };

  const captionsItems = normalizeList(raw.captions?.items);
  const scriptsItems = normalizeList(raw.scripts?.items);
  const outlinesItems = normalizeList(raw.outlines?.items);

  const engagement = {
    survey: typeof raw.engagement?.survey === 'string' ? raw.engagement.survey : '',
    openQuestion: typeof raw.engagement?.openQuestion === 'string' ? raw.engagement.openQuestion : '',
    challenge: typeof raw.engagement?.challenge === 'string' ? raw.engagement.challenge : ''
  };

  const predictive = {
    segments: Array.isArray(raw.predictive?.segments) ? raw.predictive.segments : [],
    tweaks: Array.isArray(raw.predictive?.tweaks) ? raw.predictive.tweaks : []
  };

  const audit = Array.isArray(raw.audit) ? raw.audit.slice(0, 200) : [];

  return {
    artifactId: artifactId || base.artifactId,
    context,
    captions: { items: captionsItems, approvedId: raw.captions?.approvedId || '' },
    scripts: { items: scriptsItems, approvedId: raw.scripts?.approvedId || '' },
    outlines: { items: outlinesItems, approvedId: raw.outlines?.approvedId || '' },
    engagement,
    predictive,
    audit
  };
}

function upsertItemsFromGenerated({ items, language, emotion }) {
  const list = Array.isArray(items) ? items : [];
  return list
    .slice(0, 3)
    .map((c) =>
      makeItem({
        variationType: normalizeVariation(c.variationType),
        text: (c.text || '').toString(),
        language,
        emotion
      })
    );
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return normalizeLoadedState(action.payload, action.artifactId);

    case 'SET_CONTEXT': {
      const next = { ...state, context: { ...state.context, ...action.context } };
      return addAudit(next, {
        actor: 'user',
        action: 'context_updated',
        artifactType: 'context',
        details: `topic=${(action.context?.topic || '').toString().slice(0, 80)}`
      });
    }

    case 'SET_CAPTIONS': {
      const next = {
        ...state,
        captions: { ...state.captions, items: upsertItemsFromGenerated(action.payload), approvedId: '' }
      };
      return addAudit(next, { actor: 'system', action: 'generated', artifactType: ArtifactType.captions });
    }

    case 'SET_SCRIPTS': {
      const next = {
        ...state,
        scripts: { ...state.scripts, items: upsertItemsFromGenerated(action.payload), approvedId: '' }
      };
      return addAudit(next, { actor: 'system', action: 'generated', artifactType: ArtifactType.scripts });
    }

    case 'SET_OUTLINES': {
      const next = {
        ...state,
        outlines: { ...state.outlines, items: upsertItemsFromGenerated(action.payload), approvedId: '' }
      };
      return addAudit(next, { actor: 'system', action: 'generated', artifactType: ArtifactType.outlines });
    }

    case 'EDIT_ITEM': {
      const { artifactType, id, nextText, actor, note } = action;
      const slice = state[artifactType];
      if (!slice) return state;

      const nextItems = (slice.items || []).map((i) => {
        if (i.id !== id) return i;
        const versionId = newId('v');
        const text = (nextText || '').toString();
        return {
          ...i,
          text,
          versions: [
            { id: versionId, ts: nowTs(), actor: actor || 'user', note: note || 'edited', text },
            ...(i.versions || [])
          ].slice(0, 50)
        };
      });

      const next = { ...state, [artifactType]: { ...slice, items: nextItems } };
      return addAudit(next, {
        actor: actor || 'user',
        action: 'edited',
        artifactType,
        details: note || ''
      });
    }

    case 'APPROVE_ITEM': {
      const { artifactType, id, actor } = action;
      const slice = state[artifactType];
      if (!slice) return state;
      const next = { ...state, [artifactType]: { ...slice, approvedId: id } };
      return addAudit(next, { actor: actor || 'user', action: 'approved', artifactType });
    }

    case 'RESTORE_VERSION': {
      const { artifactType, id, versionId, actor } = action;
      const slice = state[artifactType];
      if (!slice) return state;

      const nextItems = (slice.items || []).map((i) => {
        if (i.id !== id) return i;
        const v = (i.versions || []).find((vv) => vv.id === versionId);
        if (!v) return i;
        const newVersionId = newId('v');
        return {
          ...i,
          text: v.text,
          versions: [
            {
              id: newVersionId,
              ts: nowTs(),
              actor: actor || 'user',
              note: 'restored',
              text: v.text
            },
            ...(i.versions || [])
          ].slice(0, 50)
        };
      });

      const next = { ...state, [artifactType]: { ...slice, items: nextItems } };
      return addAudit(next, { actor: actor || 'user', action: 'restored', artifactType });
    }

    case 'SET_ENGAGEMENT': {
      const next = { ...state, engagement: { ...state.engagement, ...action.payload } };
      return addAudit(next, { actor: 'user', action: 'updated', artifactType: 'engagement' });
    }

    case 'SET_PREDICTIVE': {
      const next = { ...state, predictive: action.payload || { segments: [], tweaks: [] } };
      return addAudit(next, { actor: 'system', action: 'generated', artifactType: 'predictive' });
    }

    default:
      return state;
  }
}

const ArtifactsContext = createContext(null);

// PUBLIC_INTERFACE
export function ArtifactsProvider({ artifactId, children }) {
  /** Provider for multi-artifact content (captions/scripts/outlines) with versioning + audit trail (frontend-only). */
  const [state, dispatch] = useReducer(reducer, null, () => {
    const id = artifactId || 'default';
    try {
      const raw = safeParse(window.sessionStorage.getItem(storageKeyForArtifact(id)), null);
      if (raw) return normalizeLoadedState(raw, id);
    } catch {
      // ignore
    }
    try {
      const raw = safeParse(window.localStorage.getItem(storageKeyForArtifact(id)), null);
      if (raw) return normalizeLoadedState(raw, id);
    } catch {
      // ignore
    }
    return createInitialState(id);
  });

  useEffect(() => {
    const id = artifactId || state.artifactId || 'default';
    const key = storageKeyForArtifact(id);

    const payload = {
      context: state.context,
      captions: { items: state.captions.items, approvedId: state.captions.approvedId },
      scripts: { items: state.scripts.items, approvedId: state.scripts.approvedId },
      outlines: { items: state.outlines.items, approvedId: state.outlines.approvedId },
      engagement: state.engagement,
      predictive: state.predictive,
      audit: state.audit.slice(0, 200)
    };

    try {
      window.sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [state, artifactId]);

  const actions = useMemo(() => {
    return {
      // PUBLIC_INTERFACE
      setContext: (context) => {
        /** Set the generation context (topic/niche/emotion/language). */
        dispatch({ type: 'SET_CONTEXT', context });
      },
      // PUBLIC_INTERFACE
      setCaptionsFromGeneration: ({ captions, language, emotion }) => {
        /** Store generated caption variations (initial versions + audit). */
        dispatch({ type: 'SET_CAPTIONS', payload: { items: captions, language, emotion } });
      },
      // PUBLIC_INTERFACE
      setScriptsFromGeneration: ({ scripts, language, emotion }) => {
        /** Store generated microreel scripts (initial versions + audit). */
        dispatch({ type: 'SET_SCRIPTS', payload: { items: scripts, language, emotion } });
      },
      // PUBLIC_INTERFACE
      setOutlinesFromGeneration: ({ outlines, language, emotion }) => {
        /** Store generated silent video outlines (initial versions + audit). */
        dispatch({ type: 'SET_OUTLINES', payload: { items: outlines, language, emotion } });
      },
      // PUBLIC_INTERFACE
      editItem: ({ artifactType, id, nextText, actor, note }) => {
        /** Edit a content item, creating a new version and audit entry. */
        dispatch({ type: 'EDIT_ITEM', artifactType, id, nextText, actor, note });
      },
      // PUBLIC_INTERFACE
      approveItem: ({ artifactType, id, actor }) => {
        /** Approve a specific item (gate for preview/export selection). */
        dispatch({ type: 'APPROVE_ITEM', artifactType, id, actor });
      },
      // PUBLIC_INTERFACE
      restoreVersion: ({ artifactType, id, versionId, actor }) => {
        /** Restore a previous version (creates a new 'restored' version). */
        dispatch({ type: 'RESTORE_VERSION', artifactType, id, versionId, actor });
      },
      // PUBLIC_INTERFACE
      setEngagement: (payload) => {
        /** Set engagement elements (survey/open question/challenge). */
        dispatch({ type: 'SET_ENGAGEMENT', payload });
      },
      // PUBLIC_INTERFACE
      setPredictive: (payload) => {
        /** Set predictive suggestions (segments/tweaks). */
        dispatch({ type: 'SET_PREDICTIVE', payload });
      }
    };
  }, []);

  const value = useMemo(() => ({ state, actions, ArtifactType }), [state, actions]);

  return <ArtifactsContext.Provider value={value}>{children}</ArtifactsContext.Provider>;
}

// PUBLIC_INTERFACE
export function useArtifacts() {
  /** Hook to access artifact state + actions. */
  const ctx = useContext(ArtifactsContext);
  if (!ctx) throw new Error('useArtifacts must be used within ArtifactsProvider');
  return ctx;
}

// PUBLIC_INTERFACE
export const ArtifactTypes = ArtifactType;
