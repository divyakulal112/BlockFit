import { ICONS } from '../constants/gameData';

const RULES = [
  {
    title: 'Fill the Grid',
    desc: 'Drag pieces from the tray onto the 8x8 board. Any empty space works as long as the piece fits.',
  },
  {
    title: 'Clear Lines',
    desc: 'Fill an entire row or column and it bursts, clearing the board and scoring points.',
  },
  {
    title: 'Combo Bonus',
    desc: 'Clearing multiple lines at once earns big bonus points and a combo callout.',
  },
  {
    title: 'Watch for Blockers',
    desc: 'Higher levels add locked obstacle tiles. Clear their row or column to free them.',
  },
  {
    title: 'Use Power-Ups',
    desc: 'Shuffle your tray, bomb a tough cluster, or reveal a hint — stock up in the Shop.',
  },
  {
    title: 'Don’t Get Stuck',
    desc: 'If none of your 3 pieces fit anywhere on the board, the run ends — plan ahead!',
  },
];

export default function RulesView({ onBack }) {
  return (
    <div className="screen active" id="screen-rules">
      <div className="home-top">
        <button
          className="icon-btn"
          id="btnRulesBack"
          onClick={onBack}
          aria-label="Back"
          dangerouslySetInnerHTML={{ __html: ICONS.back }}
        />
        <div className="brand" style={{ fontSize: '17px' }}>
          How to Play
        </div>
        <div style={{ width: '44px' }} />
      </div>

      <div className="rules-list scroll" id="rulesList">
        {RULES.map((r, i) => (
          <div key={i} className="rule-card">
            <div className="rule-num">{i + 1}</div>
            <div>
              <div className="rule-title">{r.title}</div>
              <p>{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
