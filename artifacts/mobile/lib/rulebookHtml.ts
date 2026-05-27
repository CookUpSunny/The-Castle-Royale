export const RULEBOOK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Castle — Official Rulebook</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css">
<style>
:root{
  --bg:#0f0f13;--surface:#18181f;--surface2:#22222c;
  --border:rgba(255,255,255,0.08);
  --yellow:#f5e642;--red:#ff3d3d;--blue:#3d8fff;
  --green:#2affa0;--purple:#b44fff;--orange:#ff7c3d;--pink:#ff3da8;
  --white:#ffffff;--dim:rgba(255,255,255,0.45);--mid:rgba(255,255,255,0.75);
  --ink:#10100e;--cream:#faf8f2;
}
*{box-sizing:border-box;margin:0;padding:0}

html,body{
  background:var(--bg);
  font-family:'Inter',sans-serif;
  color:var(--white);
}
body{
  overflow-y:auto;
  overflow-x:hidden;
  -webkit-overflow-scrolling:touch;
}
.page{
  width:100%;
  max-width:100%;
  margin:0;
  padding:44px 20px 100px;
}

/* HERO */
.hero{
  text-align:center;padding:56px 20px 48px;
  border-radius:24px;margin-bottom:0;overflow:hidden;position:relative;
  background:linear-gradient(135deg,#1a0a2e 0%,#0a1a2e 50%,#0a2e1a 100%);
}
.hero::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:
    radial-gradient(ellipse at 25% 50%,rgba(180,79,255,0.28) 0%,transparent 55%),
    radial-gradient(ellipse at 78% 30%,rgba(61,143,255,0.22) 0%,transparent 55%),
    radial-gradient(ellipse at 55% 85%,rgba(42,255,160,0.18) 0%,transparent 50%);
}
.hero-cards{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0}
.fcard{
  position:absolute;
  width:52px;height:74px;border-radius:7px;
  background:rgba(255,255,255,0.07);
  border:1px solid rgba(255,255,255,0.15);
  display:flex;flex-direction:column;justify-content:space-between;
  padding:5px 6px;
  box-shadow:0 4px 16px rgba(0,0,0,0.4);
  animation:floatCard linear infinite;
  will-change:transform,opacity;
}
.fcard .fr{font-family:'Bebas Neue',sans-serif;font-size:16px;line-height:1}
.fcard .fs{font-size:13px;text-align:center;margin:auto}
.fcard .fb{font-family:'Bebas Neue',sans-serif;font-size:16px;line-height:1;align-self:flex-end;transform:rotate(180deg)}
.fcard.fc-red .fr,.fcard.fc-red .fs,.fcard.fc-red .fb{color:rgba(255,120,120,0.7)}
.fcard.fc-black .fr,.fcard.fc-black .fs,.fcard.fc-black .fb{color:rgba(255,255,255,0.6)}
.fcard.fc-gold{background:rgba(245,230,66,0.06);border-color:rgba(245,230,66,0.25)}
.fcard.fc-gold .fr,.fcard.fc-gold .fs,.fcard.fc-gold .fb{color:rgba(245,230,66,0.7)}
.fcard.fc-face{background:linear-gradient(135deg,rgba(180,79,255,0.12),rgba(61,143,255,0.1));border-color:rgba(180,79,255,0.25)}
.fcard.fc-face .fr{color:rgba(180,79,255,0.8)}

@keyframes floatCard{
  0%  {transform:translateY(110%) rotate(var(--r0)) scale(var(--sc));opacity:0}
  8%  {opacity:var(--op)}
  88% {opacity:var(--op)}
  100%{transform:translateY(-110%) rotate(var(--r1)) scale(var(--sc));opacity:0}
}
.hero-eyebrow{font-size:13px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:var(--green);margin-bottom:16px;position:relative;z-index:2}
.hero-title{
  font-family:'Bebas Neue',sans-serif;font-size:110px;line-height:0.88;
  background:linear-gradient(135deg,var(--yellow) 0%,var(--orange) 50%,var(--pink) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  margin-bottom:16px;position:relative;letter-spacing:0.04em;z-index:2;
}
.hero-sub{font-size:17px;font-weight:600;color:var(--dim);position:relative;margin-bottom:24px;z-index:2}
.hero-meta{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;position:relative;z-index:2}
.hero-chip{padding:9px 18px;border-radius:100px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);font-size:13px;font-weight:700;color:var(--white)}

