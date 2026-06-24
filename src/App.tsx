/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Atom,
  Scroll,
  Globe,
  Palette,
  Lightbulb,
  Gamepad2,
  Sparkles,
  Skull,
  Book,
  Ghost,
  Eye,
  Flame,
  Snowflake,
  ShieldAlert,
  Smile,
  UserX,
  Shield,
  Dribbble,
  Wand2,
  Crown,
  Swords,
  Play,
  Volume2,
  VolumeX,
  Timer,
  Heart,
  Award,
  Coins,
  RotateCcw,
  Info,
  Check,
  X,
  ChevronRight,
  Pause,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { QUIZ_QUESTIONS, GENRE_MAP, QuizQuestion } from './data/quizData';
import { generateEnemy, ActiveEnemy } from './data/enemyData';
import { sound } from './utils/sound';

// Lucideアイコンの動的マッピング用コンポーネント
const IconRenderer = ({ name, className }: { name: string; className?: string }) => {
  const icons: Record<string, React.ComponentType<any>> = {
    Atom, Scroll, Globe, Palette, Lightbulb, Gamepad2, Sparkles, Skull, Book, Ghost, Eye, Flame, Snowflake, ShieldAlert, Smile, UserX, Shield, Dribbble, Wand2, Crown, Swords, Play, Volume2, VolumeX, Timer, Heart, Award, Coins, RotateCcw, Info, Check, X, ChevronRight, Pause, LogOut
  };
  const IconComponent = icons[name] || HelpCircle;
  return <IconComponent className={className} />;
};

