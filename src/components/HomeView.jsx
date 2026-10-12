import { useMemo } from 'react';
import { ICONS, AVATARS } from '../constants/gameData';

export default function HomeView({
  profile,
  onPlay,
  onOpenLevels,
  onOpenShop,
  onOpenRules,
  onOpenSettings,
}) {
  const avatarStyle = useMemo(() => {
    const a = AVATARS[profile.equipped?.avatar] || AVATARS.default;
    const grad = `linear-gradient(145deg, ${a.grad[0]}, ${a.grad[1]})`;
    let innerNode = (profile.name || 'P').trim().charAt(0).toUpperCase() || 'P';

    if (a.isDiamond) {
      innerNode = <span dangerouslySetInnerHTML={{ __html: ICONS.diamond }} />;
    } else if (a.icon && ICONS[a.icon]) {
      innerNode = <span dangerouslySetInnerHTML={{ __html: ICONS[a.icon] }} />;
    }

    return { grad, innerNode };
  }, [profile.equipped?.avatar, profile.name]);

  const confettiDots = useMemo(() => {
    const colors = ['#ffd23c', '#ff7ae0', '#00ffd5', '#7c4dff', '#ffffff'];
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      size: 4 + ((i * 3) % 6),
      left: `${(i * 19) % 100}%`,
      bottom: '-20px',
      color: colors[i % colors.length],
      duration: `${10 + ((i * 2) % 10)}s`,
      delay: `${(i * 1.5) % 10}s`,
    }));
  }, []);

  return (
    <div className="screen active" id="screen-home">
      <div className="blob blob1" />
      <div className="blob blob2" />
      <div className="blob blob3" />

      {confettiDots.map((c) => (
        <div
          key={c.id}
          className="confetti-dot"
          style={{
            width: `${c.size}px`,
            height: `${c.size}px`,
            left: c.left,
            bottom: c.bottom,
            background: c.color,
            animationDuration: c.duration,
            animationDelay: c.delay,
          }}
        />
      ))}

      <div className="home-top">
        <div className="profile-cluster" id="profileCluster">
          <div
            className="profile-icon-btn"
            id="profileIconBtn"
            style={{ background: avatarStyle.grad }}
            onClick={onOpenSettings}
            role="button"
            tabIndex={0}
          >
            {avatarStyle.innerNode}
          </div>
          <div className="coin-pill-home" id="coinPillHome">
            <span dangerouslySetInnerHTML={{ __html: ICONS.coin }} /> {profile.coins}
          </div>
          <div className="level-pill-home" id="levelPillHome">
            <span dangerouslySetInnerHTML={{ __html: ICONS.star }} /> Lv {profile.highestLevel}
          </div>
        </div>
        <button
          className="icon-btn"
          id="btnHomeMenu"
          onClick={onOpenSettings}
          aria-label="Settings"
          dangerouslySetInnerHTML={{ __html: ICONS.gear }}
        />
      </div>

      <div className="hero-card">
        <div className="hblock hb1"><div className="hface" /></div>
        <div className="hblock hb2"><div className="hface" /></div>
        <div className="hblock hb3"><div className="hface" /></div>
        <div className="hblock hb4"><div className="hface" /></div>
        <div className="hblock hb5"><div className="hface" /></div>
      </div>

      <button className="play-btn-wide" id="btnPlay" onClick={onPlay}>
        <span dangerouslySetInnerHTML={{ __html: ICONS.play }} />
        <span className="play-label-inline">Play</span>
      </button>

      <div className="grid2x2">
        <button className="grid-btn" id="btnLevels" onClick={onOpenLevels}>
          <span dangerouslySetInnerHTML={{ __html: ICONS.grid }} />
          <span>Levels</span>
        </button>
        <button className="grid-btn" id="btnShop" onClick={onOpenShop}>
          <span dangerouslySetInnerHTML={{ __html: ICONS.bag }} />
          <span>Shop</span>
        </button>
        <button className="grid-btn" id="btnRules" onClick={onOpenRules}>
          <span dangerouslySetInnerHTML={{ __html: ICONS.book }} />
          <span>Rules</span>
        </button>
        <button className="grid-btn" id="btnSettings" onClick={onOpenSettings}>
          <span dangerouslySetInnerHTML={{ __html: ICONS.gear }} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
