import { useState, useEffect } from 'react';
import { ICONS, AVATARS } from '../constants/gameData';

function RenameContent({ initialName, onSave, onCancel }) {
  const [tempName, setTempName] = useState(initialName || 'Player');

  return (
    <>
      <h2>Your Name</h2>
      <input
        id="nameInput"
        maxLength={14}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          background: 'var(--card)',
          color: 'var(--text)',
          fontSize: '15px',
          textAlign: 'center',
          marginBottom: '16px',
          outline: 'none',
        }}
        value={tempName}
        onChange={(e) => setTempName(e.target.value)}
        autoFocus
      />
      <button
        className="panel-btn"
        id="saveNameBtn"
        onClick={() => {
          const cleaned = tempName.trim().slice(0, 14);
          if (cleaned) onSave(cleaned);
        }}
      >
        Save
      </button>
      <button className="panel-btn secondary" id="cancelNameBtn" onClick={onCancel}>
        Cancel
      </button>
    </>
  );
}

function WatchAdContent({ onClaim }) {
  const [countdown, setCountdown] = useState(3);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(iv);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 700);

    return () => clearInterval(iv);
  }, []);

  return (
    <>
      {!isFinished ? (
        <>
          <h2>Playing Ad…</h2>
          <p>Simulated rewarded ad (this is where a real Ad SDK would play a video).</p>
          <p style={{ fontWeight: 800, color: 'var(--gold)' }}>
            Simulated ad ending in {countdown}...
          </p>
        </>
      ) : (
        <>
          <h2>Reward Earned!</h2>
          <div className="coin-line">
            <span dangerouslySetInnerHTML={{ __html: ICONS.coin }} /> +50 coins
          </div>
          <button className="panel-btn" id="claimBtn" onClick={onClaim}>
            Nice!
          </button>
        </>
      )}
    </>
  );
}

