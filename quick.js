// חברותא נקודתית: תקועים בשיעורי בית? שולחים בקשה קצרה, ומי שיכול לעזור במקצוע לוחץ "אני עוזר" ונפתח צ׳אט.
import { esc, avatar, toast, sheet, confetti, sound } from './ui.js';
import { ICON, SUBJECTS } from './games.js';
import { topicsOf, tsubject } from './topics.js';

const TTL = {now:30 * 60e3, hour:2 * 3600e3, today:12 * 3600e3};
const URG = [['now','⚡ עכשיו'],['hour','🕐 בשעה הקרובה'],['today','📅 היום']];

export function createQuick(ctx){
  const B = () => ctx.B(), me = () => ctx.me(), myId = () => ctx.myId();
  let list = [], unsub = null; const told = new Set();
  const alive = r => r.status !== 'closed' && Date.now() - r.at < (TTL[r.urgency] || TTL.today);
  const mineOpen = () => list.find(r => r.by === myId() && r.status === 'open' && alive(r));
  const forMe = () => list.filter(r => r.status === 'open' && alive(r) && r.by !== myId() && !ctx.isBlocked(r.by)
    && ((me().help || []).includes(r.subject))).sort((a, b) => b.at - a.at);
  const count = () => window.CV_QUIET ? 0 : forMe().length;

  function start(){
    unsub && unsub();
    unsub = B().onQuick(l => { list = l; check(); ctx.changed(); });
  }
  function stop(){ unsub && unsub(); unsub = null; list = []; told.clear(); }

  // מישהו לקח את הבקשה שלי
  function check(){
    list.filter(r => r.by === myId() && r.status === 'taken' && r.takenBy && !told.has(r.id) && Date.now() - r.at < 12 * 3600e3).forEach(r => {
      told.add(r.id); confetti(); sound('win');
      const cid = [myId(), r.takenBy].sort().join('_');
      toast(`🎉 ${r.takenByName || 'מישהו'} יעזור לך ב${r.subject}!`);
      setTimeout(() => ctx.openChat(cid), 900);
    });
  }

  function ask(){
    const subs = [...new Set([...(me().need || []), ...SUBJECTS])];
    let urgency = 'hour';
    sheet(`<div style="text-align:center"><div style="font-size:44px">⚡</div><h3>עזרה נקודתית</h3><p class="small muted" style="margin:4px 0 0">תקוע/ה בשיעורי בית או בשאלה אחת? מי שיכול לעזור במקצוע יקפוץ.</p></div>
      <label>מקצוע</label><select id="qs">${subs.map(s => `<option>${esc(s)}</option>`).join('')}</select>
      <label>נושא <span class="muted small">(לא חובה)</span></label><select id="qt"></select>
      <label for="qx">מה השאלה?</label><textarea id="qx" rows="3" maxlength="200" placeholder="למשל: לא מבין איך גוזרים את x² · sin x"></textarea>
      <label>עד מתי?</label><div class="seg" id="qu">${URG.map(([k, n]) => `<button data-u="${k}" class="${k === urgency ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="small muted">בלי פרטים אישיים בבקשה. מי שעוזר ילמד איתך בצ׳אט ובווידאו.</p>
      <button class="btn grn" id="qg">🚀 שליחת בקשה</button>`, (el, close) => {
        const qs = el.querySelector('#qs'), qt = el.querySelector('#qt');
        const fill = () => qt.innerHTML = '<option value="">כל הנושאים</option>' + topicsOf(qs.value).map(t => `<option>${esc(t)}</option>`).join('');
        qs.onchange = fill; fill();
        el.querySelector('#qu').onclick = e => { const b = e.target.closest('[data-u]'); if(!b) return; urgency = b.dataset.u; el.querySelectorAll('#qu button').forEach(x => x.classList.toggle('on', x === b)); };
        el.querySelector('#qg').onclick = async e => {
          const text = ctx.clean(el.querySelector('#qx').value.trim()); if(text.length < 5) return toast('כתוב בקצרה מה השאלה');
          e.target.disabled = true;
          try { await B().addQuick({by:myId(), byName:me().name, grade:me().grade || '', subject:qs.value, topic:qt.value, text, urgency, at:Date.now(), status:'open'});
            close(); toast('הבקשה נשלחה. מחפשים לך עוזר… ⚡'); ctx.scanOut(text); }
          catch(err){ e.target.disabled = false; toast(ctx.errMsg(err)); }
        };
      });
  }

  async function claim(r){
    try {
      await B().claimQuick(r.id, {status:'taken', takenBy:myId(), takenByName:me().name});
      const cid = await B().openChat(myId(), r.by, {[myId()]:me().name, [r.by]:r.byName}, r.subject);
      await B().send(cid, {from:myId(), type:'text', text:`היי ${r.byName}! ראיתי את הבקשה שלך ב${r.subject}${r.topic ? ' (' + r.topic + ')' : ''}. אני כאן לעזור 😊 תספר/י מה לא ברור?`});
      confetti(); ctx.openChat(cid);
    } catch(e){ toast('מישהו אחר כבר לקח את הבקשה 🙂'); }
  }

  const waitDots = '<span class="spin" style="width:16px;height:16px;display:inline-block;vertical-align:middle;margin-inline-end:6px"></span>';
  function html(){
    const mine = mineOpen(), helpers = forMe();
    return `<div class="card gamecard quickcta" id="qask"><div class="ic" style="background:var(--yel)">⚡</div><div class="grow"><b class="fred big">צריך עזרה עכשיו?</b><div class="small muted">שיעורי בית או שאלה נקודתית. מישהו יקפוץ לעזור</div></div><span class="big">←</span></div>
      ${mine ? `<div class="card" style="border-color:var(--yel)"><div class="row between"><b>${waitDots}מחפשים עוזר ב${esc(mine.subject)}…</b><button class="link small" id="qcancel" style="color:var(--pink)">ביטול</button></div><div class="small muted">${esc(mine.text)}</div></div>` : ''}
      ${helpers.length ? `<div class="head"><h3>⚡ מחכים לעזרה שלך (${helpers.length})</h3></div>${helpers.slice(0, 5).map(r => `<div class="card item" data-q="${esc(r.id)}">${avatar(r.by, r.byName, 42)}<div class="grow"><b>${esc(r.byName)} <span class="muted small">· ${esc(r.grade || '')}</span></b>
        <div><span class="tag need">${ICON[r.subject] || ''} ${esc(r.subject)}</span>${r.topic ? `<span class="tag sky">${esc(r.topic)}</span>` : ''}</div><div class="small ellipsis">${esc(r.text)}</div></div><button class="btn sm grn" data-claim="${esc(r.id)}">🤝 אני עוזר</button></div>`).join('')}` : ''}`;
  }
  function bind(root){
    root.querySelector('#qask')?.addEventListener('click', ask);
    root.querySelector('#qcancel')?.addEventListener('click', async () => { const m = mineOpen(); if(m) { await B().claimQuick(m.id, {status:'closed'}).catch(() => {}); } });
    root.querySelectorAll('[data-claim]').forEach(b => b.onclick = () => { const r = list.find(x => x.id === b.dataset.claim); if(r){ b.disabled = true; claim(r); } });
  }
  return {start, stop, html, bind, count, ask};
}
