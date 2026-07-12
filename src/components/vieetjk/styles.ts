// Stylesheet tự chứa cho trang vieetjk. Mọi rule nằm dưới .vjk-root để không
// đụng tới theme của phần còn lại của app. Render 1 lần trong VieetjkChrome.
export const VJK_CSS = `
.vjk-root{
  --red:#e11d2b; --red-dark:#b3111d;
  --ink:#f5f4f2; --ink2:rgba(245,244,242,.64); --ink3:rgba(245,244,242,.40);
  --line:rgba(255,255,255,.10); --paper:#0a0a0c; --paper2:#101014; --paper3:#17171c;
  background:var(--paper); color:var(--ink);
  font-family:var(--font-manrope),var(--font-hanken),system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
  line-height:1.6; letter-spacing:.005em;
}
.vjk-root *{box-sizing:border-box;}
.vjk-root img{max-width:100%;display:block;}
.vjk-root a{color:inherit;text-decoration:none;}
.vjk-serif{font-family:var(--font-cormorant),Georgia,serif;font-weight:500;}
.vjk-wrap{max-width:1180px;margin:0 auto;padding:0 24px;}
.vjk-eyebrow{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--red);font-weight:600;}
.vjk-muted{color:var(--ink2);}

/* ── Header ─────────────────────────────────────────── */
.vjk-header{position:sticky;top:0;z-index:50;background:rgba(10,10,12,.72);
  backdrop-filter:saturate(1.2) blur(14px);border-bottom:1px solid var(--line);}
.vjk-headin{display:flex;align-items:center;justify-content:space-between;height:70px;}
.vjk-logo{display:inline-flex;align-items:center;gap:9px;}
.vjk-logo-text{display:inline-flex;flex-direction:column;line-height:1;}
.vjk-logo-name{font-family:var(--font-cormorant),serif;font-weight:600;font-size:22px;letter-spacing:.14em;}
.vjk-nav{display:flex;align-items:center;gap:30px;}
.vjk-nav a{font-size:14px;color:var(--ink2);font-weight:500;transition:color .18s;position:relative;padding:4px 0;}
.vjk-nav a:hover{color:var(--ink);}
.vjk-nav a.active{color:var(--ink);}
.vjk-nav a.active::after{content:"";position:absolute;left:0;right:0;bottom:-2px;height:2px;background:var(--red);}
.vjk-cta{display:inline-flex;align-items:center;gap:8px;background:var(--red);color:#fff !important;
  padding:10px 20px;border-radius:999px;font-size:14px;font-weight:600;transition:background .18s,transform .18s;}
.vjk-cta:hover{background:var(--red-dark);transform:translateY(-1px);}
.vjk-cta-ghost{background:transparent;color:var(--ink) !important;border:1px solid var(--line);}
.vjk-cta-ghost:hover{background:var(--paper3);border-color:var(--ink3);}
.vjk-burger{display:none;background:none;border:0;padding:8px;cursor:pointer;color:var(--ink);}
.vjk-mobnav{display:none;}

/* ── Buttons/util ──────────────────────────────────── */
.vjk-btnrow{display:flex;flex-wrap:wrap;gap:12px;}
.vjk-section{padding:96px 0;}
.vjk-section.tight{padding:64px 0;}
.vjk-section.alt{background:var(--paper2);}
.vjk-h2{font-family:var(--font-cormorant),serif;font-weight:500;font-size:clamp(30px,4.4vw,46px);line-height:1.08;letter-spacing:-.01em;}
.vjk-lead{font-size:clamp(16px,1.6vw,19px);color:var(--ink2);max-width:62ch;}
.vjk-center{text-align:center;margin-left:auto;margin-right:auto;}

/* ── Hero ──────────────────────────────────────────── */
.vjk-hero{position:relative;padding:clamp(80px,12vw,150px) 0 clamp(64px,9vw,120px);overflow:hidden;}
.vjk-hero::before{content:"";position:absolute;inset:0;z-index:0;
  background:
    radial-gradient(55% 60% at 80% 0%, rgba(225,29,43,.16), transparent 68%),
    radial-gradient(40% 50% at 12% 100%, rgba(225,29,43,.06), transparent 70%),
    linear-gradient(180deg,#141418,var(--paper));}
.vjk-hero-in{position:relative;z-index:1;max-width:820px;}
.vjk-hero h1{font-family:var(--font-cormorant),serif;font-weight:500;
  font-size:clamp(40px,7vw,76px);line-height:1.03;letter-spacing:-.015em;margin:20px 0 0;white-space:pre-line;}
.vjk-hero p{margin:22px 0 0;font-size:clamp(16px,1.8vw,20px);color:var(--ink2);max-width:56ch;}
.vjk-hero .vjk-btnrow{margin-top:36px;}

/* ── Service cards (home) ──────────────────────────── */
.vjk-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;}
.vjk-scard{position:relative;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:16px;
  overflow:hidden;background:var(--paper3);transition:transform .22s,box-shadow .22s,border-color .22s;}
.vjk-scard:hover{transform:translateY(-4px);box-shadow:0 22px 48px -24px rgba(0,0,0,.7);border-color:rgba(225,29,43,.5);}
.vjk-scard-media{aspect-ratio:4/3;background:var(--paper3);position:relative;overflow:hidden;}
.vjk-scard-media img{width:100%;height:100%;object-fit:cover;transition:transform .5s;}
.vjk-scard:hover .vjk-scard-media img{transform:scale(1.05);}
.vjk-scard-ph{width:100%;height:100%;display:grid;place-items:center;color:var(--ink3);
  background:linear-gradient(135deg,var(--paper3),var(--paper2));}
.vjk-scard-body{padding:24px 24px 28px;display:flex;flex-direction:column;gap:8px;flex:1;}
.vjk-scard-body h3{font-family:var(--font-cormorant),serif;font-size:26px;font-weight:600;}
.vjk-scard-body .tag{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--red);font-weight:600;}
.vjk-scard-body p{color:var(--ink2);font-size:15px;flex:1;}
.vjk-scard-link{display:inline-flex;align-items:center;gap:7px;margin-top:6px;font-weight:600;font-size:14px;color:var(--ink);}
.vjk-scard-link .arw{color:var(--red);transition:transform .2s;}
.vjk-scard:hover .vjk-scard-link .arw{transform:translateX(4px);}

/* ── About / stats ─────────────────────────────────── */
.vjk-about{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;}
.vjk-stats{display:flex;gap:40px;flex-wrap:wrap;margin-top:8px;}
.vjk-stat .n{font-family:var(--font-cormorant),serif;font-size:44px;font-weight:600;line-height:1;color:var(--ink);}
.vjk-stat .l{font-size:13px;color:var(--ink2);margin-top:6px;}

/* ── Gallery ───────────────────────────────────────── */
.vjk-gal{columns:3;column-gap:16px;}
.vjk-gal-item{break-inside:avoid;margin-bottom:16px;border-radius:12px;overflow:hidden;background:var(--paper3);
  display:block;position:relative;}
.vjk-gal-item img{width:100%;height:auto;transition:transform .5s,filter .3s;}
.vjk-gal-item:hover img{transform:scale(1.04);}
.vjk-gal-cap{position:absolute;left:0;right:0;bottom:0;padding:14px 16px 12px;color:#fff;font-size:14px;font-weight:600;
  background:linear-gradient(180deg,transparent,rgba(0,0,0,.55));opacity:0;transition:opacity .25s;}
.vjk-gal-item:hover .vjk-gal-cap{opacity:1;}
.vjk-empty{border:1px dashed var(--line);border-radius:16px;padding:48px 24px;text-align:center;color:var(--ink2);background:var(--paper2);}

/* ── Price ─────────────────────────────────────────── */
.vjk-pl-group{margin-top:40px;}
.vjk-pl-group:first-child{margin-top:0;}
.vjk-pl-gtitle{font-family:var(--font-cormorant),serif;font-size:24px;font-weight:600;padding-bottom:12px;border-bottom:2px solid var(--red);display:inline-block;margin-bottom:20px;}
.vjk-pl-rows{display:grid;gap:0;}
.vjk-pl-row{display:grid;grid-template-columns:1fr auto;gap:18px;padding:18px 0;border-bottom:1px solid var(--line);align-items:start;}
.vjk-pl-row .nm{font-weight:600;font-size:16px;}
.vjk-pl-row .ds{color:var(--ink2);font-size:14px;margin-top:5px;white-space:pre-line;}
.vjk-pl-row .pr{font-family:var(--font-cormorant),serif;font-size:24px;font-weight:600;color:var(--red);white-space:nowrap;}
.vjk-note{margin-top:22px;font-size:14px;color:var(--ink2);background:var(--paper2);border-left:3px solid var(--red);padding:14px 18px;border-radius:0 10px 10px 0;}

.vjk-tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
.vjk-tier{border:1px solid var(--line);border-radius:16px;padding:30px 26px;background:var(--paper3);display:flex;flex-direction:column;gap:16px;transition:transform .2s,box-shadow .2s;}
.vjk-tier:hover{transform:translateY(-4px);box-shadow:0 22px 48px -26px rgba(0,0,0,.7);}
.vjk-tier.feat{border-color:var(--red);box-shadow:0 24px 50px -26px rgba(225,29,43,.45);}
.vjk-tier .tn{font-family:var(--font-cormorant),serif;font-size:23px;font-weight:600;}
.vjk-tier .tp{font-size:15px;color:var(--red);font-weight:600;}
.vjk-tier ul{list-style:none;padding:0;margin:0;display:grid;gap:10px;}
.vjk-tier li{position:relative;padding-left:24px;font-size:14.5px;color:var(--ink2);}
.vjk-tier li::before{content:"";position:absolute;left:0;top:8px;width:11px;height:6px;border-left:2px solid var(--red);border-bottom:2px solid var(--red);transform:rotate(-45deg);}
.vjk-tier.feat .badge{position:absolute;top:-11px;left:26px;background:var(--red);color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px;}

/* ── CTA band + Footer ─────────────────────────────── */
.vjk-band{position:relative;overflow:hidden;border:1px solid var(--line);color:#fff;border-radius:22px;padding:56px 48px;text-align:center;
  background:radial-gradient(80% 130% at 50% -20%, rgba(225,29,43,.28), transparent 60%), linear-gradient(150deg,#18181d,#0c0c0e);}
.vjk-band h2{font-family:var(--font-cormorant),serif;font-size:clamp(28px,4vw,42px);font-weight:500;}
.vjk-band p{color:rgba(255,255,255,.7);margin-top:12px;max-width:52ch;margin-inline:auto;}
.vjk-band .vjk-btnrow{justify-content:center;margin-top:28px;}
.vjk-band .vjk-cta-ghost{color:#fff !important;border-color:rgba(255,255,255,.3);}
.vjk-band .vjk-cta-ghost:hover{background:rgba(255,255,255,.08);}

.vjk-footer{background:var(--paper2);border-top:1px solid var(--line);padding:64px 0 40px;}
.vjk-foot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:40px;}
.vjk-foot-grid h4{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink3);margin-bottom:14px;}
.vjk-foot-grid a,.vjk-foot-grid p{color:var(--ink2);font-size:15px;display:block;margin-bottom:9px;transition:color .16s;}
.vjk-foot-grid a:hover{color:var(--red);}
.vjk-foot-social{display:flex;gap:12px;margin-top:16px;}
.vjk-foot-social a{width:40px;height:40px;border:1px solid var(--line);border-radius:50%;display:grid;place-items:center;color:var(--ink2);margin:0;transition:all .18s;}
.vjk-foot-social a:hover{border-color:var(--red);color:var(--red);transform:translateY(-2px);}
.vjk-foot-bottom{margin-top:48px;padding-top:22px;border-top:1px solid var(--line);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;color:var(--ink3);font-size:13px;}

/* ── Service page header ───────────────────────────── */
.vjk-shead{padding:clamp(64px,9vw,110px) 0 clamp(40px,6vw,64px);position:relative;border-bottom:1px solid var(--line);
  background:radial-gradient(50% 80% at 82% 0%, rgba(225,29,43,.14), transparent 65%), linear-gradient(180deg,#141418,var(--paper));}
.vjk-shead .vjk-wrap{max-width:760px;}
.vjk-shead h1{font-family:var(--font-cormorant),serif;font-weight:500;font-size:clamp(38px,6vw,64px);line-height:1.04;letter-spacing:-.015em;margin:14px 0 0;}
.vjk-shead p{margin:20px 0 0;font-size:clamp(16px,1.7vw,19px);color:var(--ink2);}
.vjk-crumb{font-size:13px;color:var(--ink3);}
.vjk-crumb a:hover{color:var(--red);}

/* ── Responsive ────────────────────────────────────── */
@media (max-width:960px){
  .vjk-grid3,.vjk-tiers{grid-template-columns:1fr 1fr;}
  .vjk-about{grid-template-columns:1fr;gap:32px;}
  .vjk-gal{columns:2;}
  .vjk-foot-grid{grid-template-columns:1fr 1fr;}
}
@media (max-width:720px){
  .vjk-nav{display:none;}
  .vjk-burger{display:inline-flex;}
  .vjk-header .vjk-cta.head{display:none;}
  .vjk-mobnav{display:block;border-top:1px solid var(--line);background:#0d0d10;padding:12px 24px 22px;}
  .vjk-mobnav a{display:block;padding:12px 0;font-size:16px;color:var(--ink);border-bottom:1px solid var(--line);}
  .vjk-mobnav .vjk-cta{margin-top:16px;width:100%;justify-content:center;}
  .vjk-grid3,.vjk-tiers{grid-template-columns:1fr;}
  .vjk-section{padding:64px 0;}
  .vjk-band{padding:40px 24px;border-radius:16px;}
  .vjk-pl-row{grid-template-columns:1fr;}
  .vjk-pl-row .pr{font-size:20px;}
  .vjk-foot-grid{grid-template-columns:1fr;}
}
@media (max-width:440px){ .vjk-gal{columns:1;} }
`;
