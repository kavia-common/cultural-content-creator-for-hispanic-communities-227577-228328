import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../common/Modal';
import { getOpenAIKeySource, setOpenAIKeyForSession } from '../../services/openaiClient';
import {
  checkAllIntegrationsHealth,
  getCachedIntegrationHealth,
  getIntegrationTokenSource,
  Integrations,
  IntegrationHealthStatus,
  setIntegrationTokenForSession,
  clearIntegrationTokenForSession
} from '../../services/integrations';
import { useAppMessages } from '../../state/messages';

function statusBadge(status) {
  if (status === IntegrationHealthStatus.healthy) return 'badge badgeComplete';
  if (status === IntegrationHealthStatus.degraded) return 'badge badgeChanges';
  return 'badge badgeUpcoming';
}

function statusDotLabel(status) {
  if (status === IntegrationHealthStatus.healthy) return '●';
  if (status === IntegrationHealthStatus.degraded) return '●';
  return '●';
}

// PUBLIC_INTERFACE
export default function SettingsModal({ isOpen, onClose }) {
  /** Settings modal for temporary, in-memory API keys/tokens (session only). */
  const { t } = useTranslation();
  const { pushMessage } = useAppMessages();

  const inputRef = useRef(null);

  const [openaiKey, setOpenaiKey] = useState('');
  const [savedOpenai, setSavedOpenai] = useState(false);

  const [metaToken, setMetaToken] = useState('');
  const [waToken, setWaToken] = useState('');
  const [canvaToken, setCanvaToken] = useState('');

  const [health, setHealth] = useState(getCachedIntegrationHealth());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSavedOpenai(false);
    setOpenaiKey('');
    setMetaToken('');
    setWaToken('');
    setCanvaToken('');
    setHealth(getCachedIntegrationHealth());
  }, [isOpen]);

  const openaiSource = useMemo(() => getOpenAIKeySource(), [isOpen, savedOpenai]);

  const openaiSourceLabel = useMemo(() => {
    if (openaiSource === 'env') return t('settings.tokenSourceEnv');
    if (openaiSource === 'memory') return t('settings.tokenSourceSession');
    return t('settings.tokenSourceNone');
  }, [openaiSource, t]);

  const closeLabel = t('common.closeDialog');

  const refreshHealth = async () => {
    setChecking(true);
    try {
      const res = await checkAllIntegrationsHealth();
      if (res.ok) {
        setHealth(res.data);
        pushMessage({ kind: 'success', messageKey: 'settings.healthChecked', live: 'polite' });
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.title')}
      describedById="settings-desc"
      initialFocusRef={inputRef}
      closeLabel={closeLabel}
    >
      <div id="settings-desc" className="srOnly">
        {t('settings.description')}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <section className="card" aria-label={t('settings.securityTitle')}>
          <div className="muted" style={{ marginTop: 0 }}>
            {t('settings.securityBody')}
          </div>
        </section>

        <section className="card" aria-label={t('settings.openai.title')}>
          <div className="cardHeader">
            <h3 className="h2">{t('settings.openai.title')}</h3>
            <span className="badge" aria-label={t('settings.tokenSourceLabel')}>
              <span className="badgeDot" aria-hidden="true" />
              {openaiSourceLabel}
            </span>
          </div>

          <label htmlFor="openai-key" className="fieldHelp" style={{ fontWeight: 800 }}>
            {t('settings.openai.keyLabel')}
          </label>

          <input
            id="openai-key"
            ref={inputRef}
            className="input"
            value={openaiKey}
            placeholder={t('settings.openai.keyPlaceholder')}
            onChange={(e) => setOpenaiKey(e.target.value)}
            autoComplete="off"
            spellCheck="false"
            inputMode="text"
          />

          <div className="fieldHelp" style={{ marginTop: 8 }}>
            {t('settings.openai.keyHelp')}
          </div>

          <div className="srOnly" aria-live="polite" aria-atomic="true">
            {savedOpenai ? t('settings.saved') : ''}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btnPrimary"
              onClick={() => {
                setOpenAIKeyForSession(openaiKey);
                setSavedOpenai(true);
                pushMessage({ kind: 'success', messageKey: 'settings.saved', live: 'polite' });
              }}
              disabled={!openaiKey.trim()}
            >
              {t('settings.save')}
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => {
                setOpenAIKeyForSession('');
                setOpenaiKey('');
                setSavedOpenai(true);
                pushMessage({ kind: 'info', messageKey: 'settings.cleared', live: 'polite' });
              }}
            >
              {t('settings.clear')}
            </button>
          </div>
        </section>

        <section className="card" aria-label={t('settings.otherTokensTitle')}>
          <div className="cardHeader">
            <h3 className="h2">{t('settings.otherTokensTitle')}</h3>
            <button
              type="button"
              className="btn btnSecondary"
              onClick={refreshHealth}
              aria-busy={checking ? 'true' : 'false'}
              disabled={checking}
              data-testid="integrations-refresh"
            >
              {checking ? t('settings.checking') : t('settings.checkHealth')}
            </button>
          </div>

          <TokenRow
            label={t('settings.meta.title')}
            source={getIntegrationTokenSource(Integrations.meta)}
            value={metaToken}
            placeholder={t('settings.meta.placeholder')}
            onChange={setMetaToken}
            onSave={() => {
              setIntegrationTokenForSession(Integrations.meta, metaToken);
              pushMessage({ kind: 'success', messageKey: 'settings.saved', live: 'polite' });
              setMetaToken('');
            }}
            onClear={() => {
              clearIntegrationTokenForSession(Integrations.meta);
              pushMessage({ kind: 'info', messageKey: 'settings.cleared', live: 'polite' });
            }}
          />

          <TokenRow
            label={t('settings.whatsapp.title')}
            source={getIntegrationTokenSource(Integrations.whatsapp)}
            value={waToken}
            placeholder={t('settings.whatsapp.placeholder')}
            onChange={setWaToken}
            onSave={() => {
              setIntegrationTokenForSession(Integrations.whatsapp, waToken);
              pushMessage({ kind: 'success', messageKey: 'settings.saved', live: 'polite' });
              setWaToken('');
            }}
            onClear={() => {
              clearIntegrationTokenForSession(Integrations.whatsapp);
              pushMessage({ kind: 'info', messageKey: 'settings.cleared', live: 'polite' });
            }}
          />

          <TokenRow
            label={t('settings.canva.title')}
            source={getIntegrationTokenSource(Integrations.canva)}
            value={canvaToken}
            placeholder={t('settings.canva.placeholder')}
            onChange={setCanvaToken}
            onSave={() => {
              setIntegrationTokenForSession(Integrations.canva, canvaToken);
              pushMessage({ kind: 'success', messageKey: 'settings.saved', live: 'polite' });
              setCanvaToken('');
            }}
            onClear={() => {
              clearIntegrationTokenForSession(Integrations.canva);
              pushMessage({ kind: 'info', messageKey: 'settings.cleared', live: 'polite' });
            }}
          />

          <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
            <IntegrationStatusRow
              label={t('settings.openai.title')}
              sourceLabel={openaiSourceLabel}
              health={health.openai}
            />
            <IntegrationStatusRow
              label={t('settings.meta.title')}
              sourceLabel={t(`settings.source.${getIntegrationTokenSource(Integrations.meta)}`)}
              health={health.meta}
            />
            <IntegrationStatusRow
              label={t('settings.whatsapp.title')}
              sourceLabel={t(`settings.source.${getIntegrationTokenSource(Integrations.whatsapp)}`)}
              health={health.whatsapp}
            />
            <IntegrationStatusRow
              label={t('settings.canva.title')}
              sourceLabel={t(`settings.source.${getIntegrationTokenSource(Integrations.canva)}`)}
              health={health.canva}
            />
          </div>
        </section>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={onClose}>
            {t('settings.close')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function TokenRow({ label, source, value, placeholder, onChange, onSave, onClear }) {
  const { t } = useTranslation();

  return (
    <div className="card" aria-label={label}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <strong>{label}</strong>
        <span className="badge" aria-label={t('settings.tokenSourceLabel')}>
          <span className="badgeDot" aria-hidden="true" />
          {t(`settings.source.${source}`)}
        </span>
      </div>

      <input
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck="false"
        style={{ marginTop: 10 }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btnPrimary" onClick={onSave} disabled={!value.trim()}>
          {t('settings.save')}
        </button>
        <button type="button" className="btn" onClick={onClear}>
          {t('settings.clear')}
        </button>
      </div>
    </div>
  );
}

function IntegrationStatusRow({ label, sourceLabel, health }) {
  const { t } = useTranslation();
  const status = health?.status || 'disconnected';
  const lastCheckedAt = health?.lastCheckedAt || 0;

  return (
    <div className="card" aria-label={t('settings.integrationStatusRowAria', { name: label })}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <strong>{label}</strong>

        <span className={statusBadge(status)} aria-label={t('settings.health.statusLabel')}>
          <span className="badgeDot" aria-hidden="true">
            {statusDotLabel(status)}
          </span>
          {t(`settings.health.status.${status}`)}
        </span>
      </div>

      <div className="muted" style={{ marginTop: 8 }}>
        {t('settings.health.source', { source: sourceLabel })}
        {lastCheckedAt ? ` • ${t('settings.health.lastChecked', { ts: new Date(lastCheckedAt).toLocaleString() })}` : ''}
      </div>

      {health?.lastErrorKey ? (
        <div className="callout calloutError" style={{ marginTop: 10 }}>
          {t(health.lastErrorKey)}
        </div>
      ) : null}
    </div>
  );
}
