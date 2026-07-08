import { QuizQuestion } from './quizData';

export interface EnemyTemplate {
  name: string;
  iconName: string; // Lucideアイコンの名前
  color: string; // Tailwindカラー (e.g. 'text-red-500')
  glowColor: string; // ネオンエフェクト用の色 (e.g. 'shadow-red-500/50')
  baseHp: number;
  description: string;
  imagePath: string; // モンスター画像パス
}

export interface BossTemplate extends EnemyTemplate {
  floor: number;
  questionTimeLimit: number; // ボス専用の1問あたり制限時間（秒）
}

export interface ActiveEnemy {
  name: string;
  iconName: string;
  color: string;
  glowColor: string;
  hp: number;
  maxHp: number;
  weakness: QuizQuestion['genre'];
  description: string;
  isBoss: boolean;
  imagePath: string; // モンスター画像パス
}

// 雑魚敵のテンプレート
export const NORMAL_ENEMIES: EnemyTemplate[] = [
  {
    name: 'プチスライム',
    iconName: 'Sparkles',
    color: 'text-blue-400',
    glowColor: 'shadow-blue-500/40',
    baseHp: 30,
    description: '塔の入り口に群れる、知能の低いプルプルした魔物。',
    imagePath: '/enemy_image/Enemy_1.png',
  },
  {
    name: '知恵を拒むスケルトン',
    iconName: 'Skull',
    color: 'text-gray-400',
    glowColor: 'shadow-gray-500/40',
    baseHp: 40,
    description: '学ぶことを諦め、骨だけになって彷徨う戦士。',
    imagePath: '/enemy_image/Enemy_2.png',
  },
  {
    name: 'カースド・ブック',
    iconName: 'Book',
    color: 'text-purple-400',
    glowColor: 'shadow-purple-500/40',
    baseHp: 35,
    description: '解読不可能な呪文が刻まれた、自我を持つ魔導書。',
    imagePath: '/enemy_image/Enemy_3.png',
  },
  {
    name: '惑わしのゴースト',
    iconName: 'Ghost',
    color: 'text-teal-400',
    glowColor: 'shadow-teal-500/40',
    baseHp: 45,
    description: 'クイズの回答者を惑わせる、いたずら好きな幽霊。',
    imagePath: '/enemy_image/Enemy_4.png',
  },
  {
    name: 'イビル・アイ',
    iconName: 'Eye',
    color: 'text-red-400',
    glowColor: 'shadow-red-500/40',
    baseHp: 50,
    description: '世界の全てを監視し、知識を吸い取る一つ目の怪物。',
    imagePath: '/enemy_image/Enemy_5.png',
  },
  {
    name: 'フレイム・スピリット',
    iconName: 'Flame',
    color: 'text-orange-400',
    glowColor: 'shadow-orange-500/40',
    baseHp: 45,
    description: '感情の赴くままに全てを焼き尽くす、焦燥の火の玉。',
    imagePath: '/enemy_image/Enemy_6.png',
  },
  {
    name: 'アイス・クラウン',
    iconName: 'Snowflake',
    color: 'text-cyan-300',
    glowColor: 'shadow-cyan-500/40',
    baseHp: 55,
    description: '思考を凍りつかせ、判断力を奪う絶対零度の妖精。',
    imagePath: '/enemy_image/Enemy_7.png',
  },
  {
    name: 'シャドウ・サーペント',
    iconName: 'ShieldAlert',
    color: 'text-emerald-400',
    glowColor: 'shadow-emerald-500/40',
    baseHp: 60,
    description: '影に潜み、回答者の心の隙を狙う狡猾な大蛇。',
    imagePath: '/enemy_image/Enemy_8.png',
  },
  {
    name: 'ミミック・チェスト',
    iconName: 'Smile',
    color: 'text-yellow-600',
    glowColor: 'shadow-yellow-500/40',
    baseHp: 50,
    description: '宝箱に化けた魔物。クイズに答えないと開かない。',
    imagePath: '/enemy_image/Enemy_10.png',
  },
  {
    name: 'ダーク・パペッティア',
    iconName: 'UserX',
    color: 'text-indigo-400',
    glowColor: 'shadow-indigo-500/40',
    baseHp: 65,
    description: '他人の思考を糸で操り、間違った選択肢へと導く人形遣い。',
    imagePath: '/enemy_image/Enemy_9.png',
  },
];

