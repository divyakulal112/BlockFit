import { useState } from 'react';
import {
  ICONS,
  SHOP_TABS,
  THEMES,
  AVATARS,
  MUSICPACKS,
  PARTICLES,
  POWERUP_ITEMS,
} from '../constants/gameData';

export default function ShopView({
  profile,
  ownedItems,
  onBack,
  onBuyItem,
  onEquipItem,
  onBuyPowerup,
  onWatchAd,
  onOpenPurchaseModal,
}) {
  const [activeTab, setActiveTab] = useState('theme');
  const [coinShortage, setCoinShortage] = useState(false);

  const triggerCoinShortage = () => {
    setCoinShortage(true);
    setTimeout(() => setCoinShortage(false), 400);
  };

  const renderSwatch = (colors) => (
    <div className="swatch">
      {colors.slice(0, 6).map((c, i) => (
        <div key={i} style={{ background: c }} />
      ))}
    </div>
  );

  const renderAvatarTile = (a) => {
    let inner = <span style={{ color: 'white', fontWeight: 900 }}>P</span>;
    if (a.isDiamond) {
      inner = <span dangerouslySetInnerHTML={{ __html: ICONS.diamond }} />;
    } else if (a.icon && ICONS[a.icon]) {
      inner = <span dangerouslySetInnerHTML={{ __html: ICONS[a.icon] }} />;
    }

    return (
      <div
        className="icon-tile"
        style={{ background: `linear-gradient(145deg, ${a.grad[0]}, ${a.grad[1]})` }}
      >
        {inner}
      </div>
    );
  };

  const renderIconTile = (svgStr, grad) => (
    <div
      className="icon-tile"
      style={{
        background: `linear-gradient(145deg, ${grad[0]}, ${grad[1]})`,
        color: 'white',
      }}
      dangerouslySetInnerHTML={{ __html: svgStr }}
    />
  );

  const renderCatalogList = (cat, catalog, tileRenderer) => {
    const owned = ownedItems[cat] || [];

    return Object.keys(catalog).map((id) => {
      const item = catalog[id];
      const isOwned = owned.includes(id) || item.cost === 0;
      const isEquipped = profile.equipped?.[cat] === id;
      const locked = item.lvl && profile.highestLevel < item.lvl;

      let actionButton;
      if (locked) {
        actionButton = (
          <button className="shop-btn locked-btn" disabled>
            Locked
          </button>
        );
      } else if (isEquipped) {
        actionButton = (
          <button className="shop-btn equipped" disabled>
            Equipped
          </button>
        );
      } else if (isOwned) {
        actionButton = (
          <button className="shop-btn equip-action" onClick={() => onEquipItem(cat, id)}>
            Equip
          </button>
        );
      } else {
        actionButton = (
          <button
            className="shop-btn"
            onClick={() => {
              if (profile.coins >= item.cost) {
                onBuyItem(cat, id, item.cost);
              } else {
                triggerCoinShortage();
              }
            }}
          >
            Buy
          </button>
        );
      }

      return (
        <div key={id} className="shop-card">
          {tileRenderer(id, item)}
          <div className="shop-info">
            <div className="name">{item.name}</div>
            <div className="price">
              {item.cost === 0 ? (
                'Free'
              ) : (
                <>
                  <span dangerouslySetInnerHTML={{ __html: ICONS.coin }} /> {item.cost}
                </>
              )}
            </div>
            {locked && <div className="lockreq">Unlocks at Level {item.lvl}</div>}
          </div>
          {actionButton}
        </div>
      );
    });
  };

  return (
    <div className="screen active" id="screen-shop">
      <div className="home-top">
        <button
          className="icon-btn"
          id="btnShopBack"
          onClick={onBack}
          aria-label="Back"
          dangerouslySetInnerHTML={{ __html: ICONS.back }}
        />
        <div className="brand" style={{ fontSize: '17px' }}>
          Shop
        </div>
        <div
          className="coin-pill"
          id="shopCoinPill"
          style={coinShortage ? { color: '#ff6b6b' } : {}}
        >
          <span dangerouslySetInnerHTML={{ __html: ICONS.coin }} /> {profile.coins}
        </div>
      </div>

      <div className="shop-tabs" id="shopTabs">
        {SHOP_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`shop-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="shop-list scroll" id="shopList">
        {activeTab !== 'premium' && activeTab !== 'powerup' && (
          <>
            <div className="watch-ad-card">
              <div
                className="icon-tile"
                style={{ background: 'linear-gradient(145deg, var(--gold), #c9962f)' }}
                dangerouslySetInnerHTML={{ __html: ICONS.coin }}
              />
              <div className="shop-info">
                <div className="name">Watch Ad for Coins</div>
                <div className="price">Free · +50 coins</div>
              </div>
              <button className="shop-btn money" id="watchAdBtn" onClick={onWatchAd}>
                Watch
              </button>
            </div>
            <div style={{ height: '2px' }} />
          </>
        )}

        {activeTab === 'theme' &&
          renderCatalogList('theme', THEMES, (id, t) => renderSwatch(t.colors))}

        {activeTab === 'avatar' &&
          renderCatalogList('avatar', AVATARS, (id, a) => renderAvatarTile(a))}

        {activeTab === 'music' &&
          renderCatalogList('music', MUSICPACKS, () =>
            renderIconTile(ICONS.music, ['#33e6d8', '#1a8f86'])
          )}

        {activeTab === 'particle' &&
          renderCatalogList('particle', PARTICLES, () =>
            renderIconTile(ICONS.sparkle, ['#b56bff', '#6c2fb0'])
          )}

        {activeTab === 'powerup' && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
              <div className="pill" style={{ flex: 1, justifyContent: 'center' }}>
                <span dangerouslySetInnerHTML={{ __html: ICONS.shuffle }} /> {profile.powerups?.shuffle || 0}
              </div>
              <div className="pill" style={{ flex: 1, justifyContent: 'center' }}>
                <span dangerouslySetInnerHTML={{ __html: ICONS.bomb }} /> {profile.powerups?.bomb || 0}
              </div>
              <div className="pill" style={{ flex: 1, justifyContent: 'center' }}>
                <span dangerouslySetInnerHTML={{ __html: ICONS.hint }} /> {profile.powerups?.hint || 0}
              </div>
            </div>

            {POWERUP_ITEMS.map((item) => {
              const icon =
                item.kind === 'shuffle'
                  ? ICONS.shuffle
                  : item.kind === 'bomb'
                  ? ICONS.bomb
                  : ICONS.hint;

              return (
                <div key={item.id} className="shop-card">
                  {renderIconTile(icon, ['#ff5a3c', '#c8431f'])}
                  <div className="shop-info">
                    <div className="name">{item.name}</div>
                    <div className="price">
                      <span dangerouslySetInnerHTML={{ __html: ICONS.coin }} /> {item.cost}
                    </div>
                  </div>
                  <button
                    className="shop-btn"
                    onClick={() => {
                      if (profile.coins >= item.cost) {
                        onBuyPowerup(item.kind, item.qty, item.cost);
                      } else {
                        triggerCoinShortage();
                      }
                    }}
                  >
                    Buy
                  </button>
                </div>
              );
            })}
          </>
        )}

        {activeTab === 'premium' && (
          <div className="shop-card">
            {renderIconTile(ICONS.diamond, ['#ffcf4d', '#c9962f'])}
            <div className="shop-info">
              <div className="name">Remove Ads Forever</div>
              <div className="price">One-time purchase</div>
            </div>
            {profile.adFree ? (
              <button className="shop-btn equipped" disabled>
                Active
              </button>
            ) : (
              <button className="shop-btn money" onClick={onOpenPurchaseModal}>
                $3.99
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
