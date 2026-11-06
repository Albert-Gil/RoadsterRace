import { CHALLENGES, findChallenge, type ChallengeId, type ChallengeProgress } from '../../core/challenges';

export function challengesPanel(progress: ChallengeProgress, persistent: boolean) {
  return `<div class="collection-heading"><div><span class="eyebrow">THREE WAYS TO PROVE IT</span><h2>Challenges.</h2><p>${progress.completed.length} / ${CHALLENGES.length} complete</p></div><div class="collection-navigation"><button class="secondary-button" data-action="challenges-back">Back</button><button class="secondary-button" data-action="home">Home</button></div></div>
    ${persistent ? '' : '<p class="save-status" role="status">Completions stay available for this session. Browser storage is unavailable.</p>'}
    <div class="challenge-grid">${CHALLENGES.map(c => { const done = progress.completed.includes(c.id); return `<article class="challenge-card${done ? ' completed' : ''}" data-challenge-card="${c.id}"><div class="challenge-top"><span class="eyebrow">${c.number} / ${c.venue}</span><span class="challenge-stamp">${done ? '✓ COMPLETE' : 'OPEN'}</span></div><h3>${c.name}</h3><p>${c.objective}</p><span class="challenge-format">${c.format}</span><button class="primary-button" data-action="challenge-start" data-challenge="${c.id}">${done ? 'Play again' : 'Start challenge'} <span aria-hidden="true">↗</span></button></article>`; }).join('')}</div>
    <p class="collection-note">Shared on this installation. Standard cars and rules. Your usual race settings are restored when you leave.</p>`;
}
export function challengeResults(id: ChallengeId, completed: boolean, vessels: number, ineligible: boolean, cupFinished: boolean) {
  const challenge = findChallenge(id)!;
  const status = ineligible ? 'Practice run · completion not recorded' : completed ? 'Challenge complete' : id === 'fleet-explorer' ? `${vessels} / 2 support-vessel sequences completed` : id === 'alpine-precision' ? 'Lap completed with contact or recovery' : cupFinished ? 'Cup finished · first place required' : 'Challenge continues next round';
  return `<section class="challenge-result" aria-label="Challenge result"><span class="eyebrow">${challenge.name}</span><p role="status">${status}</p></section>`;
}
