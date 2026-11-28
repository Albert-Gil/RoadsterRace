import { pressTracker } from '../input/press-guard';
import { SEAT_STATUS_TEXT, MAX_SEATS, settingsLine, type DuelScreen, type SeatCard } from './screen';
import { COACH_CARDS, type CoachId } from './coach';

/**
 * The Private Duels paddock: one full-screen, circuit-led overlay, mounted once (plan step 4.2).
 * It renders a DuelScreen (src/duels/screen.ts) in place: player cards are kept by seat id and only their
 * changed text is touched, an open circuit picker and the focused control survive updates, and a press
 * that began on the previous screen cannot act on a new one (the press guard advances only when the
 * interactive screen changes). The network client never builds DOM; it calls these methods.
 */
export interface PaddockActions {
  start(): void;
  vote(choice: 'same' | 'redraw'): void;
  settings(circuit: string, laps: number): void;
  remove(id: string): void;
  resume(): void;
  home(): void;
}
export interface RoomExtras {
  /** Six-character room code (lobby). */
  code?: string;
  /** Invite link (lobby). */
  link?: string;
  /** Circuits this server offers (host settings). */
  venues: readonly { id: string; name: string }[];
  /** Drivers the host may remove after the drawing grace period. */
  removable: readonly { id: string; name: string }[];
  /** A guided-first-race card to show on this screen, and what dismissing it does. */
  coach?: { id: CoachId; dismiss(): void };
}
export interface EntryForm {
  name: HTMLInputElement;
  paint: HTMLSelectElement;
  circuit: HTMLSelectElement;
  laps: HTMLSelectElement;
  code: HTMLInputElement;
  create: HTMLButtonElement;
  join: HTMLButtonElement;
  notice: HTMLElement;
  /** Adds a primary action right below the notice (Rejoin race). */
  addAction(label: string, action: () => void): HTMLButtonElement;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(label: string, action: () => void, primary = false) {
  const b = el('button', label, primary ? 'primary-button' : 'secondary-button'); b.type = 'button'; b.onclick = action;
  return b;
}
const setText = (node: Element, text: string) => { if (node.textContent !== text) node.textContent = text; };
/** Opacity fade of the paddock (ms); matches --motion-ms in the stylesheet's default. */
export const FADE_MS = 180;
const lapOptions = (select: HTMLSelectElement) => { for (let i = 1; i <= 6; i++) select.add(new Option(`${i} lap${i === 1 ? '' : 's'}`, String(i))); };

export class Paddock {
  readonly dialog = el('dialog', '', 'duel-dialog paddock');
  private art = el('img');
  private panel = el('section', '', 'paddock-panel');
  private head = el('header', '', 'paddock-head');
  private title = el('h2');
  private line = el('p', '', 'paddock-line');
  private code = el('strong', '', 'paddock-code');
  private body = el('div', '', 'paddock-body');
  private seats = el('ul', '', 'paddock-seats');
  private coach = el('aside', '', 'paddock-coach');
  private coachId = '';
  private settingsBox = el('div', '', 'paddock-settings');
  private circuitSelect = el('select');
  private lapsSelect = el('select');
  private settingsNote = el('p', 'Changing the circuit means everyone draws new lines.', 'paddock-note');
  private actions = el('div', '', 'paddock-actions');
  readonly status = el('p', '', 'paddock-status');
  private cards = new Map<string, HTMLLIElement>();
  private screenKey = '';
  private actionKey = '';
  private venueKey = '';
  private announced = '';

  constructor(private readonly paintColor: (paint: string) => string, private readonly artUrl: (circuit: string) => string | undefined, private readonly handlers: PaddockActions) {
    const art = el('div', '', 'paddock-art'); art.setAttribute('aria-hidden', 'true'); this.art.alt = ''; this.art.decoding = 'async';
    this.art.addEventListener('load', () => art.classList.add('loaded')); this.art.addEventListener('error', () => art.classList.remove('loaded'));
    art.append(this.art);
    this.status.setAttribute('role', 'status');
    this.seats.setAttribute('aria-label', 'Drivers');
    this.circuitSelect.setAttribute('aria-label', 'Circuit'); this.lapsSelect.setAttribute('aria-label', 'Race distance'); lapOptions(this.lapsSelect);
    const send = () => this.handlers.settings(this.circuitSelect.value, Number(this.lapsSelect.value));
    this.circuitSelect.onchange = send; this.lapsSelect.onchange = send;
    this.settingsBox.append(this.circuitSelect, this.lapsSelect, this.settingsNote);
    this.head.append(el('span', 'Private Duel', 'paddock-kicker'), this.title, this.line, this.code);
    // The host settings are attached only while shown, so the entry form's own Circuit picker is the only one.
    this.coach.setAttribute('role', 'note'); this.coach.hidden = true;
    this.panel.append(this.head, this.coach, this.body, this.seats, this.actions, this.status);
    this.dialog.append(art, this.panel);
    // Escape never drops the player out of a room; the race menu closes with it.
    this.dialog.addEventListener('cancel', e => { e.preventDefault(); if (this.screenKey === 'menu') this.handlers.resume(); });
    document.body.append(this.dialog);
  }