export default function App() {
  // --- ゲーム進行ステート ---
  const [gameState, setGameState] = useState<'start' | 'battle' | 'shop' | 'defeat' | 'victory'>('start');
  const [playerName, setPlayerName] = useState('理の求道者');
  const [muted, setMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // --- プレイヤーパラメータ ---
  const [hp, setHp] = useState(100);
  const [maxHp, setMaxHp] = useState(100);
  const [gold, setGold] = useState(0);
  const [floor, setFloor] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [attackPower, setAttackPower] = useState(20); // 基本攻撃力
  const [hasEyeOfWeakness, setHasEyeOfWeakness] = useState(false); // 弱点分析の魔眼バフ

  // --- ゲーム全体時間タイマー ---
  const [gameTimeLeft, setGameTimeLeft] = useState(120); // 制限時間120秒

  // --- 敵のステート ---
  const [currentEnemy, setCurrentEnemy] = useState<ActiveEnemy | null>(null);

  // --- クイズ問題ステート ---
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(10); // 一問あたりの制限時間
  const [maxQuestionTime, setMaxQuestionTime] = useState(10);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  
  // --- フィードバック・エフェクト ---
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'correct' | 'incorrect' | 'timeout' | null>(null);
  const [damageDealt, setDamageDealt] = useState<number | null>(null);
  const [damageReceived, setDamageReceived] = useState<number | null>(null);
  const [isEnemyAttacking, setIsEnemyAttacking] = useState(false);
  const [isPlayerAttacking, setIsPlayerAttacking] = useState(false);
  const [showFloorUpEffect, setShowFloorUpEffect] = useState(false);

  // 不正解・時間切れ時の自動進行用カウントダウン (5秒)
  const [autoProgressTimeLeft, setAutoProgressTimeLeft] = useState<number | null>(null);

  // --- ハイスコア (localStorage) ---
  const [highFloor, setHighFloor] = useState(1);
  const [highScore, setHighScore] = useState(0);

  // タイマーやアニメーションを制御するためのref
  const gameTimerRef = useRef<NodeJS.Timeout | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoProgressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 音量のミュート状態変更
  const toggleMute = () => {
    const nextMute = sound.toggleMute();
    setMuted(nextMute);
  };

  // ローカルストレージからハイスコアをロード
  useEffect(() => {
    const savedFloor = localStorage.getItem('trivia_tower_high_floor');
    const savedScore = localStorage.getItem('trivia_tower_high_score');
    if (savedFloor) setHighFloor(parseInt(savedFloor, 10));
    if (savedScore) setHighScore(parseInt(savedScore, 10));
  }, []);

  // ハイスコア保存
  const saveHighScore = (finalFloor: number, finalScore: number) => {
    if (finalFloor > highFloor) {
      setHighFloor(finalFloor);
      localStorage.setItem('trivia_tower_high_floor', finalFloor.toString());
    }
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('trivia_tower_high_score', finalScore.toString());
    }
  };

  // --- ゲームタイマー (ゲーム全体時間の減少) ---
  useEffect(() => {
    if (gameState === 'battle' && !isPaused) {
      gameTimerRef.current = setInterval(() => {
        setGameTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(gameTimerRef.current!);
            handleGameOver();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    }

    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [gameState, isPaused]);

  // --- クイズ一問あたりのタイマー (ミリ秒単位でスムーズに減衰) ---
  useEffect(() => {
    if (gameState === 'battle' && !isPaused && currentQuestion && selectedOption === null && !showFeedback) {
      const intervalMs = 100;
      questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft((prev) => {
          if (prev <= 0.1) {
            clearInterval(questionTimerRef.current!);
            handleQuestionTimeout();
            return 0;
          }
          return prev - (intervalMs / 1000);
        });
      }, intervalMs);
    } else {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    }

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [gameState, isPaused, currentQuestion, selectedOption, showFeedback]);

  // --- 正解・不正解・時間切れ時の自動進行タイマー ---
  useEffect(() => {
    if (gameState === 'battle' && !isPaused && autoProgressTimeLeft !== null) {
      autoProgressTimerRef.current = setInterval(() => {
        setAutoProgressTimeLeft((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(autoProgressTimerRef.current!);
            // 敵が生きていたら次の問題へ、撃破していたら次の階層へ
            if (currentEnemy) {
              if (currentEnemy.hp > 0) {
                setNextQuestion(currentEnemy);
              } else {
                proceedToNextFloor();
              }
            }
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (autoProgressTimerRef.current) clearInterval(autoProgressTimerRef.current);
    }

    return () => {
      if (autoProgressTimerRef.current) clearInterval(autoProgressTimerRef.current);
    };
  }, [gameState, isPaused, autoProgressTimeLeft, currentEnemy]);

  // --- ゲーム開始 ---
  const startGame = () => {
    sound.playClick();
    setHp(100);
    setMaxHp(100);
    setGold(0);
    setFloor(1);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setAttackPower(20);
    setGameTimeLeft(120);
    setUsedQuestionIds([]);
    setHasEyeOfWeakness(false);
    setIsPaused(false);
    setAutoProgressTimeLeft(null);
    
    // 1階の敵を生成
    initNewFloor(1);
  };

  // --- 新しい階層をロードする ---
  const initNewFloor = (targetFloor: number) => {
    setFloor(targetFloor);
    const enemy = generateEnemy(targetFloor);
    
    // 弱点分析の魔眼バフが有効な場合、敵の初期HPを削る
    if (hasEyeOfWeakness) {
      enemy.hp = Math.floor(enemy.hp * 0.65); // 35%を削る
    }

    setCurrentEnemy(enemy);
    
    // ボス戦のアラート
    if (enemy.isBoss) {
      sound.playBossAlert();
    } else {
      sound.playClick();
    }

    // クイズ問題を設定
    setNextQuestion(enemy);
    
    setGameState('battle');
    setIsPaused(false);
    setShowFloorUpEffect(true);
    setTimeout(() => setShowFloorUpEffect(false), 1500);
  };

  // --- クイズ問題の選択とセット ---
  const setNextQuestion = (enemy: ActiveEnemy) => {
    setSelectedOption(null);
    setShowFeedback(false);
    setFeedbackType(null);
    setDamageDealt(null);
    setDamageReceived(null);
    setAutoProgressTimeLeft(null);

    // 敵の弱点ジャンルを特定割合で優先して出題する (例: 65% の確率で弱点問題)
    const shouldTargetWeakness = Math.random() < 0.65;
    let availableQuestions = QUIZ_QUESTIONS.filter(q => !usedQuestionIds.includes(q.id));

    // 未使用問題がなくなったらリセット
    if (availableQuestions.length === 0) {
      availableQuestions = [...QUIZ_QUESTIONS];
      setUsedQuestionIds([]);
    }

    let filtered = availableQuestions;
    if (shouldTargetWeakness) {
      const weaknessQuestions = availableQuestions.filter(q => q.genre === enemy.weakness);
      if (weaknessQuestions.length > 0) {
        filtered = weaknessQuestions;
      }
    }

    // ランダムに選出
    const randomIndex = Math.floor(Math.random() * filtered.length);
    const question = filtered[randomIndex];

    // 出題済みリストに登録
    setUsedQuestionIds((prev) => [...prev, question.id]);
    setCurrentQuestion(question);

    // 制限時間の設定 (ボスは短い)
    const limit = enemy.isBoss 
      ? (floor === 10 ? 8.5 : floor === 20 ? 7.5 : floor === 30 ? 7 : floor === 40 ? 6.5 : 5.5)
      : 11.5;
    
    setQuestionTimeLeft(limit);
    setMaxQuestionTime(limit);
  };

  // --- 回答を送信した時の処理 ---
  const handleAnswerSubmit = (optionIndex: number) => {
    if (selectedOption !== null || showFeedback || isPaused) return;
    
    setSelectedOption(optionIndex);
    const isCorrect = optionIndex === currentQuestion?.answerIndex;

    if (isCorrect) {
      handleAnswerCorrect();
    } else {
      handleAnswerIncorrect(false);
    }
  };

  // --- クイズ制限時間切れの処理 ---
  const handleQuestionTimeout = () => {
    handleAnswerIncorrect(true);
  };

  // --- 【正解時】のゲーム演出と処理 ---
  const handleAnswerCorrect = () => {
    sound.playCorrect();
    setFeedbackType('correct');
    setShowFeedback(true);
    setAutoProgressTimeLeft(3); // 正解時は3秒で自動進行

    // 1問解くごとに全体の制限時間を＋1秒回復 (タイムリミット救済)
    setGameTimeLeft((prev) => Math.min(prev + 1, 300)); // 最大300秒

    // スピード倍率 (早く答えるほど高火力。残り時間の割合を基準にする)
    const timePercentage = questionTimeLeft / maxQuestionTime;
    const speedBonus = 1 + (timePercentage * 1.5); // 1.0倍〜2.5倍

    // 属性（弱点）一致ボーナス
    const isWeaknessMatched = currentQuestion?.genre === currentEnemy?.weakness;
    const weaknessMultiplier = isWeaknessMatched ? 2.0 : 1.0;

    // ダメージ計算
    let damage = Math.floor(attackPower * speedBonus * weaknessMultiplier);

    // 弱点分析の魔眼を消費（一度きり1.5倍）
    if (hasEyeOfWeakness) {
      damage = Math.floor(damage * 1.5);
      setHasEyeOfWeakness(false); // バフ解除
    }

    setDamageDealt(damage);

    // 連続コンボ処理
    const nextCombo = combo + 1;
    setCombo(nextCombo);
    if (nextCombo > maxCombo) {
      setMaxCombo(nextCombo);
    }

    // スコア＆ゴールド計算
    const comboScoreBonus = Math.min(nextCombo * 10, 200);
    const addedScore = Math.floor((damage * 2) + comboScoreBonus + (timePercentage * 100));
    setScore((prev) => prev + addedScore);

    // ゴールド獲得
    const baseGold = isWeaknessMatched ? 10 : 6;
    const speedGold = Math.floor(timePercentage * 6);
    const comboGold = Math.floor(nextCombo / 3);
    const addedGold = baseGold + speedGold + comboGold;
    setGold((prev) => prev + addedGold);

    // プレイヤーの攻撃アニメーション
    setIsPlayerAttacking(true);
    setTimeout(() => setIsPlayerAttacking(false), 500);

    // 敵のHPを減らす
    setTimeout(() => {
      if (!currentEnemy) return;
      const nextHp = Math.max(0, currentEnemy.hp - damage);
      setCurrentEnemy((prev) => prev ? { ...prev, hp: nextHp } : null);

      if (nextHp <= 0) {
        // 敵撃破！
        handleEnemyDefeat();
      }
    }, 400);
  };

  // --- 【不正解・時間切れ時】のゲーム演出と処理 ---
  const handleAnswerIncorrect = (isTimeout: boolean) => {
    sound.playIncorrect();
    setFeedbackType(isTimeout ? 'timeout' : 'incorrect');
    setShowFeedback(true);
    setCombo(0); // コンボリセット

    // 5秒の自動進行カウントダウンを開始する
    setAutoProgressTimeLeft(5);

    // 敵からの反撃
    setIsEnemyAttacking(true);
    sound.playDamage();

    // 敵の攻撃力（階層に比例）
    const enemyAttack = Math.floor(12 + floor * 1.6);
    setDamageReceived(enemyAttack);

    setTimeout(() => {
      setIsEnemyAttacking(false);
      setHp((prev) => {
        const nextHp = Math.max(0, prev - enemyAttack);
        if (nextHp <= 0) {
          // プレイヤーHPが0でゲームオーバー
          handleGameOver();
        }
        return nextHp;
      });
    }, 600);
  };

  // --- 敵の撃破処理 ---
  const handleEnemyDefeat = () => {
    sound.playDefeat();
    
    // 撃破ボーナス
    const isBoss = currentEnemy?.isBoss || false;
    const timeRecovery = isBoss ? 40 : 15; // ボスなら全体時間が大幅回復
    setGameTimeLeft((prev) => Math.min(prev + timeRecovery, 300));

    const enemyGoldReward = isBoss ? (50 + floor * 3) : (15 + floor);
    setGold((prev) => prev + enemyGoldReward);

    const defeatScore = isBoss ? 1500 : 300;
    setScore((prev) => prev + defeatScore);
  };

  // --- 次の階層へ進む、またはショップへ ---
  const proceedToNextFloor = () => {
    sound.playClick();
    const nextFloor = floor + 1;

    // 50階クリアで一度完全制覇
    if (floor === 50) {
      setGameState('victory');
      sound.playVictory();
      saveHighScore(floor, score);
      return;
    }

    // 5階層ごと、またはボス撃破（10の倍数階）のあとにショップが出現する
    const isShopFloor = (nextFloor - 1) % 5 === 0;

    if (isShopFloor) {
      setFloor(nextFloor);
      setGameState('shop');
    } else {
      initNewFloor(nextFloor);
    }
  };

  // --- ゲームオーバー処理 ---
  const handleGameOver = () => {
    sound.playGameOver();
    setGameState('defeat');
    setAutoProgressTimeLeft(null);
    saveHighScore(floor, score);
  };

  // --- ショップでのアイテム購入 ---
  const buyItem = (itemType: 'heal' | 'time' | 'attack' | 'max_hp' | 'eye', cost: number) => {
    if (gold < cost) return;

    sound.playClick();
    setGold((prev) => prev - cost);

    switch (itemType) {
      case 'heal':
        // 全回復は強すぎるので15HP回復に調整
        setHp((prev) => Math.min(prev + 15, maxHp));
        break;
      case 'time':
        setGameTimeLeft((prev) => Math.min(prev + 30, 300)); // タイムリミット+30秒
        break;
      case 'attack':
        setAttackPower((prev) => prev + 6); // 攻撃力 +6
        break;
      case 'max_hp':
        setMaxHp((prev) => prev + 25); // 最大HP +25
        setHp((prev) => Math.min(prev + 25, maxHp + 25)); // HPも25回復
        break;
      case 'eye':
        setHasEyeOfWeakness(true); // 弱点分析の魔眼バフ有効
        break;
    }
  };

  // --- 一時停止（ポーズ）の切り替え ---
  const togglePause = () => {
    sound.playClick();
    setIsPaused((prev) => !prev);
  };

  // --- 途中棄権してタイトルに戻る ---
  const quitToTitle = () => {
    sound.playClick();
    setIsPaused(false);
    setAutoProgressTimeLeft(null);
    setGameState('start');
  };

  return (
    <div className="h-screen max-h-screen bg-[#0a0a0c] text-[#e0e0e0] flex flex-col justify-between select-none font-sans relative overflow-hidden border-4 md:border-8 border-[#1a1a1f]" id="app-root">
      
      {/* 煌めく背景星屑・魔導ルーンエフェクト (Sophisticated Dark) */}
      <div className="absolute inset-0 bg-[#0a0a0c] z-0 pointer-events-none" />
      <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center z-0">
        <div className="w-[500px] h-[500px] border border-[#c9a050] rounded-full animate-[spin_120s_linear_infinite]" />
        <div className="w-[300px] h-[300px] border border-dashed border-[#c9a050] rounded-full absolute animate-[spin_80s_linear_infinite_reverse]" />
      </div>

      {/* ヘッダー: 「Sophisticated Dark」スタイル。アンティークゴールド(#c9a050)のアクセント */}
      <header className="px-5 py-2.5 border-b border-[#2d2d35] bg-[#111116] flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="border border-[#c9a050] p-1 bg-[#1a1a1f] rotate-45 shadow-md shadow-black flex items-center justify-center">
            <Swords className="w-3.5 h-3.5 text-[#c9a050] -rotate-45" />
          </div>
          <div className="flex flex-col ml-0.5">
            <span className="font-serif text-sm md:text-base font-bold tracking-wider text-white">
              理の塔 <span className="text-[10px] font-mono font-normal text-[#c9a050] ml-1">TOWER OF TRIVIA</span>
            </span>
            <span className="text-[8px] font-mono text-[#8e8e93] uppercase tracking-widest leading-none mt-0.5">Knowledge RPG</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#8e8e93] font-mono">
            <Award className="w-3.5 h-3.5 text-[#c9a050]" />
            <span>RECORD:</span>
            <span className="text-[#c9a050] font-bold">{highFloor}F</span>
            <span className="text-[#2d2d35]">/</span>
            <span className="text-white font-bold">{highScore.toLocaleString()} pts</span>
          </div>

          <button
            onClick={toggleMute}
            className="p-1.5 hover:bg-[#1a1a1f] border border-[#2d2d35] hover:border-[#c9a050] transition-colors"
            title={muted ? "音声を再生" : "ミュート"}
            id="btn-mute-toggle"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5 text-[#c9a050]" />}
          </button>

          {/* バトル中またはショップ中にのみポーズボタンを表示 */}
          {(gameState === 'battle' || gameState === 'shop') && (
            <button
              onClick={togglePause}
              className="p-1.5 bg-[#1a1a1f] border border-[#2d2d35] hover:border-[#c9a050] text-[#c9a050] transition-colors flex items-center gap-1 text-xs font-mono font-bold"
              id="btn-pause-toggle"
            >
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden md:inline">PAUSE</span>
            </button>
          )}
        </div>
      </header>

      {/* メインビューポート: 高さを抑えスクロールしないように flex-1 調整 */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-3 flex flex-col justify-center z-10 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ==================== 1. スタート（タイトル）画面 ==================== */}
          {gameState === 'start' && (
            <motion.div
              key="start-screen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full max-w-lg mx-auto bg-[#111116] border border-[#2d2d35] p-6 relative shadow-2xl overflow-y-auto max-h-[85vh] scrollbar-thin"
            >
              <div className="absolute -top-3 left-10 bg-[#0a0a0c] px-4 text-[#c9a050] text-xs font-mono tracking-widest">
                WELCOME SEEKER
              </div>

              {/* 中央のアートシンボル */}
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 bg-gradient-to-b from-[#2d2d35] to-[#1a1a1f] border border-[#c9a050] rotate-45 flex items-center justify-center shadow-2xl shadow-black">
                  <Crown className="w-8 h-8 text-[#c9a050] -rotate-45 animate-pulse" />
                </div>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-3xl font-serif text-white tracking-tight mb-1">
                  理の塔
                </h1>
                <p className="text-[#8e8e93] text-[11px] font-serif italic tracking-wider">
                  〜 知識と迅速なる決断が紡ぐ、クイズバトルRPG 〜
                </p>
              </div>

              <div className="space-y-3.5 mb-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-mono text-[#8e8e93] mb-1.5">求道者の名</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value || '理の求道者')}
                    className="w-full bg-[#1a1a1f] border border-[#2d2d35] hover:border-[#c9a050] focus:border-[#c9a050] focus:ring-1 focus:ring-[#c9a050] px-4 py-2.5 text-xs text-white outline-none transition-colors font-serif rounded-none"
                    placeholder="求道者の名を入力してください"
                    id="input-player-name"
                  />
                </div>

                {/* ハイスコア表示 */}
                <div className="p-3 bg-[#1a1a1f] border border-[#2d2d35] flex items-center justify-around text-center">
                  <div>
                    <div className="text-[9px] text-[#8e8e93] font-mono uppercase tracking-widest">最高到達階層</div>
                    <div className="text-xl font-serif text-[#c9a050]">{highFloor}<span className="text-xs italic ml-0.5">F</span></div>
                  </div>
                  <div className="w-px h-6 bg-[#2d2d35]" />
                  <div>
                    <div className="text-[9px] text-[#8e8e93] font-mono uppercase tracking-widest">最高記録</div>
                    <div className="text-xl font-mono font-bold text-white">{highScore.toLocaleString()}</div>
                  </div>
                </div>

                {/* コンパクトなルール解説 */}
                <div className="p-4 bg-[#0a0a0c] border border-[#2d2d35] text-[11px] text-[#8e8e93] space-y-1.5 leading-normal">
                  <p className="font-serif italic text-white flex items-center gap-1 border-b border-[#2d2d35] pb-1">
                    <Info className="w-3.5 h-3.5 text-[#c9a050]" /> 塔の戒律（ルール）
                  </p>
                  <ul className="list-decimal list-inside space-y-1 pl-0.5">
                    <li>1階層ごとに1体の敵。敵にはランダムな弱点ジャンルが設定。</li>
                    <li>
                      クイズに<span className="text-[#c9a050] font-bold">素早く正解</span>するほど高火力。弱点一致なら
                      <span className="text-[#c9a050] font-bold font-serif"> 2.0x </span>の特大ダメージ。
                    </li>
                    <li>誤答や時間切れは反撃を受けます。<span className="text-red-400 font-medium">誤答時は5秒後に自動で次へ進行。</span></li>
                    <li>
                      <span className="text-red-500 font-bold">10階層ごとに番人（ボス）</span>。制限時間が短く高体力。
                    </li>
                    <li>ゲーム全体制限時間が尽きるかHPが0になると探求終了。</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={startGame}
                className="w-full py-3 bg-[#1a1a1f] border border-[#c9a050] hover:bg-[#c9a050] hover:text-black text-[#c9a050] font-serif uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-black/50"
                id="btn-start-game"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                塔の門を開く
              </button>
            </motion.div>
          )}

          {/* ==================== 2. バトル（ゲームプレイ）画面 ==================== */}
          {gameState === 'battle' && currentEnemy && currentQuestion && (
            <motion.div
              key="battle-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3 flex flex-col h-full justify-between"
            >
              {/* 2.1 プレイヤー＆タイマーステータスバー */}
              <div className="bg-[#111116] border border-[#2d2d35] px-4 py-2 flex justify-between items-center gap-3 relative shadow-md shrink-0">
                <div className="flex flex-col">
                  <span className="text-[#8e8e93] text-[9px] uppercase tracking-widest font-mono">Current Floor</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl md:text-2xl font-serif italic text-[#c9a050]">
                      {currentEnemy.isBoss ? `第${floor}階層 (守護兵)` : `第${floor}階層`}
                    </span>
                  </div>
                </div>

                {/* HP & 総タイマー */}
                <div className="flex-1 max-w-xs md:max-w-sm flex flex-col gap-1.5">
                  {/* HP */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[9px] uppercase font-mono tracking-widest text-[#8e8e93] leading-none">
                      <span className="flex items-center gap-1"><Heart className="w-2.5 h-2.5 text-red-500 fill-red-500/20" /> HP</span>
                      <span>{hp} / {maxHp}</span>
                    </div>
                    <div className="h-1 bg-[#1a1a1f] border border-[#2d2d35] overflow-hidden">
                      <motion.div 
                        initial={{ width: `${(hp / maxHp) * 100}%` }}
                        animate={{ width: `${(hp / maxHp) * 100}%` }}
                        className="h-full bg-gradient-to-r from-[#8e2de2] to-[#4a00e0]" 
                      />
                    </div>
                  </div>

                  {/* 全体タイマー */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[9px] uppercase font-mono tracking-widest text-[#8e8e93] leading-none">
                      <span className="flex items-center gap-1"><Timer className="w-2.5 h-2.5 text-blue-400" /> TOTAL TIME</span>
                      <span className={gameTimeLeft < 30 ? 'text-red-500 font-bold animate-pulse' : 'text-white'}>{gameTimeLeft}s</span>
                    </div>
                    <div className="h-1 bg-[#1a1a1f] border border-[#2d2d35] overflow-hidden">
                      <motion.div 
                        initial={{ width: `${(gameTimeLeft / 120) * 100}%` }}
                        animate={{ width: `${(gameTimeLeft / 120) * 100}%` }}
                        className={`h-full ${gameTimeLeft < 30 ? 'bg-red-600 animate-pulse' : 'bg-[#c9a050]'}`} 
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[#8e8e93] text-[9px] uppercase tracking-widest font-mono">Gold</span>
                  <div className="text-sm font-mono font-bold text-[#c9a050] flex items-center gap-0.5">
                    <Coins className="w-3.5 h-3.5" />
                    <span>{gold}G</span>
                  </div>
                </div>
              </div>

              {/* 2.2 モンスター（敵）表示エリア: 高さを極力コンパクトに抑える */}
              <div className="bg-[#111116] border border-[#2d2d35] p-3 flex flex-col items-center justify-center relative min-h-[140px] md:min-h-[160px] shadow-lg shrink-0">
                
                {/* 階層アップ演出 */}
                <AnimatePresence>
                  {showFloorUpEffect && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.05, opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-[#0a0a0c]/95 z-20 pointer-events-none"
                    >
                      <div className="text-center space-y-1">
                        <div className="text-[10px] text-[#c9a050] font-mono tracking-widest">FLOOR UNLOCKED</div>
                        <div className="text-2xl font-serif text-white tracking-widest">
                          第 {floor} 階層 突入
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 被弾赤フラッシュ */}
                <AnimatePresence>
                  {isEnemyAttacking && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.2 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-red-600 z-10 pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* ダメージ数値演出 */}
                <AnimatePresence>
                  {damageDealt !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.6 }}
                      animate={{ opacity: 1, y: -30, scale: 1.3 }}
                      exit={{ opacity: 0, y: -60, scale: 1 }}
                      transition={{ duration: 0.7 }}
                      className="absolute top-1/4 text-red-500 font-serif italic text-3xl drop-shadow-[0_4px_8px_rgba(239,68,68,0.4)] z-20 pointer-events-none"
                    >
                      -{damageDealt}
                    </motion.div>
                  )}
                  {damageReceived !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.6 }}
                      animate={{ opacity: 1, y: 30, scale: 1.3 }}
                      exit={{ opacity: 0, y: 60, scale: 1 }}
                      transition={{ duration: 0.7 }}
                      className="absolute top-1/2 text-rose-500 font-serif italic text-3xl drop-shadow-[0_4px_8px_rgba(244,63,94,0.4)] z-20 pointer-events-none"
                    >
                      痛恨 -{damageReceived}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 敵ビジュアル（コンパクト化） */}
                <motion.div
                  animate={
                    isEnemyAttacking 
                      ? { x: [0, -8, 8, -8, 8, 0], scale: 1.05 } 
                      : isPlayerAttacking 
                      ? { scale: [1, 0.96, 1], y: [0, 3, -3, 0] }
                      : { y: [0, -4, 0] }
                  }
                  transition={{ 
                    y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
                    default: { duration: 0.4 } 
                  }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 bg-[#1a1a1f] border border-[#c9a050] rotate-45 flex items-center justify-center mb-3 shadow-2xl shadow-black relative">
                    <div className="-rotate-45 flex items-center justify-center">
                      <IconRenderer name={currentEnemy.iconName} className={`w-8 h-8 ${currentEnemy.color}`} />
                    </div>
                  </div>

                  <h3 className="text-base font-serif text-white flex items-center gap-1.5 leading-none">
                    {currentEnemy.isBoss && <Crown className="w-4 h-4 text-[#c9a050] animate-pulse" />}
                    {currentEnemy.name}
                  </h3>
                  
                  {/* 弱点表示 */}
                  <div className="flex items-center gap-1.5 mt-1.5 bg-[#1a1a1f] border border-[#2d2d35] px-2 py-0.5 text-[10px]">
                    <span className="text-[9px] text-[#8e8e93] uppercase font-mono tracking-wider">Weakness:</span>
                    <span className="text-[#c9a050] font-serif italic flex items-center gap-0.5">
                      <IconRenderer name={GENRE_MAP[currentEnemy.weakness].icon} className="w-3 h-3" />
                      {GENRE_MAP[currentEnemy.weakness].name}
                    </span>
                  </div>
                </motion.div>

                {/* 敵HPゲージ */}
                <div className="w-full max-w-xs mt-3.5 space-y-0.5 z-10">
                  <div className="flex justify-between text-[9px] uppercase font-mono tracking-widest text-[#8e8e93] px-1 leading-none">
                    <span>HP {currentEnemy.hp} / {currentEnemy.maxHp}</span>
                    <span>LV. {floor}</span>
                  </div>
                  <div className="h-1 bg-[#1a1a1f] border border-[#2d2d35] overflow-hidden">
                    <motion.div 
                      animate={{ width: `${(currentEnemy.hp / currentEnemy.maxHp) * 100}%` }}
                      className="h-full bg-gradient-to-r from-red-600 to-[#c9a050]" 
                    />
                  </div>
                </div>
              </div>

              {/* 2.3 クイズ＆問題回答エリア: 高さを抑えてPC一画面に収める */}
              <div className="bg-[#111116] border border-[#2d2d35] p-4 md:p-5 rounded-sm relative shadow-2xl space-y-3 flex-1 flex flex-col justify-between overflow-hidden min-h-0">
                
                {/* ジャンル表示デコレーション */}
                <div className="absolute -top-3 left-6 bg-[#0a0a0c] px-3 text-[#c9a050] text-[10px] font-mono tracking-widest uppercase shrink-0">
                  QUESTION_GENRE: {GENRE_MAP[currentQuestion.genre].name}
                </div>

                <div className="flex justify-between items-center border-b border-[#2d2d35] pb-2 shrink-0">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-serif ${GENRE_MAP[currentQuestion.genre].textClass}`}>
                    <IconRenderer name={GENRE_MAP[currentQuestion.genre].icon} className="w-3.5 h-3.5" />
                    {GENRE_MAP[currentQuestion.genre].name}
                    {currentQuestion.genre === currentEnemy.weakness && (
                      <span className="ml-1 px-1 bg-[#c9a050] text-black text-[8px] font-bold tracking-widest uppercase">WEAK!</span>
                    )}
                  </span>

                  {/* 一問制限時間 */}
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="text-[9px] text-[#8e8e93] uppercase tracking-wider">TIMER:</span>
                    <span className={`font-bold tracking-wider ${questionTimeLeft < 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                      {questionTimeLeft.toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* 一問時間ゲージ */}
                <div className="h-0.5 bg-[#1a1a1f] shrink-0">
                  <div 
                    style={{ width: `${(questionTimeLeft / maxQuestionTime) * 100}%` }}
                    className={`h-full transition-all duration-100 ease-linear ${
                      questionTimeLeft < 3 ? 'bg-red-500' : 'bg-[#c9a050]'
                    }`}
                  />
                </div>

                {/* 問題文: 縦スクロールが発生しないよう文字サイズと余白を最適化 */}
                <div className="flex-1 flex items-center justify-center overflow-y-auto px-2 min-h-0">
                  <p className="text-lg md:text-xl font-serif text-center leading-relaxed text-[#f0f0f0] my-auto">
                    「{currentQuestion.question}」
                  </p>
                </div>

                {/* 4択選択肢: グリッドを縮小 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 shrink-0">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = currentQuestion.answerIndex === idx;
                    
                    const optionLabels = ['A', 'B', 'C', 'D'];
                    let btnStyle = "bg-[#1a1a1f] border-[#2d2d35] text-slate-200 hover:border-[#c9a050]";
                    let labelStyle = "border-[#2d2d35] text-[#5a5a60]";

                    if (selectedOption !== null) {
                      if (isCorrect) {
                        btnStyle = "bg-emerald-500/10 border-emerald-500 text-emerald-400";
                        labelStyle = "border-emerald-400 text-emerald-400 bg-emerald-500/10";
                      } else if (isSelected) {
                        btnStyle = "bg-red-500/10 border-red-500 text-red-400";
                        labelStyle = "border-red-400 text-red-400 bg-red-500/10";
                      } else {
                        btnStyle = "bg-[#111116] border-[#1a1a1f] text-[#5a5a60] cursor-not-allowed";
                        labelStyle = "border-[#1a1a1f] text-[#5a5a60]";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSubmit(idx)}
                        disabled={selectedOption !== null || showFeedback || isPaused}
                        className={`group flex items-center p-3 rounded-none text-left border transition-all duration-150 cursor-pointer ${btnStyle}`}
                        id={`btn-option-${idx}`}
                      >
                        <span className={`w-6.5 h-6.5 flex items-center justify-center border font-mono text-xs mr-3 transition-colors shrink-0 ${labelStyle}`}>
                          {optionLabels[idx]}
                        </span>
                        <span className="text-xs md:text-sm font-serif line-clamp-2 leading-tight">{option}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 正解/不正解時の解説と強制自動進行カウントダウン表示 */}
                <AnimatePresence>
                  {showFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="border-t border-[#2d2d35] pt-2 mt-2 space-y-2 shrink-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 border shrink-0 ${
                          feedbackType === 'correct' 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                          {feedbackType === 'correct' ? <Smile className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                        </div>
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-2">
                            <div className={`text-xs font-serif italic ${feedbackType === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                              {feedbackType === 'correct' 
                                ? `正解。見事。${damageDealt !== null ? `[ダメージ: ${damageDealt}]` : ''}` 
                                : feedbackType === 'timeout' 
                                ? `思考切れ。敵の痛撃！` 
                                : `不正解。正しい理は「${currentQuestion.options[currentQuestion.answerIndex]}」です。`}
                            </div>

                            {/* 自動進行タイマーのバッジ */}
                            {autoProgressTimeLeft !== null && (
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 animate-pulse shrink-0 border ${
                                feedbackType === 'correct'
                                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                  : 'text-red-400 bg-red-500/10 border-red-500/20'
                              }`}>
                                {autoProgressTimeLeft}秒後に自動進行
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[#8e8e93] leading-relaxed font-serif italic line-clamp-2">
                            {currentQuestion.explanation}
                          </p>
                        </div>
                      </div>

                      {/* 次へ進むボタン */}
                      <div className="flex justify-end pt-1">
                        {currentEnemy.hp <= 0 ? (
                          <button
                            onClick={proceedToNextFloor}
                            className="py-1.5 px-4 bg-[#1a1a1f] border border-[#c9a050] hover:bg-[#c9a050] hover:text-black text-[#c9a050] text-[11px] font-serif uppercase tracking-widest flex items-center gap-1 animate-pulse cursor-pointer shadow-md shadow-black"
                            id="btn-next-floor"
                          >
                            <span>次の階層へ進む</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setNextQuestion(currentEnemy)}
                            className="py-1.5 px-4 bg-[#1a1a1f] border border-[#2d2d35] hover:border-[#c9a050] text-slate-200 text-[11px] font-serif uppercase tracking-widest flex items-center gap-1 cursor-pointer shadow-md"
                            id="btn-next-question"
                          >
                            <span>次の問題へ</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 2.4 バトルフッター: コンボ・倍率ステータス (1画面用に高さをスマートに) */}
              <div className="h-14 bg-[#111116] border border-[#2d2d35] flex items-center px-4 justify-between text-xs shrink-0">
                <div className="flex gap-6">
                  {/* スタミナコンボ */}
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[#5a5a60] uppercase tracking-wider mb-0.5 font-bold">Player Combo</span>
                    <div className="flex gap-1 items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-2.5 h-2.5 ${
                            combo > i ? 'bg-[#c9a050]' : 'bg-[#2d2d35]'
                          } transition-all duration-200`} 
                        />
                      ))}
                      {combo > 5 && (
                        <span className="text-[#c9a050] font-mono font-bold ml-1 text-[10px]">+{combo - 5}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] text-[#5a5a60] uppercase tracking-wider mb-0.5 font-bold">Combo Power</span>
                    <div className="text-sm font-mono text-[#c9a050] leading-none">x{(1 + combo * 0.05).toFixed(2)}</div>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-[#5a5a60] uppercase tracking-wider mb-0.5 font-bold">Attack Power</span>
                  <div className="text-xs font-serif italic text-white leading-none">
                    Base: <span className="text-[#c9a050] font-mono font-bold">{attackPower}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== 3. ショップ（休憩所）画面 ==================== */}
          {gameState === 'shop' && (
            <motion.div
              key="shop-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#111116] border border-[#2d2d35] p-5 rounded-none shadow-2xl space-y-4 max-w-xl mx-auto overflow-y-auto max-h-[85vh] scrollbar-thin"
            >
              <div className="text-center space-y-1 border-b border-[#2d2d35] pb-3 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0a0a0c] px-3 text-[#c9a050] text-[10px] font-mono tracking-widest uppercase">
                  SANCTUARY OF KNOWLEDGE
                </div>
                <h2 className="text-xl font-serif text-white mt-2">理の泉（休憩所）</h2>
                <p className="text-[11px] text-[#8e8e93] leading-relaxed font-serif italic">
                  「お疲れ様です、求道者よ。知識の雫（ゴールド）を使い、心身を整えていきましょう。」
                </p>
              </div>

              {/* プレイヤーのステータス情報 */}
              <div className="grid grid-cols-3 gap-2 bg-[#1a1a1f] p-3 border border-[#2d2d35] text-center">
                <div>
                  <div className="text-[9px] text-[#8e8e93] font-mono uppercase tracking-widest">次なる階層</div>
                  <div className="text-base font-serif text-white">{floor}F</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#8e8e93] font-mono uppercase tracking-widest">現在HP</div>
                  <div className="text-base font-mono font-bold text-red-400">{hp} / {maxHp}</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#8e8e93] font-mono uppercase tracking-widest">所持ゴールド</div>
                  <div className="text-base font-mono font-bold text-[#c9a050] flex items-center justify-center gap-1">
                    <Coins className="w-3.5 h-3.5" />
                    {gold}G
                  </div>
                </div>
              </div>

              {/* アイテムリスト */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-[#8e8e93]">秘宝・霊水調達</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* アイテム1: HP全回復ではなく 15HP回復に制限 */}
                  <div className="bg-[#1a1a1f] border border-[#2d2d35] p-3 flex items-center justify-between hover:border-[#c9a050] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 border border-[#2d2d35] text-red-400 shrink-0">
                        <Heart className="w-4 h-4 fill-red-500/10" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-serif text-white leading-tight">知識の聖水</div>
                        <div className="text-[9px] text-[#8e8e93] font-serif italic leading-none mt-0.5">HPを 15 回復する</div>
                      </div>
                    </div>
                    <button
                      disabled={gold < 20 || hp === maxHp}
                      onClick={() => buyItem('heal', 20)}
                      className="py-1 px-2.5 bg-[#111116] border border-[#2d2d35] hover:border-[#c9a050] text-[#c9a050] disabled:opacity-30 disabled:hover:border-[#2d2d35] disabled:hover:text-[#c9a050] text-xs font-mono font-bold transition-all cursor-pointer shrink-0"
                    >
                      20G
                    </button>
                  </div>

                  {/* アイテム2: 全体タイマー延長 */}
                  <div className="bg-[#1a1a1f] border border-[#2d2d35] p-3 flex items-center justify-between hover:border-[#c9a050] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 border border-[#2d2d35] text-blue-400 shrink-0">
                        <Timer className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-serif text-white leading-tight">時の砂時計</div>
                        <div className="text-[9px] text-[#8e8e93] font-serif italic leading-none mt-0.5">制限時間を30秒追加</div>
                      </div>
                    </div>
                    <button
                      disabled={gold < 45}
                      onClick={() => buyItem('time', 45)}
                      className="py-1 px-2.5 bg-[#111116] border border-[#2d2d35] hover:border-[#c9a050] text-[#c9a050] disabled:opacity-30 disabled:hover:border-[#2d2d35] disabled:hover:text-[#c9a050] text-xs font-mono font-bold transition-all cursor-pointer shrink-0"
                    >
                      45G
                    </button>
                  </div>

                  {/* アイテム3: 永続攻撃バフ */}
                  <div className="bg-[#1a1a1f] border border-[#2d2d35] p-3 flex items-center justify-between hover:border-[#c9a050] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 border border-[#2d2d35] text-[#c9a050] shrink-0">
                        <Swords className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-serif text-white leading-tight">知恵の宝剣</div>
                        <div className="text-[9px] text-[#8e8e93] font-serif italic leading-none mt-0.5">攻撃力が永続的に +6</div>
                      </div>
                    </div>
                    <button
                      disabled={gold < 60}
                      onClick={() => buyItem('attack', 60)}
                      className="py-1 px-2.5 bg-[#111116] border border-[#2d2d35] hover:border-[#c9a050] text-[#c9a050] disabled:opacity-30 disabled:hover:border-[#2d2d35] disabled:hover:text-[#c9a050] text-xs font-mono font-bold transition-all cursor-pointer shrink-0"
                    >
                      60G
                    </button>
                  </div>

                  {/* アイテム4: 最大HPアップ */}
                  <div className="bg-[#1a1a1f] border border-[#2d2d35] p-3 flex items-center justify-between hover:border-[#c9a050] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 border border-[#2d2d35] text-emerald-400 shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-serif text-white leading-tight">理の法衣</div>
                        <div className="text-[9px] text-[#8e8e93] font-serif italic leading-none mt-0.5">最大HP+25（HPも+25）</div>
                      </div>
                    </div>
                    <button
                      disabled={gold < 75}
                      onClick={() => buyItem('max_hp', 75)}
                      className="py-1 px-2.5 bg-[#111116] border border-[#2d2d35] hover:border-[#c9a050] text-[#c9a050] disabled:opacity-30 disabled:hover:border-[#2d2d35] disabled:hover:text-[#c9a050] text-xs font-mono font-bold transition-all cursor-pointer shrink-0"
                    >
                      75G
                    </button>
                  </div>

                  {/* アイテム5: 弱点分析の魔眼 */}
                  <div className="bg-[#1a1a1f] border border-[#2d2d35] p-3 flex items-center justify-between hover:border-[#c9a050] transition-colors sm:col-span-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 border border-[#2d2d35] text-purple-400 shrink-0">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-serif text-white leading-tight">弱点分析の魔眼</div>
                        <div className="text-[9px] text-[#8e8e93] font-serif italic leading-none mt-0.5">
                          次の階層の敵の初期HPを35%削り、プレイヤーの最初の攻撃威力を1.5倍にする（一度限り）
                        </div>
                      </div>
                    </div>
                    <button
                      disabled={gold < 50 || hasEyeOfWeakness}
                      onClick={() => buyItem('eye', 50)}
                      className="py-1 px-2.5 bg-[#111116] border border-[#2d2d35] hover:border-[#c9a050] text-[#c9a050] disabled:opacity-30 disabled:hover:border-[#2d2d35] disabled:hover:text-[#c9a050] text-xs font-mono font-bold transition-all cursor-pointer shrink-0"
                    >
                      {hasEyeOfWeakness ? '発動中' : '50G'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 次へ進むボタン */}
              <button
                onClick={() => initNewFloor(floor)}
                className="w-full py-3 bg-[#1a1a1f] border border-[#c9a050] hover:bg-[#c9a050] hover:text-black text-[#c9a050] font-serif uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                id="btn-leave-shop"
              >
                <span>英気を養い、塔の探索を再開する</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ==================== 4. 敗北（ゲームオーバー）画面 ==================== */}
          {gameState === 'defeat' && (
            <motion.div
              key="defeat-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111116] border border-red-950 p-6 md:p-8 rounded-none text-center space-y-5 max-w-md mx-auto shadow-2xl"
            >
              <div className="flex justify-center">
                <div className="p-4 border border-red-500 rounded-none bg-red-950/20 text-red-500 animate-pulse">
                  <Skull className="w-12 h-12" />
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-serif text-red-500 tracking-wider">探求の途絶え</h2>
                <p className="text-xs text-[#8e8e93] font-serif italic leading-relaxed">
                  「理の探求はここで終わりました。しかし、あなたの培った知識は無駄ではありません。」
                </p>
              </div>

              {/* 今回の結果 */}
              <div className="bg-[#0a0a0c] border border-[#2d2d35] p-4 space-y-2 font-mono">
                <div className="flex justify-between text-xs text-[#8e8e93]">
                  <span>求道者:</span>
                  <span className="text-white font-serif">{playerName}</span>
                </div>
                <div className="flex justify-between text-xs text-[#8e8e93]">
                  <span>到達階層:</span>
                  <span className="text-[#c9a050] font-serif italic text-base">第 {floor} 階層</span>
                </div>
                <div className="flex justify-between text-xs text-[#8e8e93]">
                  <span>最終スコア:</span>
                  <span className="text-white font-bold">{score.toLocaleString()} pts</span>
                </div>
                <div className="flex justify-between text-xs text-[#8e8e93]">
                  <span>最大コンボ:</span>
                  <span className="text-amber-500 font-bold">{maxCombo} 連鎖</span>
                </div>
              </div>

              <button
                onClick={startGame}
                className="w-full py-3 bg-[#1a1a1f] border border-[#c9a050] hover:bg-[#c9a050] hover:text-black text-[#c9a050] font-serif uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                id="btn-retry"
              >
                <RotateCcw className="w-4 h-4" />
                もう一度塔に挑む
              </button>

              <button
                onClick={quitToTitle}
                className="w-full py-2 bg-[#111116] border border-[#2d2d35] hover:border-red-500 text-[#8e8e93] hover:text-red-400 font-mono uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                タイトルに戻る
              </button>
            </motion.div>
          )}

          {/* ==================== 5. 勝利（完全制覇）画面 ==================== */}
          {gameState === 'victory' && (
            <motion.div
              key="victory-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111116] border border-[#c9a050] p-6 md:p-8 rounded-none text-center space-y-6 max-w-lg mx-auto shadow-2xl"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-[#1a1a1f] border-2 border-[#c9a050] rotate-45 flex items-center justify-center shadow-2xl shadow-[#c9a050]/20 animate-bounce">
                  <Crown className="w-8 h-8 text-[#c9a050] -rotate-45" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-3xl font-serif text-[#c9a050] tracking-widest leading-none">理の極みへ</h2>
                <div className="text-[10px] font-mono text-[#8e8e93] uppercase tracking-widest">TOWER CONQUERED</div>
                <p className="text-xs text-[#8e8e93] font-serif italic leading-relaxed">
                  「素晴らしい！あなたは理の塔の頂点に到達し、世界の全ての真理を解き明かしました。大賢者の称号を授けましょう。」
                </p>
              </div>

              {/* 最終結果 */}
              <div className="bg-[#0a0a0c] border border-[#2d2d35] p-5 space-y-2.5 font-mono">
                <div className="flex justify-between text-xs text-[#8e8e93]">
                  <span>伝説の賢者:</span>
                  <span className="text-white font-serif font-bold">{playerName}</span>
                </div>
                <div className="flex justify-between text-xs text-[#8e8e93]">
                  <span>到達階層:</span>
                  <span className="text-[#c9a050] font-serif italic text-lg">第 50 階層 (完全制覇)</span>
                </div>
                <div className="flex justify-between text-xs text-[#8e8e93]">
                  <span>最終スコア:</span>
                  <span className="text-white font-bold text-base">{score.toLocaleString()} pts</span>
                </div>
                <div className="flex justify-between text-xs text-[#8e8e93]">
                  <span>最大連続コンボ:</span>
                  <span className="text-amber-500 font-bold">{maxCombo} COMBO</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={startGame}
                  className="w-full py-3 bg-[#1a1a1f] border border-[#c9a050] hover:bg-[#c9a050] hover:text-black text-[#c9a050] font-serif uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  id="btn-retry-victory"
                >
                  <RotateCcw className="w-4 h-4" />
                  新たなる探求へ（リトライ）
                </button>

                <button
                  onClick={quitToTitle}
                  className="w-full py-2 bg-[#111116] border border-[#2d2d35] hover:border-red-500 text-[#8e8e93] hover:text-red-400 font-mono uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  タイトルに戻る
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ==================== 6. ポーズ画面（一時停止モーダル） ==================== */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0a0a0c]/90 flex items-center justify-center z-50 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="bg-[#111116] border border-[#c9a050] p-6 max-w-sm w-full mx-4 text-center space-y-5"
            >
              <div className="space-y-1">
                <h3 className="text-2xl font-serif text-[#c9a050] tracking-wider uppercase">PAUSED</h3>
                <p className="text-xs text-[#8e8e93] font-serif italic">思考を整え、再び歩みを進めましょう</p>
              </div>

              {/* 現在の状況を軽く表示 */}
              <div className="bg-[#0a0a0c] border border-[#2d2d35] p-3 text-left space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-[#8e8e93]">
                  <span>探索階層:</span>
                  <span className="text-white">第 {floor} 階層</span>
                </div>
                <div className="flex justify-between text-[#8e8e93]">
                  <span>求道者HP:</span>
                  <span className="text-red-400">{hp} / {maxHp}</span>
                </div>
                <div className="flex justify-between text-[#8e8e93]">
                  <span>総制限時間:</span>
                  <span className="text-white">{gameTimeLeft}秒</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={togglePause}
                  className="w-full py-3 bg-[#c9a050] text-black hover:bg-[#c9a050]/90 font-serif uppercase tracking-widest text-xs font-bold transition-all cursor-pointer shadow-md"
                  id="btn-pause-resume"
                >
                  探索を再開する
                </button>

                <button
                  onClick={quitToTitle}
                  className="w-full py-2 bg-[#1a1a1f] border border-[#2d2d35] hover:border-red-500 hover:text-red-400 text-[#8e8e93] font-mono uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  id="btn-pause-quit"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  探索を諦め、タイトルに戻る
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
