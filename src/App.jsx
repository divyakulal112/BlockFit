import { useState, useEffect, useCallback, useTransition } from 'react';
import SplashView from './components/SplashView';
import HomeView from './components/HomeView';
import GameView from './components/GameView';
import LevelsView from './components/LevelsView';
import ShopView from './components/ShopView';
import RulesView from './components/RulesView';
import ModalOverlay from './components/ModalOverlay';
import {
  loadProfile,
  saveProfile,
  loadSettings,
  saveSettings,
  loadBestScore,
  saveBestScore,
  getOwnedList,
  saveOwnedList,
} from './services/storage';
import {
  ensureAudio,
  startMusic,
  stopMusic,
  playSound,
} from './services/audio';
import { LEVELS } from './constants/gameData';
import './App.css';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash');
  const [profile, setProfile] = useState(() => loadProfile());
  const [settings, setSettings] = useState(() => loadSettings());
  const [bestScore, setBestScore] = useState(() => loadBestScore());
  const [ownedItems, setOwnedItems] = useState(() => ({
    theme: getOwnedList('theme'),
    avatar: getOwnedList('avatar'),
    music: getOwnedList('music'),
    particle: getOwnedList('particle'),
  }));

  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [gameMode, setGameMode] = useState({ mode: 'endless' });
  const [gameSessionId, setGameSessionId] = useState(1);
  const [, startTransition] = useTransition();

  // Save profile updates to storage
  const updateProfile = useCallback((updater) => {
    setProfile((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      saveProfile(next);
      return next;
    });
  }, []);

  // Save settings updates to storage
  const updateSettings = useCallback((updater) => {
    setSettings((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      saveSettings(next);
      return next;
    });
  }, []);

  // First interaction audio unlock
  useEffect(() => {
    const handleFirstPointer = () => {
      ensureAudio();
      if (settings.music && currentScreen === 'game') {
        startMusic(profile.equipped?.music, settings.music);
      }
    };
    window.addEventListener('pointerdown', handleFirstPointer, { once: true });
    return () => window.removeEventListener('pointerdown', handleFirstPointer);
  }, [currentScreen, profile.equipped?.music, settings.music]);

  // Handle music play/pause on screen or setting change
  useEffect(() => {
    if (currentScreen === 'game' && settings.music) {
      startMusic(profile.equipped?.music, settings.music);
    } else {
      stopMusic();
    }
  }, [currentScreen, profile.equipped?.music, settings.music]);

  // Screen Navigation with tap sound
  const navigateTo = useCallback((screen) => {
    playSound('tap', settings.sound);
    startTransition(() => {
      setCurrentScreen(screen);
    });
  }, [settings.sound]);

  // Modal handlers
  const openModal = useCallback((type, data = null) => {
    playSound('tap', settings.sound);
    setModalType(type);
    setModalData(data);
  }, [settings.sound]);

  const closeModal = useCallback(() => {
    playSound('tap', settings.sound);
    setModalType(null);
    setModalData(null);
  }, [settings.sound]);

  // Start a game
  const startGame = useCallback((mode) => {
    setGameMode(mode);
    setGameSessionId((id) => id + 1);
    setModalType(null);
    setModalData(null);
    startTransition(() => {
      setCurrentScreen('game');
    });
  }, []);

  // Play button clicked on home (plays next unfinished level)
  const handlePlayFromHome = useCallback(() => {
    playSound('tap', settings.sound);
    let nextLevel = LEVELS[LEVELS.length - 1];
    for (const lv of LEVELS) {
      if (!profile.completedLevels.includes(lv.id)) {
        nextLevel = lv;
        break;
      }
    }
    startGame({
      mode: 'level',
      levelId: nextLevel.id,
      target: nextLevel.target,
      reward: nextLevel.reward,
      obstacles: nextLevel.obstacles,
    });
  }, [profile.completedLevels, settings.sound, startGame]);

  // Game Events
  const handleUpdateScore = useCallback((score) => {
    if (score > bestScore) {
      setBestScore(score);
      saveBestScore(score);
    }
  }, [bestScore]);

  const handleAddLifetimePoints = useCallback((pts) => {
    updateProfile((prev) => ({
      ...prev,
      lifetimePoints: prev.lifetimePoints + pts,
    }));
  }, [updateProfile]);

  const handleGameOver = useCallback((score, earned) => {
    updateProfile((prev) => ({
      ...prev,
      coins: prev.coins + earned,
    }));
    openModal('gameOver', { score, earned });
  }, [openModal, updateProfile]);

  const handleLevelWin = useCallback((levelId, score, stars, reward) => {
    updateProfile((prev) => {
      const completedLevels = prev.completedLevels.includes(levelId)
        ? prev.completedLevels
        : [...prev.completedLevels, levelId];
      const highestLevel = Math.max(
        prev.highestLevel,
        Math.min(LEVELS.length, levelId + 1)
      );
      const levelStars = {
        ...prev.levelStars,
        [levelId]: Math.max(prev.levelStars[levelId] || 0, stars),
      };
      const levelBest = {
        ...prev.levelBest,
        [levelId]: Math.max(prev.levelBest[levelId] || 0, score),
      };

      return {
        ...prev,
        coins: prev.coins + reward,
        completedLevels,
        highestLevel,
        levelStars,
        levelBest,
      };
    });

    openModal('levelWin', { levelId, score, stars, reward });
  }, [openModal, updateProfile]);

  const handleLevelFail = useCallback((score, target) => {
    openModal('levelFail', { score, target });
  }, [openModal]);

  // Power-up Usage in Game
  const handleConsumePowerup = useCallback((kind) => {
    updateProfile((prev) => ({
      ...prev,
      powerups: {
        ...prev.powerups,
        [kind]: Math.max(0, (prev.powerups[kind] || 0) - 1),
      },
    }));
  }, [updateProfile]);

  // Shop actions
  const handleBuyItem = useCallback((cat, id, cost) => {
    playSound('tap', settings.sound);
    const currentOwned = ownedItems[cat] || [];
    const nextOwned = [...currentOwned, id];
    saveOwnedList(cat, nextOwned);
    setOwnedItems((prev) => ({ ...prev, [cat]: nextOwned }));

    updateProfile((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      equipped: {
        ...prev.equipped,
        [cat]: id,
      },
    }));
  }, [ownedItems, settings.sound, updateProfile]);

  const handleEquipItem = useCallback((cat, id) => {
    playSound('tap', settings.sound);
    updateProfile((prev) => ({
      ...prev,
      equipped: {
        ...prev.equipped,
        [cat]: id,
      },
    }));
  }, [settings.sound, updateProfile]);

  const handleBuyPowerup = useCallback((kind, qty, cost) => {
    playSound('tap', settings.sound);
    updateProfile((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      powerups: {
        ...prev.powerups,
        [kind]: (prev.powerups[kind] || 0) + qty,
      },
    }));
  }, [settings.sound, updateProfile]);

  const handleClaimAdReward = useCallback(() => {
    playSound('tap', settings.sound);
    updateProfile((prev) => ({
      ...prev,
      coins: prev.coins + 50,
    }));
    closeModal();
  }, [closeModal, settings.sound, updateProfile]);

  const handleConfirmPurchase = useCallback(() => {
    playSound('tap', settings.sound);
    updateProfile((prev) => ({
      ...prev,
      adFree: true,
    }));
    closeModal();
  }, [closeModal, settings.sound, updateProfile]);

  // Settings Toggles
  const handleToggleSetting = useCallback((key) => {
    updateSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'sound' && next.sound) {
        playSound('tap', true);
      }
      return next;
    });
  }, [updateSettings]);

  const handleSaveName = useCallback((name) => {
    playSound('tap', settings.sound);
    updateProfile((prev) => ({ ...prev, name }));
    openModal('settings', {
      openRename: () => openModal('rename'),
    });
  }, [openModal, settings.sound, updateProfile]);

  return (
    <main style={{ width: '100%', height: '100%', position: 'relative' }}>
      {currentScreen === 'splash' && (
        <SplashView
          onComplete={() => setCurrentScreen('home')}
          soundEnabled={settings.sound}
        />
      )}

      {currentScreen === 'home' && (
        <HomeView
          profile={profile}
          onPlay={handlePlayFromHome}
          onOpenLevels={() => navigateTo('levels')}
          onOpenShop={() => navigateTo('shop')}
          onOpenRules={() => navigateTo('rules')}
          onOpenSettings={() =>
            openModal('settings', {
              openRename: () => openModal('rename'),
            })
          }
        />
      )}

      {currentScreen === 'game' && (
        <GameView
          key={`${gameMode.mode}-${gameMode.levelId || 'endless'}-${gameSessionId}`}
          profile={profile}
          settings={settings}
          bestScore={bestScore}
          gameMode={gameMode}
          onUpdateScore={handleUpdateScore}
          onGameOver={handleGameOver}
          onLevelWin={handleLevelWin}
          onLevelFail={handleLevelFail}
          onGoHome={() => navigateTo('home')}
          onOpenSettings={() =>
            openModal('settings', {
              openRename: () => openModal('rename'),
            })
          }
          onConsumePowerup={handleConsumePowerup}
          onAddLifetimePoints={handleAddLifetimePoints}
        />
      )}

      {currentScreen === 'levels' && (
        <LevelsView
          profile={profile}
          onBack={() => navigateTo('home')}
          onSelectLevel={(lv) =>
            startGame({
              mode: 'level',
              levelId: lv.id,
              target: lv.target,
              reward: lv.reward,
              obstacles: lv.obstacles,
            })
          }
        />
      )}

      {currentScreen === 'shop' && (
        <ShopView
          profile={profile}
          ownedItems={ownedItems}
          onBack={() => navigateTo('home')}
          onBuyItem={handleBuyItem}
          onEquipItem={handleEquipItem}
          onBuyPowerup={handleBuyPowerup}
          onWatchAd={() => openModal('watchAd')}
          onOpenPurchaseModal={() => openModal('purchase')}
        />
      )}

      {currentScreen === 'rules' && (
        <RulesView onBack={() => navigateTo('home')} />
      )}

      <ModalOverlay
        modalType={modalType}
        modalData={modalData}
        profile={profile}
        settings={settings}
        onClose={closeModal}
        onOpenSettings={() =>
          openModal('settings', {
            openRename: () => openModal('rename'),
          })
        }
        onSaveName={handleSaveName}
        onToggleSetting={handleToggleSetting}
        onRetryEndless={() => startGame({ mode: 'endless' })}
        onRetryLevel={() => startGame(gameMode)}
        onContinueLevels={() => {
          closeModal();
          navigateTo('levels');
        }}
        onGoHome={() => {
          closeModal();
          navigateTo('home');
        }}
        onClaimAdReward={handleClaimAdReward}
        onConfirmPurchase={handleConfirmPurchase}
      />
    </main>
  );
}