  private closing?: number;
  get open() { return this.dialog.open && this.closing === undefined; }
  /** The paddock hides the whole scene (open, full screen and not fading out): the scene may skip rendering. */
  get covering() { return this.open && this.dialog.dataset.compact !== 'true'; }
  get shownTitle() { return this.title.textContent ?? ''; }
  remove() { this.cancelClose(); this.dialog.remove(); }
  /** Fades out over the interface motion time (none with reduced motion); the scene renders again at once. */
  close() {
    this.screenKey = '';
    if (!this.dialog.open || this.closing !== undefined) return;
    const ms = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : FADE_MS;
    this.dialog.dataset.state = 'closing';
    this.closing = window.setTimeout(() => { this.closing = undefined; delete this.dialog.dataset.state; this.dialog.close(); }, ms);
  }
  private cancelClose() { if (this.closing !== undefined) { clearTimeout(this.closing); this.closing = undefined; delete this.dialog.dataset.state; } }

  /** A new interactive screen: presses that began on the previous one cannot act here. */
  private enter(key: string, title: string) {
    if (key !== this.screenKey || !this.dialog.open) { pressTracker.nextScreen(); this.screenKey = key; this.status.textContent = ''; this.announced = ''; }
    setText(this.title, title);
    this.cancelClose();
    if (!this.dialog.open) {
      this.dialog.dataset.state = 'opening'; this.dialog.showModal();
      requestAnimationFrame(() => { if (this.dialog.dataset.state === 'opening') delete this.dialog.dataset.state; });
    }
  }
  private showArt(circuit?: string) {
    const url = circuit ? this.artUrl(circuit) : undefined;
    this.dialog.dataset.circuit = circuit ?? '';
    if (!url) { this.art.removeAttribute('src'); this.art.parentElement!.classList.remove('loaded'); return; }
    if (this.art.getAttribute('src') !== url) { this.art.parentElement!.classList.remove('loaded'); this.art.src = url; }
  }
  private layout(kind: string) {
    this.dialog.dataset.screen = kind; this.panel.removeAttribute('data-wide');
    // The race menu and a dropped connection during a race are small notices over the race (it keeps running).
    this.dialog.dataset.compact = String(kind === 'menu' || kind === 'reconnecting' && this.raceBehind);
    this.body.replaceChildren(); this.body.hidden = true;
  }