// ボスのテンプレート (10階層ごと)
export const BOSS_ENEMIES: Record<number, BossTemplate> = {
  10: {
    floor: 10,
    name: '第10階層の番人：ゴーレム・オブ・ロジック',
    iconName: 'Shield',
    color: 'text-amber-600',
    glowColor: 'shadow-amber-500/60',
    baseHp: 150,
    questionTimeLimit: 7, // 制限時間7秒
    description: '論理の石で組み上げられた巨大な守護兵。生半可な知識は通用しない。',
    imagePath: '/enemy_image/Boss_1.png',
  },
  20: {
    floor: 20,
    name: '第20階層の番人：アカシック・キマイラ',
    iconName: 'Dribbble', // 獣・合成獣の代用
    color: 'text-rose-500',
    glowColor: 'shadow-rose-500/60',
    baseHp: 250,
    questionTimeLimit: 6, // 制限時間6秒
    description: 'あらゆる情報の残骸が融合した、荒れ狂う混沌の合成獣。',
    imagePath: '/enemy_image/Boss_2.png',
  },
  30: {
    floor: 30,
    name: '第30階層の番人：大賢者アルケミスト',
    iconName: 'Wand2',
    color: 'text-violet-500',
    glowColor: 'shadow-violet-500/60',
    baseHp: 380,
    questionTimeLimit: 5.5, // 制限時間5.5秒
    description: '数万冊の魔導書を修め、真理を追い求めて狂気に堕ちた偉大なる魔術師。',
    imagePath: '/enemy_image/Boss_3.png',
  },
  40: {
    floor: 40,
    name: '第40階層の番人：インフィニティ・ドラゴン',
    iconName: 'Crown',
    color: 'text-red-500',
    glowColor: 'shadow-red-500/60',
    baseHp: 500,
    questionTimeLimit: 5, // 制限時間5秒
    description: '理の塔に古くから棲まう、無限の叡智と破壊の炎を持つ伝説の古竜。',
    imagePath: '/enemy_image/Boss_4.png',
  },
  50: {
    floor: 50,
    name: '塔の頂点：理（ことわり）の魔王・クロノス',
    iconName: 'Skull',
    color: 'text-fuchsia-500',
    glowColor: 'shadow-fuchsia-500/75 animate-pulse',
    baseHp: 750,
    questionTimeLimit: 4, // 制限時間4秒
    description: '時間と空間、そして全宇宙の雑学を支配する、理の塔の主にして究極の絶対神。',
    imagePath: '/enemy_image/Boss_5.png',
  },
};

// 敵を生成する関数
export function generateEnemy(floor: number): ActiveEnemy {
  const isBoss = floor % 10 === 0;
  const genres: QuizQuestion['genre'][] = ['science', 'history', 'geography', 'art', 'general', 'entertainment'];
  
  // ランダムに弱点ジャンルを決定
  const weakness = genres[Math.floor(Math.random() * genres.length)];

  if (isBoss) {
    // 10階層ごとのボスを取得。50階以降は50階のボステンプレートをスケールアップして使用
    const bossLevel = floor <= 50 ? floor : 50;
    const template = BOSS_ENEMIES[bossLevel] || BOSS_ENEMIES[50];
    
    // 50階以降はHPをさらに増強
    const scaleFactor = 1 + (floor - bossLevel) * 0.15;
    const maxHp = Math.floor(template.baseHp * scaleFactor);

    return {
      name: floor > 50 ? `${template.name} (Lv.${floor})` : template.name,
      iconName: template.iconName,
      color: template.color,
      glowColor: template.glowColor,
      hp: maxHp,
      maxHp: maxHp,
      weakness,
      description: template.description,
      isBoss: true,
      imagePath: template.imagePath,
    };
  } else {
    // 雑魚敵をランダムに選択
    const template = NORMAL_ENEMIES[Math.floor(Math.random() * NORMAL_ENEMIES.length)];
    
    // 階層に応じてHPをスケールアップ (1階: 100%, 2階: 110%, 15階: 250% みたいな感じ)
    const hpMultiplier = 1 + (floor - 1) * 0.15;
    const maxHp = Math.floor(template.baseHp * hpMultiplier);

    return {
      name: `${template.name} (階層 ${floor})`,
      iconName: template.iconName,
      color: template.color,
      glowColor: template.glowColor,
      hp: maxHp,
      maxHp: maxHp,
      weakness,
      description: template.description,
      isBoss: false,
      imagePath: template.imagePath,
    };
  }
}
