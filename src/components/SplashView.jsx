import { useEffect, useState, useRef } from 'react';
import { playSound, ensureAudio } from '../services/audio';

export default function SplashView({ onComplete, soundEnabled }) {
  const [percent, setPercent] = useState(0);
  const [batteryWrapScale, setBatteryWrapScale] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    const totalSteps = 8;
    let step = 0;

    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        step++;
        const pct = Math.min(100, Math.round((step / totalSteps) * 100));
        setPercent(pct);

        ensureAudio();
        playSound('splashStep', soundEnabled, { step });

        if (step >= totalSteps) {
          clearInterval(interval);
          playSound('splashComplete', soundEnabled);
          setBatteryWrapScale(true);

          setTimeout(() => {
            setBatteryWrapScale(false);
          }, 160);

          setTimeout(() => {
            if (!completedRef.current) {
              completedRef.current = true;
              onComplete();
            }
          }, 280);
        }
      }, 170);

      return () => clearInterval(interval);
    }, 650);

    return () => clearTimeout(timeout);
  }, [onComplete, soundEnabled]);

  return (
    <div className="screen active" id="screen-splash">
      <div className="splash-blocks">
        <div className="sblock sb1" />
        <div className="sblock sb2" />
        <div className="sblock sb3" />
        <div className="sblock sb4" />
      </div>
      <div className="splash-title" id="splashTitle">
        BlockFit
      </div>
      <div
        className="battery-wrap"
        id="batteryWrap"
        style={batteryWrapScale ? { transform: 'scale(1.06)' } : {}}
      >
        <div className="battery-row">
          <div className="battery-shell">
            <div className="battery-fill" id="batteryFill" style={{ width: `${percent}%` }} />
          </div>
          <div className="battery-nub" />
        </div>
        <div className="battery-pct" id="batteryPct">
          {percent}%
        </div>
      </div>
    </div>
  );
}