  /** Create/join form. Returns its controls; the client wires probing, connecting and updating. */
  entry(driver: { name: string; paint: string }, finishes: readonly { id: string; name: string }[], venues: readonly { id: string; name: string }[], home: () => void, invited = false): EntryForm {
    this.enter('entry', 'Private Duel'); this.layout('entry'); this.showArt(venues[0]?.id);
    this.line.textContent = 'Race friends on your own devices. Lines stay private until the start.'; this.code.hidden = true;
    this.seats.hidden = true; this.renderCoach(undefined); this.settingsBox.remove(); this.cards.clear(); this.seats.replaceChildren(); this.actionKey = '';
    const nameLabel = el('label', 'Driver name'), name = el('input'); name.value = driver.name; name.maxLength = 18; name.setAttribute('autocomplete', 'nickname'); nameLabel.append(name);
    const paintLabel = el('label', 'Car color'), paint = el('select'); paint.setAttribute('aria-label', 'Car color');
    for (const finish of finishes) paint.add(new Option(finish.name, finish.id));
    paint.value = driver.paint; paintLabel.append(paint);
    const circuit = el('select'); circuit.setAttribute('aria-label', 'Circuit');
    for (const v of venues) circuit.add(new Option(v.name, v.id));
    circuit.addEventListener('change', () => this.showArt(circuit.value));
    const laps = el('select'); laps.setAttribute('aria-label', 'Race distance'); lapOptions(laps);
    const notice = el('div', '', 'duel-updating'); notice.setAttribute('role', 'status'); notice.hidden = true;
    const code = el('input'); code.placeholder = 'Room code, e.g. TIGER7'; code.setAttribute('aria-label', 'Room code'); code.maxLength = 8; code.autocapitalize = 'characters'; code.autocomplete = 'off';
    // With an invite the code is filled in and joining is the main action.
    const create = button('Create room', () => {}, !invited), join = button('Join room', () => {}, invited);
    const createGroup = el('div', '', 'paddock-group'), joinGroup = el('div', '', 'paddock-group');
    createGroup.append(el('h3', 'New room'), circuit, laps, create);
    joinGroup.append(el('h3', invited ? 'Join the invite' : 'Have a code?'), code, join);
    const driverGroup = el('div', '', 'paddock-group'); driverGroup.append(nameLabel, paintLabel);
    this.body.hidden = false; this.body.append(notice, driverGroup, ...(invited ? [joinGroup, createGroup] : [createGroup, joinGroup]));
    this.panel.toggleAttribute('data-wide', true);
    this.actions.replaceChildren(button('Home', home));
    return { name, paint, circuit, laps, code, create, join, notice, addAction: (label, action) => { const b = button(label, action, true); notice.after(b); return b; } };
  }

  /** The circuit list of an open entry form (venues offered by the server). */
  static fillVenues(select: HTMLSelectElement, venues: readonly { id: string; name: string }[]) {
    const keep = select.value;
    select.replaceChildren(...venues.map(v => new Option(v.name, v.id)));
    if (venues.some(v => v.id === keep)) select.value = keep;
  }

  /** The entry form's "Online play is updating" notice, with its action (Try again or Reload game). */
  static updating(notice: HTMLElement, detail: string, action?: { label: string; run: (b: HTMLButtonElement) => void }) {
    notice.hidden = false;
    const parts: Node[] = [el('strong', 'Online play is updating'), el('p', detail)];
    if (action) { const b = button(action.label, () => action.run(b), true); parts.push(b); }
    notice.replaceChildren(...parts);
  }
  /** A small action after a status message (Try again after a connection error). */
  static statusAction(status: HTMLElement, label: string, action: () => void) { status.append(' ', button(label, action)); }

  /** A short message screen (Room closed, Check your line) with its actions. */
  message(key: string, title: string, text: string | undefined, actions: readonly { label: string; action: () => void; primary?: boolean }[]) {
    this.enter(key, title); this.layout('message');
    this.line.textContent = ''; this.code.hidden = true; this.seats.hidden = true; this.renderCoach(undefined); this.settingsBox.remove();
    if (text) { this.body.hidden = false; this.body.append(el('p', text)); }
    this.actionKey = ''; this.actions.replaceChildren(...actions.map(a => button(a.label, a.action, a.primary)));
  }

  /** Set by the client: a race is on screen behind the paddock (reconnecting stays compact then). */
  raceBehind = false;
  /** Room, waiting, results, race menu, loading and reconnecting screens. */
  room(screen: DuelScreen, extras: RoomExtras) {
    this.enter(screen.kind, screen.title); this.layout(screen.kind); this.showArt(screen.circuit);
    setText(this.line, settingsLine(screen));
    this.code.hidden = screen.kind !== 'room' || !extras.code; if (extras.code) setText(this.code, extras.code);
    if (extras.code) this.code.setAttribute('aria-label', `Room code ${extras.code}`);
    if (screen.kind === 'menu') { this.body.hidden = false; this.body.append(el('p', 'The race continues.')); }
    if (screen.kind === 'reconnecting') { this.body.hidden = false; this.body.append(el('p', 'Your car is following its line.')); }
    if (screen.kind === 'loading') { this.body.hidden = false; this.body.append(el('p', 'Your circuit is loading. You join the race where it is.')); }
    this.renderCoach(extras.coach);
    this.renderCards(screen);
    this.renderSettings(screen, extras);
    this.renderActions(screen, extras);
    this.announce(screen);
  }