export default function ModalOverlay({
  modalType,
  modalData,
  profile,
  settings,
  onClose,
  onOpenSettings,
  onSaveName,
  onToggleSetting,
  onRetryEndless,
  onRetryLevel,
  onContinueLevels,
  onGoHome,
  onClaimAdReward,
  onConfirmPurchase,
}) {
  if (!modalType) return null;

  const handleBackdropClick = (e) => {
    if (e.target.id === 'overlay-backdrop') {
      if (modalType === 'gameOver' || modalType === 'levelFail') {
        onGoHome();
      } else if (modalType === 'levelWin') {
        onContinueLevels();
      } else {
        onClose();
      }
    }
  };

  const getAvatarBadge = () => {
    const a = AVATARS[profile?.equipped?.avatar] || AVATARS.default;
    const grad = `linear-gradient(145deg, ${a.grad[0]}, ${a.grad[1]})`;
    let inner = (profile?.name || 'P').trim().charAt(0).toUpperCase() || 'P';
    if (a.isDiamond) inner = <span dangerouslySetInnerHTML={{ __html: ICONS.diamond }} />;
    else if (a.icon && ICONS[a.icon]) inner = <span dangerouslySetInnerHTML={{ __html: ICONS[a.icon] }} />;

    return { grad, inner };
  };

  return (
    <div
      id="overlay-backdrop"
      className="show"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="panel" id="overlayPanel">
        {modalType === 'settings' && (
          <>
            <h2>Settings</h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '12px 14px',
                marginBottom: '14px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: getAvatarBadge().grad,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '19px',
                  flexShrink: 0,
                }}
              >
                {getAvatarBadge().inner}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 800,
                    fontSize: '15px',
                  }}
                >
                  {profile.name}
                  <span
                    id="editNameBtn"
                    style={{ cursor: 'pointer', color: 'var(--text-dim)', display: 'inline-flex' }}
                    onClick={() => modalData?.openRename?.()}
                    dangerouslySetInnerHTML={{ __html: ICONS.edit }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    marginTop: '6px',
                    fontSize: '11px',
                    color: 'var(--text-dim)',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <span dangerouslySetInnerHTML={{ __html: ICONS.star }} /> Lv {profile.highestLevel}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <span dangerouslySetInnerHTML={{ __html: ICONS.trophy }} /> {profile.lifetimePoints} pts
                  </span>
                </div>
              </div>
            </div>

            <div className="menu-list">
              <div className="menu-item">
                Sound Effects
                <div
                  className={`toggle ${settings.sound ? 'on' : ''}`}
                  onClick={() => onToggleSetting('sound')}
                >
                  <div className="knob" />
                </div>
              </div>
              <div className="menu-item">
                Music
                <div
                  className={`toggle ${settings.music ? 'on' : ''}`}
                  onClick={() => onToggleSetting('music')}
                >
                  <div className="knob" />
                </div>
              </div>
              <div className="menu-item">
                Vibration
                <div
                  className={`toggle ${settings.haptics ? 'on' : ''}`}
                  onClick={() => onToggleSetting('haptics')}
                >
                  <div className="knob" />
                </div>
              </div>
            </div>

            <button
              className="panel-btn secondary"
              id="closeMenuBtn"
              style={{ marginTop: '16px' }}
              onClick={onClose}
            >
              Close
            </button>
          </>
        )}

        {modalType === 'rename' && (
          <RenameContent
            initialName={profile?.name}
            onSave={onSaveName}
            onCancel={onOpenSettings}
          />
        )}

        {modalType === 'gameOver' && (
          <>
            <h2>Game Over</h2>
            <p>You scored {modalData?.score || 0} points.</p>
            <div className="coin-line">
              <span dangerouslySetInnerHTML={{ __html: ICONS.coin }} /> +{modalData?.earned || 0} coins earned
            </div>
            <button className="panel-btn" id="retryBtn" onClick={onRetryEndless}>
              Play Again
            </button>
            <button className="panel-btn secondary" id="homeBtn" onClick={onGoHome}>
              Home
            </button>
          </>
        )}

        {modalType === 'levelWin' && (
          <>
            <h2>Level Complete!</h2>
            <p>Level {modalData?.levelId} cleared.</p>
            <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'center' }}>
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  style={{
                    opacity: i <= (modalData?.stars || 1) ? 1 : 0.25,
                    margin: '0 2px',
                    display: 'inline-flex',
                  }}
                  dangerouslySetInnerHTML={{ __html: ICONS.star }}
                />
              ))}
            </div>
            <div className="coin-line">
              <span dangerouslySetInnerHTML={{ __html: ICONS.coin }} /> +{modalData?.reward || 0} coins
            </div>
            <button className="panel-btn" id="nextBtn" onClick={onContinueLevels}>
              Continue
            </button>
            <button className="panel-btn secondary" id="homeBtn2" onClick={onGoHome}>
              Home
            </button>
          </>
        )}

        {modalType === 'levelFail' && (
          <>
            <h2>No Moves Left</h2>
            <p>
              Reached {modalData?.score || 0} of {modalData?.target || 0} needed.
            </p>
            <button className="panel-btn" id="retryLevelBtn" onClick={onRetryLevel}>
              Try Again
            </button>
            <button className="panel-btn secondary" id="homeBtn3" onClick={onGoHome}>
              Home
            </button>
          </>
        )}

        {modalType === 'watchAd' && (
          <WatchAdContent onClaim={onClaimAdReward} />
        )}

        {modalType === 'purchase' && (
          <>
            <h2>Remove Ads Forever</h2>
            <p>
              One-time purchase — $3.99. This prototype simulates the purchase flow; a real build
              would connect to App Store / Play Billing.
            </p>
            <button className="panel-btn" id="confirmBuyBtn" onClick={onConfirmPurchase}>
              Confirm Purchase — $3.99
            </button>
            <button className="panel-btn secondary" id="cancelBuyBtn" onClick={onClose}>
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
