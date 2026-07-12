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
.vjk-serif{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-weight:600;}
.vjk-wrap{max-width:1180px;margin:0 auto;padding:0 24px;}
.vjk-eyebrow{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--red);font-weight:600;}
.vjk-muted{color:var(--ink2);}

/* ── Header ─────────────────────────────────────────── */
.vjk-header{position:sticky;top:0;z-index:50;background:rgba(10,10,12,.72);
  backdrop-filter:saturate(1.2) blur(14px);border-bottom:1px solid var(--line);}
.vjk-headin{display:flex;align-items:center;justify-content:space-between;height:70px;}
.vjk-logo{display:inline-flex;align-items:center;gap:9px;}
.vjk-logo-text{display:inline-flex;flex-direction:column;line-height:1;}
.vjk-logo-name{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-weight:600;font-size:22px;letter-spacing:.14em;}
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
.vjk-h2{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-weight:700;font-size:clamp(30px,4.4vw,46px);line-height:1.08;letter-spacing:-.01em;}
.vjk-lead{font-size:clamp(16px,1.6vw,19px);color:var(--ink2);max-width:62ch;}
.vjk-center{text-align:center;margin-left:auto;margin-right:auto;}

/* ── Hero ──────────────────────────────────────────── */
.vjk-hero{position:relative;padding:clamp(80px,12vw,150px) 0 clamp(64px,9vw,120px);}
.vjk-hero::before{content:"";position:absolute;inset:0;z-index:0;
  background:
    radial-gradient(55% 60% at 80% 0%, rgba(225,29,43,.16), transparent 68%),
    radial-gradient(40% 50% at 12% 100%, rgba(225,29,43,.06), transparent 70%),
    linear-gradient(180deg,#141418,var(--paper));}
.vjk-hero-in{position:relative;z-index:1;max-width:820px;}
.vjk-hero h1{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-weight:700;
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
.vjk-scard-body h3{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-size:26px;font-weight:600;}
.vjk-scard-body .tag{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--red);font-weight:600;}
.vjk-scard-body p{color:var(--ink2);font-size:15px;flex:1;}
.vjk-scard-link{display:inline-flex;align-items:center;gap:7px;margin-top:6px;font-weight:600;font-size:14px;color:var(--ink);}
.vjk-scard-link .arw{color:var(--red);transition:transform .2s;}
.vjk-scard:hover .vjk-scard-link .arw{transform:translateX(4px);}

/* ── About / stats ─────────────────────────────────── */
.vjk-about{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;}
.vjk-stats{display:flex;gap:40px;flex-wrap:wrap;margin-top:8px;}
.vjk-stat .n{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-size:44px;font-weight:600;line-height:1;color:var(--ink);}
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
.vjk-pl-gtitle{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-size:24px;font-weight:600;padding-bottom:12px;border-bottom:2px solid var(--red);display:inline-block;margin-bottom:20px;}
.vjk-pl-rows{display:grid;gap:0;}
.vjk-pl-row{display:grid;grid-template-columns:1fr auto;gap:18px;padding:18px 0;border-bottom:1px solid var(--line);align-items:start;}
.vjk-pl-row .nm{font-weight:600;font-size:16px;}
.vjk-pl-row .ds{color:var(--ink2);font-size:14px;margin-top:5px;white-space:pre-line;}
.vjk-pl-row .pr{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-size:24px;font-weight:600;color:var(--red);white-space:nowrap;}
.vjk-note{margin-top:22px;font-size:14px;color:var(--ink2);background:var(--paper2);border-left:3px solid var(--red);padding:14px 18px;border-radius:0 10px 10px 0;}

.vjk-tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
.vjk-tier{border:1px solid var(--line);border-radius:16px;padding:30px 26px;background:var(--paper3);display:flex;flex-direction:column;gap:16px;transition:transform .2s,box-shadow .2s;}
.vjk-tier:hover{transform:translateY(-4px);box-shadow:0 22px 48px -26px rgba(0,0,0,.7);}
.vjk-tier.feat{border-color:var(--red);box-shadow:0 24px 50px -26px rgba(225,29,43,.45);}
.vjk-tier .tn{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-size:23px;font-weight:600;}
.vjk-tier .tp{font-size:15px;color:var(--red);font-weight:600;}
.vjk-tier ul{list-style:none;padding:0;margin:0;display:grid;gap:10px;}
.vjk-tier li{position:relative;padding-left:24px;font-size:14.5px;color:var(--ink2);}
.vjk-tier li::before{content:"";position:absolute;left:0;top:8px;width:11px;height:6px;border-left:2px solid var(--red);border-bottom:2px solid var(--red);transform:rotate(-45deg);}
.vjk-tier.feat .badge{position:absolute;top:-11px;left:26px;background:var(--red);color:#fff;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px;}

/* ── CTA band + Footer ─────────────────────────────── */
.vjk-band{position:relative;border:1px solid var(--line);color:#fff;border-radius:22px;padding:56px 48px;text-align:center;
  background:radial-gradient(80% 130% at 50% -20%, rgba(225,29,43,.28), transparent 60%), linear-gradient(150deg,#18181d,#0c0c0e);}
.vjk-band h2{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-size:clamp(28px,4vw,42px);font-weight:700;}
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
.vjk-shead h1{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-weight:700;font-size:clamp(38px,6vw,64px);line-height:1.04;letter-spacing:-.015em;margin:14px 0 0;}
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
  .vjk-header .head{display:none;}
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

/* ── Language switch ───────────────────────────────── */
.vjk-lang{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:700;color:var(--ink3);}
.vjk-lang button{background:none;border:0;color:var(--ink3);cursor:pointer;font-weight:700;font-size:13px;padding:2px 1px;letter-spacing:.04em;}
.vjk-lang button.on{color:var(--ink);}
.vjk-lang button:hover{color:var(--red);}

/* ── Booking picker (home) ─────────────────────────── */
.vjk-bookpick{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.vjk-bookcard{border:1px solid var(--line);border-radius:14px;padding:26px 24px;background:var(--paper3);
  display:flex;flex-direction:column;gap:8px;transition:transform .2s,border-color .2s,box-shadow .2s;}
.vjk-bookcard:hover{transform:translateY(-3px);border-color:rgba(225,29,43,.5);box-shadow:0 20px 44px -26px rgba(0,0,0,.7);}
.vjk-bookcard .bt{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-size:22px;font-weight:600;}
.vjk-bookcard .bd{color:var(--ink2);font-size:14px;flex:1;}
.vjk-bookcard .bk{display:inline-flex;align-items:center;gap:7px;color:var(--red);font-weight:600;font-size:14px;margin-top:4px;}

/* ── Wedding compact package grid ──────────────────── */
.vjk-wrow{margin-top:36px;}
.vjk-wrow:first-child{margin-top:0;}
.vjk-wrow-h{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-size:22px;font-weight:600;margin-bottom:16px;display:flex;align-items:center;gap:12px;}
.vjk-wrow-h::before{content:"";width:26px;height:3px;background:var(--red);border-radius:2px;}
.vjk-wgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;}
.vjk-wcard{border:1px solid var(--line);border-radius:12px;padding:20px 14px;background:var(--paper3);text-align:center;
  display:flex;flex-direction:column;gap:4px;transition:transform .18s,border-color .18s;}
.vjk-wcard:hover{transform:translateY(-3px);border-color:rgba(225,29,43,.5);}
.vjk-wcard .wl{font-weight:600;font-size:15px;}
.vjk-wcard .wn{font-size:12px;color:var(--ink3);}
.vjk-wcard .wp{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-size:21px;font-weight:600;color:var(--red);margin-top:8px;line-height:1.1;}

/* ── Info grid (event types / business services) ───── */
.vjk-info{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
.vjk-infocard{border:1px solid var(--line);border-radius:14px;padding:24px;background:var(--paper3);transition:transform .2s,border-color .2s;}
.vjk-infocard:hover{transform:translateY(-3px);border-color:rgba(225,29,43,.5);}
.vjk-infocard h4{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-size:19px;font-weight:600;margin:0 0 6px;}
.vjk-infocard p{color:var(--ink2);font-size:14px;margin:0;}

/* ── Process steps (numbered = a real sequence) ────── */
.vjk-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;counter-reset:vstep;}
.vjk-step{position:relative;padding-top:52px;}
.vjk-step::before{counter-increment:vstep;content:counter(vstep);position:absolute;top:0;left:0;
  width:38px;height:38px;border-radius:50%;background:var(--red);color:#fff;display:grid;place-items:center;font-weight:700;font-size:16px;}
.vjk-step h4{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-size:18px;font-weight:600;margin:0 0 5px;}
.vjk-step p{color:var(--ink2);font-size:14px;margin:0;}

/* ── Business "why us" strip ───────────────────────── */
.vjk-why{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;}
.vjk-why .n{font-family:var(--font-manrope),var(--font-hanken),system-ui,sans-serif;font-size:20px;font-weight:600;display:flex;align-items:center;gap:10px;}
.vjk-why .n::before{content:"";width:9px;height:9px;background:var(--red);border-radius:50%;}
.vjk-why p{color:var(--ink2);font-size:14px;margin:6px 0 0;}

/* ── Service-header variants ───────────────────────── */
.vjk-shead.event{background:radial-gradient(62% 95% at 82% 0%, rgba(225,29,43,.22), transparent 60%), linear-gradient(180deg,#17110f,var(--paper));}
.vjk-shead.event .vjk-serif{text-transform:none;}
.vjk-shead.business{background:linear-gradient(180deg,#0f1216,var(--paper));border-top:2px solid var(--red);}

@media (max-width:960px){
  .vjk-bookpick,.vjk-info,.vjk-why{grid-template-columns:1fr 1fr;}
  .vjk-wgrid{grid-template-columns:repeat(3,1fr);}
  .vjk-steps{grid-template-columns:1fr 1fr;}
}
@media (max-width:600px){
  .vjk-bookpick,.vjk-info,.vjk-why,.vjk-steps{grid-template-columns:1fr;}
  .vjk-wgrid{grid-template-columns:1fr 1fr;}
}

/* ── Wedding pricing: slider ô gói (đám cưới / đính hôn riêng hàng) ─────── */
.vjk-wgroup{margin-top:44px;}
.vjk-wgroup:first-child{margin-top:0;}
.vjk-wgroup-h{display:flex;align-items:center;gap:12px;font-size:20px;font-weight:700;margin-bottom:18px;}
.vjk-wgroup-h::before{content:"";width:26px;height:3px;background:var(--red);border-radius:2px;}
.vjk-slide{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;}
.vjk-wpkg{border:1px solid var(--line);border-radius:14px;background:var(--paper3);display:flex;flex-direction:column;overflow:hidden;
  transition:transform .18s,border-color .18s;}
.vjk-wpkg:hover{transform:translateY(-3px);border-color:rgba(225,29,43,.5);}
.vjk-wpkg .wp-top{padding:18px 16px 0;}
.vjk-wpkg .wp-name{font-size:15px;font-weight:700;line-height:1.25;}
.vjk-wpkg .wp-note{font-size:12px;color:var(--ink3);margin-top:2px;}
.vjk-wpkg .wp-price{font-size:22px;font-weight:700;color:var(--red);margin-top:10px;line-height:1;}
.vjk-wpkg .wp-book{margin:14px 16px;display:inline-flex;justify-content:center;align-items:center;gap:7px;
  background:var(--red);color:#fff;border-radius:999px;padding:9px 12px;font-size:13px;font-weight:700;transition:background .18s;}
.vjk-wpkg .wp-book:hover{background:var(--red-dark);}
.vjk-wpkg .wp-sep{height:1px;background:var(--line);}
.vjk-wpkg .wp-detail{padding:14px 16px;flex:1;}
.vjk-wpkg .wp-dt{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);font-weight:700;margin-bottom:9px;}
.vjk-wpkg .wp-dl{list-style:none;margin:0;padding:0;display:grid;gap:6px;}
.vjk-wpkg .wp-dl li{position:relative;padding-left:15px;font-size:12.5px;color:var(--ink2);line-height:1.45;}
.vjk-wpkg .wp-dl li::before{content:"";position:absolute;left:0;top:6px;width:6px;height:6px;border-radius:50%;background:var(--red);}
.vjk-wpkg .wp-more{padding:0 16px 16px;}
.vjk-wpkg .wp-more a{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--ink);}
.vjk-wpkg .wp-more a:hover{color:var(--red);}
/* Dưới PC: chuyển sang slide trượt ngang (1 hàng, vuốt qua). */
@media (max-width:1024px){
  .vjk-slide{display:flex;grid-template-columns:none;gap:12px;overflow-x:auto;
    scroll-snap-type:x mandatory;padding-bottom:10px;-webkit-overflow-scrolling:touch;scrollbar-width:thin;}
  .vjk-wpkg{flex:0 0 auto;width:44%;max-width:260px;scroll-snap-align:start;}
}
@media (max-width:600px){
  .vjk-wpkg{width:44%;max-width:220px;}
  .vjk-wpkg .wp-top{padding:14px 12px 0;}
  .vjk-wpkg .wp-name{font-size:13.5px;}
  .vjk-wpkg .wp-price{font-size:19px;}
  .vjk-wpkg .wp-book{margin:12px;padding:8px 10px;font-size:12px;}
  .vjk-wpkg .wp-detail{padding:12px;}
  .vjk-wpkg .wp-dl li{font-size:12px;}
}

/* ── Đánh giá khách hàng ───────────────────────────── */
.vjk-reviews{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
.vjk-review{border:1px solid var(--line);border-radius:14px;padding:24px;background:var(--paper3);display:flex;flex-direction:column;gap:12px;}
.vjk-review .stars{color:var(--red);letter-spacing:2px;font-size:14px;}
.vjk-review .rc{color:var(--ink);font-size:15px;line-height:1.6;flex:1;}
.vjk-review .rn{font-size:13px;color:var(--ink3);font-weight:600;}
@media (max-width:900px){ .vjk-reviews{grid-template-columns:1fr;} }

/* ── Ô liên hệ / góp ý ─────────────────────────────── */
.vjk-fbox{display:grid;grid-template-columns:1fr 1fr;gap:14px;max-width:760px;}
.vjk-fbox .full{grid-column:1 / -1;}
.vjk-fbox input,.vjk-fbox textarea{width:100%;background:var(--paper3);border:1px solid var(--line);border-radius:10px;
  padding:12px 14px;color:var(--ink);font:inherit;font-size:15px;outline:none;transition:border-color .16s;}
.vjk-fbox input:focus,.vjk-fbox textarea:focus{border-color:var(--red);}
.vjk-fbox textarea{min-height:120px;resize:vertical;}
.vjk-fbox input::placeholder,.vjk-fbox textarea::placeholder{color:var(--ink3);}
.vjk-fmsg{font-size:14px;margin-top:4px;}
.vjk-fmsg.ok{color:#54c26b;}
.vjk-fmsg.err{color:var(--red);}
@media (max-width:600px){ .vjk-fbox{grid-template-columns:1fr;} }

/* ── Bộ chọn dịch vụ khi đặt lịch ──────────────────── */
.vjk-bkwrap{position:relative;display:inline-flex;}
.vjk-bkmenu{position:absolute;top:calc(100% + 8px);left:0;z-index:60;min-width:230px;background:#141418;
  border:1px solid var(--line);border-radius:14px;padding:8px;box-shadow:0 24px 50px -18px rgba(0,0,0,.8);}
.vjk-bkmenu.right{left:auto;right:0;}
.vjk-bkmenu .mh{font-size:12px;letter-spacing:.06em;color:var(--ink3);padding:8px 12px 6px;font-weight:600;}
.vjk-bkmenu a{display:block;padding:11px 12px;border-radius:9px;font-size:14px;font-weight:600;color:var(--ink);transition:background .14s;}
.vjk-bkmenu a:hover{background:var(--paper3);color:var(--red);}

/* ── Nút chuyển sáng/tối ───────────────────────────── */
.vjk-theme{background:none;border:0;cursor:pointer;color:var(--ink2);padding:4px;display:inline-flex;align-items:center;transition:color .16s;}
.vjk-theme:hover{color:var(--red);}

/* ── GIAO DIỆN SÁNG (light) ────────────────────────── */
.vjk-root.light{
  --red:#c1121f; --red-dark:#96101a;
  --ink:#1a1a1d; --ink2:rgba(26,26,29,.66); --ink3:rgba(26,26,29,.42);
  --line:rgba(0,0,0,.10); --paper:#ffffff; --paper2:#f6f3ee; --paper3:#ffffff;
}
.vjk-root.light .vjk-header{background:rgba(255,255,255,.82);}
.vjk-root.light .vjk-hero::before{background:
  radial-gradient(55% 60% at 80% 0%, rgba(193,18,31,.09), transparent 68%),
  radial-gradient(40% 50% at 12% 100%, rgba(193,18,31,.04), transparent 70%),
  linear-gradient(180deg,#faf6f0,var(--paper));}
.vjk-root.light .vjk-scard-ph{background:linear-gradient(135deg,#efeae2,#f6f3ee);}
.vjk-root.light .vjk-empty{background:#faf7f2;}
.vjk-root.light .vjk-shead{background:radial-gradient(50% 80% at 82% 0%, rgba(193,18,31,.08), transparent 65%),linear-gradient(180deg,#faf6f0,var(--paper));}
.vjk-root.light .vjk-shead.event{background:radial-gradient(62% 95% at 82% 0%, rgba(193,18,31,.1), transparent 60%),linear-gradient(180deg,#fdf3f0,var(--paper));}
.vjk-root.light .vjk-shead.business{background:linear-gradient(180deg,#eef1f5,var(--paper));}
.vjk-root.light .vjk-band{background:radial-gradient(80% 130% at 50% -20%, rgba(193,18,31,.12), transparent 60%),linear-gradient(150deg,#faf6f0,#f1ebe2);color:var(--ink);}
.vjk-root.light .vjk-band h2{color:var(--ink);}
.vjk-root.light .vjk-band p{color:var(--ink2);}
.vjk-root.light .vjk-band .vjk-cta-ghost{color:var(--ink) !important;border-color:var(--line);}
.vjk-root.light .vjk-band .vjk-cta-ghost:hover{background:rgba(0,0,0,.05);}
.vjk-root.light .vjk-mobnav{background:#fff;}
.vjk-root.light .vjk-bkmenu{background:#fff;box-shadow:0 24px 50px -18px rgba(0,0,0,.22);}
.vjk-root.light .vjk-scard:hover,.vjk-root.light .vjk-wpkg:hover,.vjk-root.light .vjk-tier:hover,
.vjk-root.light .vjk-infocard:hover,.vjk-root.light .vjk-bookcard:hover{box-shadow:0 20px 44px -26px rgba(0,0,0,.22);}
`;