  private renderCoach(coach: RoomExtras['coach']) {
    const id = coach?.id ?? '';
    this.coach.hidden = !coach;
    if (id === this.coachId) return;
    this.coachId = id;
    if (!coach) { this.coach.replaceChildren(); return; }
    const card = COACH_CARDS[coach.id], got = button('Got it', () => { this.coach.hidden = true; this.coachId = ''; coach.dismiss(); });
    got.classList.add('paddock-coach-dismiss');
    this.coach.dataset.coach = coach.id;
    this.coach.setAttribute('aria-label', card.title);
    this.coach.replaceChildren(el('strong', card.title), el('p', card.text), got);
  }
  private renderCards(screen: DuelScreen) {
    const showCards = screen.kind !== 'menu' && this.dialog.dataset.compact !== 'true';
    this.seats.hidden = !showCards;
    if (!showCards) return;
    const keep = new Set(screen.cards.map(c => c.id));
    for (const [id, li] of this.cards) if (!keep.has(id)) { li.remove(); this.cards.delete(id); }
    let previous: Element | null = null;
    for (const card of screen.cards) {
      let li = this.cards.get(card.id);
      if (!li) { li = this.createCard(); this.cards.set(card.id, li); }
      this.updateCard(li, card, screen.kind === 'results');
      // Order by seat (or rank on Results) while moving as few nodes as possible.
      const at: Element | null = previous ? previous.nextElementSibling : this.seats.firstElementChild;
      if (at !== li) this.seats.insertBefore(li, at);
      previous = li;
    }
    // Open seats follow the drivers (lobby only).
    let open = [...this.seats.querySelectorAll<HTMLLIElement>('.seat-open')];
    while (open.length > screen.openSeats) open.pop()!.remove();
    while (open.length < screen.openSeats) { const li = el('li', '', 'seat-card seat-open'); li.append(el('span', '', 'seat-number'), el('span', 'Open seat', 'seat-name')); this.seats.append(li); open = [...open, li]; }
    open.forEach((li, i) => setText(li.querySelector('.seat-number')!, String(screen.cards.length + i + 1)));
    for (const li of open) this.seats.append(li);
    this.seats.dataset.count = String(Math.min(MAX_SEATS, screen.cards.length + screen.openSeats));
  }
  private createCard() {
    const li = el('li', '', 'seat-card');
    const car = el('span', '', 'seat-car'); car.setAttribute('aria-hidden', 'true');
    car.innerHTML = '<svg viewBox="0 0 64 28" focusable="false"><path d="M6 19c0-3 2-5 5-6l8-5c2-1 4-2 7-2h10c3 0 5 1 7 3l5 4h6c3 0 5 2 5 5v2c0 1-1 2-2 2h-4a6 6 0 0 0-12 0H24a6 6 0 0 0-12 0H8c-1 0-2-1-2-2z"/><circle cx="18" cy="22" r="4"/><circle cx="48" cy="22" r="4"/></svg>';
    li.append(el('span', '', 'seat-number'), car, el('span', '', 'seat-name'), el('span', '', 'seat-tags'), el('p', '', 'seat-status'), el('p', '', 'seat-result'));
    return li;
  }
  private updateCard(li: HTMLLIElement, card: SeatCard, results: boolean) {
    setText(li.querySelector('.seat-number')!, String(results && card.rank ? card.rank : card.number));
    setText(li.querySelector('.seat-name')!, card.name);
    setText(li.querySelector('.seat-tags')!, [card.you ? 'You' : '', card.host ? 'Host' : ''].filter(Boolean).join(' · '));
    setText(li.querySelector('.seat-status')!, SEAT_STATUS_TEXT[card.status]);
    const result = li.querySelector<HTMLElement>('.seat-result')!;
    result.hidden = !results;
    // The card already shows the place and the name; the full sentence stays readable as one line.
    const finished = card.finishTime != null && !!card.rank;
    const hidden = finished ? `${card.rank}. ${card.name} · ` : `${card.name} `, shown = finished ? `${card.finishTime!.toFixed(2)} s` : 'DNF';
    const key = results ? hidden + shown : '';
    if (result.dataset.key !== key) {
      result.dataset.key = key;
      result.replaceChildren(...(results ? [el('span', hidden, 'sr-only'), el('span', shown, 'seat-time')] : []));
    }
    (li.querySelector('.seat-car') as HTMLElement).style.setProperty('--paint', this.paintColor(card.paint));
    li.dataset.status = card.status; li.dataset.seat = card.id;
    li.classList.toggle('seat-you', card.you);
  }
  private renderSettings(screen: DuelScreen, extras: RoomExtras) {
    this.settingsNote.hidden = !(screen.settings && screen.kind === 'results' && screen.circuitChangeRedraws);
    if (!screen.settings) { this.settingsBox.remove(); return; }
    if (!this.settingsBox.isConnected) this.actions.before(this.settingsBox);
    const venues = [...extras.venues];
    if (screen.circuit && !venues.some(v => v.id === screen.circuit)) venues.push({ id: screen.circuit, name: screen.circuitName ?? screen.circuit });
    const key = venues.map(v => v.id).join(',');
    if (key !== this.venueKey) { this.venueKey = key; Paddock.fillVenues(this.circuitSelect, venues); }
    // An open or focused picker keeps what the host is choosing.
    if (document.activeElement !== this.circuitSelect && screen.circuit) this.circuitSelect.value = screen.circuit;
    if (document.activeElement !== this.lapsSelect && screen.laps) this.lapsSelect.value = String(screen.laps);
  }
  private renderActions(screen: DuelScreen, extras: RoomExtras) {
    const share = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    const canShare = typeof share.share === 'function';
    const key = [screen.kind, screen.canStart, screen.startBlocked, screen.ownVote, screen.enoughForRematch, extras.code, canShare, extras.removable.map(r => r.id).join(',')].join('|');
    if (key === this.actionKey) return;
    // Rebuilding the buttons would drop focus: restore it to the same action afterwards.
    const focused = (document.activeElement as HTMLElement | null)?.closest?.('.paddock-actions button')?.textContent;
    this.actionKey = key;
    const list: HTMLButtonElement[] = [];
    if (screen.kind === 'room') {
      if (extras.link && canShare) list.push(button('Share invite', async () => { try { await share.share!({ title: 'Roadster Race duel', text: `Race me in Roadster Race. Room ${extras.code}`, url: extras.link }); } catch { /* A dismissed share sheet needs no message. */ } }, true));
      if (extras.link) list.push(button('Copy link', async () => { try { await navigator.clipboard.writeText(extras.link!); this.status.textContent = 'Invite link copied.'; } catch { this.status.textContent = extras.link!; } }));
      if (screen.canStart) { const start = button('Start drawing', () => this.handlers.start(), true); start.disabled = !!screen.startBlocked; list.push(start); }
    }
    if (screen.kind === 'waiting') for (const d of extras.removable) list.push(button(`Remove ${d.name}`, () => this.handlers.remove(d.id)));
    if (screen.kind === 'results') {
      const again = button('Race again', () => this.handlers.vote('same'), true), redraw = button('New lines', () => this.handlers.vote('redraw'));
      again.setAttribute('aria-pressed', String(screen.ownVote === 'same')); redraw.setAttribute('aria-pressed', String(screen.ownVote === 'redraw'));
      list.push(again, redraw);
    }
    if (screen.kind === 'menu') list.push(button('Resume', () => this.handlers.resume(), true));
    list.push(button('Home', () => this.handlers.home()));
    this.actions.replaceChildren(...list);
    if (focused) list.find(b => b.textContent === focused)?.focus();
  }
  /** One status line per meaningful change (screen readers hear it once). */
  private announce(screen: DuelScreen) {
    let text = '';
    if (screen.kind === 'room' && screen.isHost) text = screen.startBlocked === 'needs-two' ? 'Share the invite: a race needs at least two drivers.' : screen.startBlocked === 'reconnecting' ? 'Waiting for a driver to reconnect.' : '';
    else if (screen.kind === 'room') text = 'Waiting for the host to start.';
    else if (screen.kind === 'waiting') { const drawing = screen.cards.filter(c => c.status === 'drawing').map(c => c.name); text = drawing.length ? `Waiting for ${drawing.join(', ')}.` : 'Everyone is ready.'; }
    else if (screen.kind === 'results') text = !screen.enoughForRematch ? 'Another race needs at least two drivers.' : screen.waitingFor.length ? `Waiting for ${screen.waitingFor.join(', ')}.` : '';
    if (text !== this.announced) { this.announced = text; this.status.textContent = text; }
  }
}
