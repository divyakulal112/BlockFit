import { ICONS, LEVELS } from '../constants/gameData';

export default function LevelsView({ profile, onBack, onSelectLevel }) {
  return (
    <div className="screen active" id="screen-levels">
      <div className="home-top">
        <button
          className="icon-btn"
          id="btnLevelsBack"
          onClick={onBack}
          aria-label="Back"
          dangerouslySetInnerHTML={{ __html: ICONS.back }}
        />
        <div className="brand" style={{ fontSize: '17px' }}>
          Levels
        </div>
        <div style={{ width: '44px' }} />
      </div>

      <div className="levels-grid scroll" id="levelsGrid">
        {LEVELS.map((lv) => {
          const locked = lv.id > profile.highestLevel;
          const done = profile.completedLevels?.includes(lv.id);
          const stars = profile.levelStars?.[lv.id] || 0;
          const best = profile.levelBest?.[lv.id] || 0;

          if (locked) {
            return (
              <button key={lv.id} className="level-chip locked" disabled>
                <span dangerouslySetInnerHTML={{ __html: ICONS.lock }} />
                <div className="lvl-target">Lv {lv.id}</div>
              </button>
            );
          }

          return (
            <button
              key={lv.id}
              className={`level-chip${done ? ' done' : ''}`}
              onClick={() => onSelectLevel(lv)}
            >
              <div className="lvl-num">{lv.id}</div>
              {done && (
                <div className="lvl-stars">
                  {[1, 2, 3].map((s) => (
                    <span
                      key={s}
                      style={{ opacity: s <= stars ? 1 : 0.25 }}
                      dangerouslySetInnerHTML={{ __html: ICONS.star }}
                    />
                  ))}
                </div>
              )}
              <div className="lvl-target">
                {done ? `Best ${best}` : `Target ${lv.target}`}
              </div>
              {lv.obstacles > 0 && (
                <div className="obst-tag">{lv.obstacles} blockers</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
