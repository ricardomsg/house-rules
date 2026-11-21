'use client';

import { useState } from 'react';
import { useLanguage } from '@/app/LanguageProvider';

type Props = { slug: string; onStart: (settings: Record<string, number>) => void; disabled: boolean; label: string; host: boolean };
export default function GameSetup({ slug, onStart, disabled, label, host }: Props) {
  const { t } = useLanguage();
  const [defenseSeconds, setDefense] = useState(60);
  const [challenge, setChallenge] = useState(false);
  const [challengeSeconds, setChallengeSeconds] = useState(60);
  const [turnSeconds, setTurn] = useState(slug === 'categories' ? 90 : slug === 'fishbowl' ? 45 : slug === 'who-am-i' ? 120 : slug === 'head-fake' ? 20 : 60);
  const times = [15, 20, 30, 45, 60, 90, 120, 180, 300];
  const select = (value: number, change: (value: number) => void, title: string) => <label>{t(title)}<select value={value} onChange={event => change(Number(event.target.value))}>{times.map(time => <option key={time} value={time}>{t('{seconds} seconds', { seconds: time })}</option>)}</select></label>;
  return <>
    {host && ['devils-advocate', 'charades', 'fishbowl', 'categories', 'head-fake', 'who-am-i'].includes(slug) && <details className="game-time-settings"><summary>{t('Game times')}</summary>
      {slug === 'devils-advocate' ? <>
        {select(defenseSeconds, setDefense, 'Opening defense')}
        <label><input type="checkbox" checked={challenge} onChange={event => setChallenge(event.target.checked)} />{t('Add questions and rebuttals')}</label>
        {challenge && select(challengeSeconds, setChallengeSeconds, 'Questions and rebuttals')}
        <p>{t('The room challenges the argument out loud; the speaker answers. Ratings open afterwards.')}</p>
      </> : select(turnSeconds, setTurn, 'Turn duration')}
    </details>}
    <button type="button" disabled={disabled} onClick={() => onStart({ defenseSeconds, challengeSeconds: challenge ? challengeSeconds : 0, turnSeconds })}>{label}</button>
  </>;
}