/* DIVIDER */
.orn-line{display:flex;align-items:center;gap:14px;margin:24px 0}
.orn-line::before,.orn-line::after{content:'';flex:1;height:1px;background:var(--border)}
.orn-line span{font-size:18px;color:rgba(255,255,255,0.12);flex-shrink:0}

/* SECTION */
.section{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:28px 22px 26px;margin-bottom:16px;position:relative;overflow:hidden}
.sacc{position:absolute;top:0;left:0;right:0;height:3px;border-radius:20px 20px 0 0}
.section-header{display:flex;align-items:flex-start;gap:14px;margin-bottom:22px}
.sec-icon{width:48px;height:48px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px}
.sec-eyebrow{font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:4px}
.sec-title{font-family:'Bebas Neue',sans-serif;font-size:38px;line-height:1;color:var(--white);margin-bottom:5px;letter-spacing:0.03em}
.sec-sub{font-size:15px;font-weight:500;color:var(--dim);line-height:1.5}

/* CARDS */
.pc{display:flex;flex-direction:column;justify-content:space-between;width:72px;height:102px;border-radius:10px;background:var(--cream);padding:7px 8px;flex-shrink:0;position:relative;box-shadow:0 8px 28px rgba(0,0,0,0.5),0 2px 8px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.9)}
.pc::after{content:'';position:absolute;inset:0;border-radius:10px;border:1px solid rgba(0,0,0,0.1)}
.pc .t{font-family:'Bebas Neue',sans-serif;font-size:23px;line-height:1;color:var(--ink)}
.pc .m{font-size:21px;line-height:1;text-align:center;margin:auto;color:var(--ink)}
.pc .b{font-family:'Bebas Neue',sans-serif;font-size:23px;line-height:1;color:var(--ink);align-self:flex-end;transform:rotate(180deg)}
.pc.rd .t,.pc.rd .b,.pc.rd .m{color:#cc0000}
.pc.fd{background:linear-gradient(135deg,#1a1a2e,#2a1a3e);border:2px solid rgba(180,79,255,0.5)}
.pc.fd::before{content:'';position:absolute;inset:5px;border-radius:6px;border:1px solid rgba(180,79,255,0.3);background:repeating-linear-gradient(45deg,rgba(180,79,255,0.05) 0,rgba(180,79,255,0.05) 1px,transparent 0,transparent 50%);background-size:7px 7px}
.pc.fd .t{color:var(--purple);font-size:22px;position:relative;z-index:1}
.pc.sp{background:linear-gradient(135deg,#fffce0,#fff5a0);border:2px solid var(--yellow)}
.pc.sp .t,.pc.sp .b{color:#7a6000}.pc.sp .m{color:#9a7800}
.pc.bn{background:linear-gradient(135deg,#fff0f0,#ffd0d0);border:2px solid var(--red)}
.pc.bn .t,.pc.bn .b{color:var(--red)}
.pc.gn{background:linear-gradient(135deg,#edfff8,#b0ffe0);border:2px solid var(--green)}
.pc.gn .t,.pc.gn .b{color:#008845}
.pc-sm{width:54px;height:76px}
.pc-sm .t{font-size:18px}.pc-sm .m{font-size:17px}.pc-sm .b{font-size:18px}

/* STEPS */
.steps{display:flex;flex-direction:column;gap:12px}
.step{display:flex;gap:14px;align-items:flex-start;padding:16px 18px;border-radius:14px;background:var(--surface2);border:1px solid var(--border)}
.snum{width:36px;height:36px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;margin-top:1px}
.step-t{font-size:17px;font-weight:800;color:var(--white);margin-bottom:5px;line-height:1.2}
.step-d{font-size:15px;color:var(--mid);line-height:1.6;font-weight:500}

/* ZONES */
.zone-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:8px 0 14px}
.zone-col{border-radius:14px;padding:16px 10px 14px;display:flex;flex-direction:column;align-items:center;gap:10px;background:var(--surface2);border:2px solid var(--border);position:relative;overflow:hidden}
.zone-col::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.z-fd{border-color:rgba(180,79,255,0.3)}.z-fu{border-color:rgba(42,255,160,0.3)}.z-hd{border-color:rgba(245,230,66,0.3)}
.z-fd::before{background:var(--purple)}.z-fu::before{background:var(--green)}.z-hd::before{background:var(--yellow)}
.znm{font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase}
.z-fd .znm{color:var(--purple)}.z-fu .znm{color:var(--green)}.z-hd .znm{color:var(--yellow)}
.zcards{display:flex;justify-content:center;gap:4px}
.zdesc{font-size:13px;color:var(--dim);line-height:1.4;text-align:center;font-weight:500}
.zone-rule{width:100%;padding:9px;border-radius:8px;font-size:12px;font-weight:700;line-height:1.4;text-align:center}
.z-fd .zone-rule{background:rgba(180,79,255,0.12);color:rgba(210,160,255,0.9);border:1px solid rgba(180,79,255,0.2)}
.z-fu .zone-rule{background:rgba(42,255,160,0.1);color:rgba(140,255,200,0.9);border:1px solid rgba(42,255,160,0.2)}
.z-hd .zone-rule{background:rgba(245,230,66,0.1);color:rgba(255,245,140,0.9);border:1px solid rgba(245,230,66,0.25)}
.zone-num{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800}
.z-fd .zone-num{background:rgba(180,79,255,0.2);color:var(--purple);border:1px solid rgba(180,79,255,0.4)}
.z-fu .zone-num{background:rgba(42,255,160,0.15);color:var(--green);border:1px solid rgba(42,255,160,0.4)}
.z-hd .zone-num{background:rgba(245,230,66,0.15);color:var(--yellow);border:1px solid rgba(245,230,66,0.4)}

/* DEAL / DECISION */
.deal-notice{display:flex;align-items:center;gap:14px;padding:16px 18px;background:var(--surface2);border:1px solid var(--border);border-radius:14px;margin-bottom:12px}
.deal-icon{font-size:30px;flex-shrink:0}
.deal-title{font-size:18px;font-weight:800;color:var(--white);margin-bottom:4px}
.deal-desc{font-size:15px;color:var(--dim);line-height:1.55;font-weight:500}
.decision-row{display:flex;align-items:center;gap:14px;padding:16px 18px;border-radius:14px;margin-bottom:14px;background:rgba(245,230,66,0.06);border:2px dashed rgba(245,230,66,0.35)}
.dec-arrow{font-size:26px;color:var(--yellow)}
.dec-title{font-size:18px;font-weight:800;color:var(--yellow);margin-bottom:4px}
.dec-desc{font-size:15px;color:rgba(255,245,180,0.65);line-height:1.55;font-weight:500}

/* SPECIALS */
.spec-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.spec-tile{border-radius:16px;padding:20px 16px;display:flex;gap:14px;align-items:flex-start;background:var(--surface2);border:2px solid var(--border);position:relative;overflow:hidden}
.t-gold{border-color:rgba(245,230,66,0.3);background:rgba(245,230,66,0.05)}
.t-red{border-color:rgba(255,61,61,0.3);background:rgba(255,61,61,0.05)}
.si-rank{font-family:'Bebas Neue',sans-serif;font-size:44px;color:var(--white);line-height:1}
.si-label{font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;margin:4px 0 8px}
.t-gold .si-label{color:var(--yellow)}.t-red .si-label{color:var(--red)}
.si-desc{font-size:15px;color:var(--mid);line-height:1.6;font-weight:500}

/* RULES GRID */
.rules-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.rule-tile{padding:16px 14px;border-radius:14px;background:var(--surface2);border:1px solid var(--border)}
.rule-head{font-size:15px;font-weight:800;color:var(--white);margin-bottom:7px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.rule-body{font-size:14px;color:var(--dim);line-height:1.55;font-weight:500}
.badge{font-size:10px;font-weight:800;padding:3px 9px;border-radius:6px;letter-spacing:0.07em;text-transform:uppercase}
.bgg{background:rgba(42,255,160,0.15);color:var(--green);border:1px solid rgba(42,255,160,0.3)}
.bgr{background:rgba(255,61,61,0.15);color:var(--red);border:1px solid rgba(255,61,61,0.3)}
.bga{background:rgba(245,230,66,0.12);color:var(--yellow);border:1px solid rgba(245,230,66,0.3)}

/* PHASES */
.phases{display:flex;flex-direction:column;margin-bottom:20px;border-radius:16px;overflow:hidden;border:1px solid var(--border)}
.phase{display:flex;align-items:center;gap:16px;padding:20px 20px;border-bottom:1px solid var(--border);background:var(--surface2)}
.phase:last-child{border-bottom:none}
.phase-n{width:44px;height:44px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:22px}
.ph1 .phase-n{background:rgba(245,230,66,0.15);color:var(--yellow);border:2px solid rgba(245,230,66,0.4)}
.ph2 .phase-n{background:rgba(61,143,255,0.15);color:var(--blue);border:2px solid rgba(61,143,255,0.4)}
.ph3 .phase-n{background:rgba(180,79,255,0.15);color:var(--purple);border:2px solid rgba(180,79,255,0.4)}
.phase-body{flex:1}
.phase-title{font-size:18px;font-weight:800;color:var(--white);margin-bottom:4px}
.phase-desc{font-size:15px;color:var(--dim);line-height:1.55;font-weight:500}
.phase-cards{display:flex;gap:5px;flex-shrink:0}

/* WIN BANNER */
.win-banner{text-align:center;padding:36px 22px;border-radius:20px;background:linear-gradient(135deg,#1a1a0a,#0a1a10,#1a0a2e);border:2px solid rgba(245,230,66,0.3);position:relative;overflow:hidden}
.win-banner::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(245,230,66,0.1) 0%,transparent 65%);pointer-events:none}
.crown{font-size:52px;color:var(--yellow);margin-bottom:12px;position:relative}
.win-t{font-family:'Bebas Neue',sans-serif;font-size:44px;line-height:1;background:linear-gradient(135deg,var(--yellow),var(--orange));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:12px;position:relative;letter-spacing:0.03em}
.win-d{font-size:17px;color:var(--mid);line-height:1.65;font-weight:500;position:relative}
.lose-note{display:inline-block;margin-top:18px;padding:10px 22px;border-radius:10px;background:rgba(255,61,61,0.12);border:2px solid rgba(255,61,61,0.3);font-size:13px;font-weight:800;color:var(--red);letter-spacing:0.07em;text-transform:uppercase;position:relative}

/* TIP */
.tip{border-radius:12px;padding:16px 18px;background:rgba(245,230,66,0.06);border-left:4px solid var(--yellow);font-size:15px;color:var(--dim);line-height:1.6;margin-top:16px;font-weight:500}
.tip b{color:var(--yellow);font-weight:800}
</style>
</head>
<body>

<div class="page">

<!-- HERO -->
<div class="hero">
  <div class="hero-cards" id="heroCards"></div>
  <div class="hero-eyebrow">Official Rules &amp; Guide</div>
  <div class="hero-title">♜ Castle</div>
  <div class="hero-meta">
    <div class="hero-chip">2&ndash;4 Players</div>
    <div class="hero-chip">Standard 52-Card Deck</div>
    <div class="hero-chip">~20 Minutes</div>
  </div>
</div>

<div class="orn-line"><span>✦ ✦ ✦</span></div>

<!-- 1 · WHAT IS CASTLE -->
<div class="section">
  <div class="sacc" style="background:linear-gradient(90deg,var(--yellow),var(--orange))"></div>
  <div class="section-header">
    <div class="sec-icon" style="background:rgba(245,230,66,0.12);color:var(--yellow)"><i class="ti ti-crown"></i></div>
    <div>
      <div class="sec-eyebrow" style="color:var(--yellow)">The Game</div>
      <div class="sec-title">What is Castle?</div>
      <div class="sec-sub">A card-shedding game of nerve, strategy, and a little luck</div>
    </div>
  </div>
  <div class="steps">
    <div class="step">
      <div class="snum" style="background:var(--yellow);color:var(--ink)">1</div>
      <div><div class="step-t">The Objective</div><div class="step-d">Be the first player to rid yourself of every card &mdash; your hand first, then your face-up castle cards, then your blind face-down cards.</div></div>
    </div>
    <div class="step">
      <div class="snum" style="background:var(--blue);color:#fff">2</div>
      <div><div class="step-t">The Shared Pile</div><div class="step-d">A central discard pile sits at the table. On your turn, you must play a card equal to or higher in rank than the top card of the pile.</div></div>
    </div>
    <div class="step">
      <div class="snum" style="background:var(--orange);color:#fff">3</div>
      <div><div class="step-t">Cannot Play?</div><div class="step-d">If you hold no valid card to play, you must collect the entire pile into your hand.</div></div>
    </div>
    <div class="step">
      <div class="snum" style="background:var(--red);color:#fff">4</div>
      <div><div class="step-t">The Loser</div><div class="step-d">The last player still holding cards when all others have finished loses the round &mdash; and earns the title.</div></div>
    </div>
  </div>
</div>


<div class="orn-line"><span>✦ ✦ ✦</span></div>


<!-- 2 · SETUP -->
<div class="section">
  <div class="sacc" style="background:linear-gradient(90deg,var(--blue),var(--purple))"></div>
  <div class="section-header">
    <div class="sec-icon" style="background:rgba(61,143,255,0.12);color:var(--blue)"><i class="ti ti-layout-columns"></i></div>
    <div>
      <div class="sec-eyebrow" style="color:var(--blue)">Setup</div>
      <div class="sec-title">Your Three Zones</div>
      <div class="sec-sub">Every player receives nine cards across three positions</div>
    </div>
  </div>

  <div class="deal-notice">
    <div class="deal-icon">&#127183;</div>
    <div>
      <div class="deal-title">You Are Dealt Your Hand</div>
      <div class="deal-desc">Each player receives 9 cards &mdash; 3 face-down, 3 face-up on top of them, and 3 held privately.</div>
    </div>
  </div>

  <div class="decision-row">
    <div class="pc sp pc-sm" style="width:42px;height:58px"><div class="t" style="font-size:13px">A</div><div class="m" style="font-size:11px">&#9830;</div></div>
    <div class="dec-arrow">&#8644;</div>
    <div class="pc pc-sm" style="width:42px;height:58px"><div class="t" style="font-size:13px">5</div><div class="m" style="font-size:11px">&#9827;</div></div>
    <div style="margin-left:6px">
      <div class="dec-title">The Decision Phase</div>
      <div class="dec-desc">Choose your three Castle cards. Load your best cards face-up before the game begins.</div>
    </div>
  </div>

  <div class="zone-grid">
    <div class="zone-col z-fd">
      <div class="zone-num">1</div>
      <div class="znm">Face-Down</div>
      <div class="zcards">
        <div class="pc fd pc-sm"><div class="t">?</div></div>
        <div class="pc fd pc-sm"><div class="t">?</div></div>
        <div class="pc fd pc-sm"><div class="t">?</div></div>
      </div>
      <div class="zdesc">3 cards placed face-down. You may not look at these until you play them.</div>
      <div class="zone-rule">&#128683; Never peek.<br>Played blind at the end.</div>
    </div>
    <div class="zone-col z-fu">
      <div class="zone-num">2</div>
      <div class="znm">Face-Up</div>
      <div class="zcards">
        <div class="pc pc-sm"><div class="t">J</div><div class="m">&#9824;</div><div class="b">J</div></div>
        <div class="pc rd pc-sm"><div class="t">7</div><div class="m">&#9829;</div><div class="b">7</div></div>
        <div class="pc sp pc-sm"><div class="t">A</div><div class="m">&#9830;</div><div class="b">A</div></div>
      </div>
      <div class="zdesc">3 cards face-up on top of your face-down row. Visible to all players.</div>
      <div class="zone-rule">&#128064; Visible to all.<br>Played once hand is empty.</div>
    </div>
    <div class="zone-col z-hd">
      <div class="zone-num">3</div>
      <div class="znm">Your Hand</div>
      <div class="zcards">
        <div class="pc rd pc-sm"><div class="t">Q</div><div class="m">&#9829;</div><div class="b">Q</div></div>
        <div class="pc pc-sm"><div class="t">4</div><div class="m">&#9827;</div><div class="b">4</div></div>
        <div class="pc gn pc-sm"><div class="t">10</div><div class="m">&#9830;</div><div class="b">10</div></div>
      </div>
      <div class="zdesc">3 cards held privately. Refill to 3 from the deck each turn.</div>
      <div class="zone-rule">&#129296; Always private.<br>Play these first every turn.</div>
    </div>
  </div>

  <div class="tip"><b>The wise play:</b> Load your face-up row with 2s, 10s, and Aces. You'll see them and control them in the late game when every card is critical.</div>
</div>

<!-- 3 · TURN FLOW -->
<div class="section">
  <div class="sacc" style="background:linear-gradient(90deg,var(--green),var(--blue))"></div>
  <div class="section-header">
    <div class="sec-icon" style="background:rgba(42,255,160,0.12);color:var(--green)"><i class="ti ti-cards"></i></div>
    <div>
      <div class="sec-eyebrow" style="color:var(--green)">Gameplay</div>
      <div class="sec-title">How a Turn Works</div>
      <div class="sec-sub">Play &rarr; draw &rarr; pass &mdash; repeat until someone wins</div>
    </div>
  </div>
  <div class="steps">
    <div class="step">
      <div class="snum" style="background:var(--yellow);color:var(--ink)">1</div>
      <div><div class="step-t">Play a Card — or Multiple</div><div class="step-d">Play one or more cards of the same rank from your hand. All must be equal to or higher in rank than the top card of the pile.</div></div>
    </div>
    <div class="step">
      <div class="snum" style="background:var(--blue);color:#fff">2</div>
      <div><div class="step-t">Refill to Three</div><div class="step-d">After playing, draw from the deck until you hold three cards in hand again &mdash; as long as the deck has cards remaining.</div></div>
    </div>
    <div class="step">
      <div class="snum" style="background:var(--red);color:#fff">3</div>
      <div><div class="step-t">Cannot Play? Collect the Pile</div><div class="step-d">If no card in your hand is valid to play, collect every card from the pile into your hand.</div></div>
    </div>
    <div class="step">
      <div class="snum" style="background:var(--green);color:var(--ink)">4</div>
      <div><div class="step-t">Hand Empty &amp; Deck Gone — Play Face-Ups</div><div class="step-d">Once your hand is empty and the deck is exhausted, begin playing your face-up cards. Same rules apply.</div></div>
    </div>
    <div class="step">
      <div class="snum" style="background:var(--purple);color:#fff">5</div>
      <div><div class="step-t">Face-Ups Gone — Flip Blind</div><div class="step-d">Choose any face-down card without looking. Flip it. Plays legally? Go. Doesn't? Collect the pile and that card into your hand.</div></div>
    </div>
  </div>
</div>


<div class="orn-line"><span>✦ ✦ ✦</span></div>


<!-- 4 · SPECIAL CARDS -->
<div class="section">
  <div class="sacc" style="background:linear-gradient(90deg,var(--yellow),var(--pink))"></div>
  <div class="section-header">
    <div class="sec-icon" style="background:rgba(180,79,255,0.12);color:var(--purple)"><i class="ti ti-bolt"></i></div>
    <div>
      <div class="sec-eyebrow" style="color:var(--purple)">Power Cards</div>
      <div class="sec-title">Special Cards</div>
      <div class="sec-sub">Two cards that command their own rules</div>
    </div>
  </div>
  <div class="spec-grid">
    <div class="spec-tile t-gold">
      <div class="pc sp pc-sm"><div class="t">2</div><div class="m">&#9733;</div><div class="b">2</div></div>
      <div>
        <div class="si-rank">2</div>
        <div class="si-label">Wild Card</div>
        <div class="si-desc">May be played on anything &mdash; any card, any situation. After playing a 2, the same player immediately plays another card on top of it.</div>
      </div>
    </div>
    <div class="spec-tile t-red">
      <div class="pc bn pc-sm"><div class="t">10</div><div class="m">&#9824;</div><div class="b">10</div></div>
      <div>
        <div class="si-rank">10</div>
        <div class="si-label">The Burn</div>
        <div class="si-desc">Destroys the entire pile &mdash; all cards permanently removed from play. The player who burns takes another turn immediately.</div>
      </div>
    </div>
  </div>
  <div class="tip"><b>Bonus burn:</b> Playing four cards of the same rank at once also burns the pile &mdash; same effect as a 10. You play again immediately.</div>
</div>

<!-- 5 · KEY RULES -->
<div class="section">
  <div class="sacc" style="background:linear-gradient(90deg,var(--orange),var(--red))"></div>
  <div class="section-header">
    <div class="sec-icon" style="background:rgba(255,124,61,0.12);color:var(--orange)"><i class="ti ti-gavel"></i></div>
    <div>
      <div class="sec-eyebrow" style="color:var(--orange)">The House Rules</div>
      <div class="sec-title">Rules That Matter</div>
      <div class="sec-sub">Six rulings every player must know</div>
    </div>
  </div>
  <div class="rules-grid">
    <div class="rule-tile"><div class="rule-head"><span class="badge bgg">Legal</span> Equal Rank</div><div class="rule-body">Playing the same rank as the top card is always a valid play. Equal counts.</div></div>
    <div class="rule-tile"><div class="rule-head"><span class="badge bgg">Legal</span> Multi-Play</div><div class="rule-body">You may play two, three, or four cards of the same rank in a single turn.</div></div>
    <div class="rule-tile"><div class="rule-head"><span class="badge bgr">Illegal</span> Skip Zones</div><div class="rule-body">You may not play face-ups while hand cards remain. You may not play face-downs while face-ups remain.</div></div>
    <div class="rule-tile"><div class="rule-head"><span class="badge bgr">Trap</span> Blind Flip Fails</div><div class="rule-body">If your flipped face-down card cannot be played, you collect the pile and that card into your hand.</div></div>
    <div class="rule-tile"><div class="rule-head"><span class="badge bga">Rule</span> Ace is Highest</div><div class="rule-body">Ace beats everything &mdash; except a 2 wild or a 10 burn. Those two cards override the Ace.</div></div>
    <div class="rule-tile"><div class="rule-head"><span class="badge bgr">Rule</span> Drawing from Deck</div><div class="rule-body">You cannot draw from the deck if you already hold more than 3 cards in your hand.</div></div>
  </div>
</div>

<!-- 6 · HOW TO WIN -->
<div class="section">
  <div class="sacc" style="background:linear-gradient(90deg,var(--green),var(--yellow))"></div>
  <div class="section-header">
    <div class="sec-icon" style="background:rgba(42,255,160,0.12);color:var(--green)"><i class="ti ti-trophy"></i></div>
    <div>
      <div class="sec-eyebrow" style="color:var(--green)">Victory</div>
      <div class="sec-title">How to Win</div>
      <div class="sec-sub">Three phases stand between you and glory</div>
    </div>
  </div>
  <div class="phases">
    <div class="phase ph1">
      <div class="phase-n">I</div>
      <div class="phase-body">
        <div class="phase-title">Clear Your Hand</div>
        <div class="phase-desc">Play and refill. Survive being forced to collect. Continue until your hand is empty and the deck is fully exhausted.</div>
      </div>
      <div class="phase-cards">
        <div class="pc pc-sm"><div class="t">K</div><div class="m">&#9824;</div><div class="b">K</div></div>
        <div class="pc sp pc-sm"><div class="t">A</div><div class="m">&#9830;</div><div class="b">A</div></div>
      </div>
    </div>
    <div class="phase ph2">
      <div class="phase-n">II</div>
      <div class="phase-body">
        <div class="phase-title">Clear Your Face-Ups</div>
        <div class="phase-desc">Play your three visible castle cards. Equal or higher to play &mdash; or collect the pile. No deck left to draw from.</div>
      </div>
      <div class="phase-cards">
        <div class="pc pc-sm"><div class="t">J</div><div class="m">&#9829;</div><div class="b">J</div></div>
        <div class="pc sp pc-sm"><div class="t">2</div><div class="m">&#9733;</div><div class="b">2</div></div>
      </div>
    </div>
    <div class="phase ph3">
      <div class="phase-n">III</div>
      <div class="phase-body">
        <div class="phase-title">Survive the Blind Flip</div>
        <div class="phase-desc">Three hidden cards between you and freedom. Choose one at a time and flip it blind. Fortune favours the bold.</div>
      </div>
      <div class="phase-cards">
        <div class="pc fd pc-sm"><div class="t">?</div></div>
        <div class="pc fd pc-sm"><div class="t">?</div></div>
        <div class="pc fd pc-sm"><div class="t">?</div></div>
      </div>
    </div>
  </div>
  <div class="win-banner">
    <div class="crown"><i class="ti ti-crown"></i></div>
    <div class="win-t">First to clear all three zones wins</div>
    <div class="win-d">Play your final face-down card successfully and you are out.<br>Take your bow. Shuffle the deck. Go again.</div>
    <div class="lose-note">Last player holding cards loses &mdash; and earns the title</div>
  </div>
</div>

<div class="orn-line"><span>✦ ✦ ✦</span></div>

</div><!-- /page -->

<script>
(function(){
  const container = document.getElementById('heroCards');
  const cards = [
    {r:'A',s:'♠',cl:'fc-black'},{r:'K',s:'♥',cl:'fc-red'},{r:'Q',s:'♦',cl:'fc-red'},
    {r:'J',s:'♠',cl:'fc-black'},{r:'10',s:'♣',cl:'fc-black'},{r:'9',s:'♥',cl:'fc-red'},
    {r:'8',s:'♠',cl:'fc-black'},{r:'7',s:'♦',cl:'fc-red'},{r:'2',s:'★',cl:'fc-gold'},
    {r:'2',s:'★',cl:'fc-gold'},{r:'10',s:'♠',cl:'fc-face'},{r:'A',s:'♦',cl:'fc-red'},
    {r:'K',s:'♣',cl:'fc-black'},{r:'Q',s:'♥',cl:'fc-red'},{r:'J',s:'♦',cl:'fc-red'},
    {r:'3',s:'♠',cl:'fc-black'},{r:'6',s:'♥',cl:'fc-red'},{r:'5',s:'♣',cl:'fc-black'},
  ];

  cards.forEach((c, i) => {
    const el = document.createElement('div');
    const left = 4 + (i / cards.length) * 92;
    const dur  = 7 + Math.random() * 9;
    const delay = -(Math.random() * dur);
    const r0   = -30 + Math.random() * 60;
    const r1   = r0 + (-40 + Math.random() * 80);
    const sc   = 0.6 + Math.random() * 0.7;
    const op   = 0.12 + Math.random() * 0.22;

    el.className = \`fcard \${c.cl}\`;
    el.innerHTML = \`<div class="fr">\${c.r}</div><div class="fs">\${c.s}</div><div class="fb">\${c.r}</div>\`;
    el.style.cssText = \`
      left:\${left}%;
      --r0:\${r0}deg;
      --r1:\${r1}deg;
      --sc:\${sc};
      --op:\${op};
      animation-duration:\${dur}s;
      animation-delay:\${delay}s;
    \`;
    container.appendChild(el);
  });
})();
</script>
</body>
</html>`;
