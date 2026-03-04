"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  fetchMenuItems, updateMenuItem, insertMenuItem, deleteMenuItem, bulkInsertMenuItems,
  fetchOrders, insertOrder, updateOrderStatus, deleteOrder, deleteDoneOrders,
  findCustomerByPhone, upsertCustomer,
  subscribeToOrders, subscribeToMenu,
  fetchSettings, updateSetting,
} from "@/lib/supabase";

const needsPopup = (item) => !!item.popup;
const cleanName = (name) => name.replace(/\s*Half\/Full\s*/gi,"").replace(/\s*Dry\/Gravy\s*/gi,"").trim();
const displayPrice = (item) => {
  if (item.popup === "halfFull") { const p = String(item.price).split("/")[0]; return `₹${p}+`; }
  if (item.popup === "choices") { const min = Math.min(...item.choices.map(c => c.price)); return `₹${min}+`; }
  return `₹${item.price}`;
};
const tagLabel = (item) => {
  if (item.popup === "halfFull") return "Half / Full";
  if (item.popup === "dryGravy") return "Dry / Gravy";
  if (item.popup === "choices") return "Options";
  if (item.popup === "addon") return "+ Add-on";
  return null;
};
const DEFAULT_ADMIN_PASSWORD = "grillin2024";
const STATUS_FLOW = ["New","Preparing","Done"];
const STATUS_BG = {New:"rgba(220,38,38,.14)",Preparing:"rgba(34,197,94,.12)",Done:"rgba(120,113,108,.12)"};
const STATUS_COLOR = {New:"#ef4444",Preparing:"#22c55e",Done:"#78716c"};
const LOGO_SRC = "data:image/png;base64,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";
const fmt = (d) => {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  const diff = Math.floor((new Date()-date)/1000);
  if(diff<60) return "Just now";
  if(diff<3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
};

const S = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#111111;--bg2:#161616;--s:#1a1a1a;--s2:#1f1f1f;--s3:#242424;
  --b:#2a2a2a;--b2:#333333;--b3:#3d3d3d;
  --t:#f5f0eb;--t2:#d4cfc8;--m:#807a73;
  --a:#dc2626;--a2:#b91c1c;--a3:#991b1b;--aGlow:rgba(220,38,38,.25);
  --g:#22c55e;--g2:#16a34a;--r:#ef4444;--amber:#f59e0b;
  --head:'Oswald',sans-serif;--body:'DM Sans',sans-serif;
  --radius:12px;--radius-sm:8px;--radius-lg:16px;
}
html,body{background:var(--bg);color:var(--t);font-family:var(--body);-webkit-font-smoothing:antialiased;line-height:1.5}
body::before{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.03;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");background-size:128px 128px}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--b2);border-radius:3px}::-webkit-scrollbar-thumb:hover{background:var(--b3)}
.nav{background:rgba(26,26,26,.92);border-bottom:1px solid var(--b);padding:0 1.5rem;height:72px;display:flex;align-items:center;position:sticky;top:0;z-index:100;backdrop-filter:blur(12px)}
.nav-logo img{height:56px;width:auto;object-fit:contain;display:block;filter:brightness(1.1)}
.nav-right{display:flex;align-items:center;margin-left:auto;gap:1rem}
.sb{display:flex;align-items:center;gap:.5rem;background:var(--s2);border:1px solid var(--b);border-radius:40px;padding:.5rem 1rem;width:220px;transition:all .2s}
.sb:focus-within{border-color:var(--a);box-shadow:0 0 0 3px var(--aGlow)}
.sb input{background:transparent;border:none;outline:none;color:var(--t);font-family:var(--body);font-size:.85rem;width:100%}
.sb input::placeholder{color:var(--m)}
.layout{display:grid;grid-template-columns:210px 1fr 320px;height:calc(100vh - 72px);overflow:hidden;position:relative}
.sidebar{background:var(--s);border-right:1px solid var(--b);overflow-y:auto;padding:1rem 0}
.slbl{font-family:var(--head);font-size:.65rem;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--m);padding:.75rem 1.25rem .5rem}
.cbtn{display:block;width:100%;text-align:left;padding:.55rem 1.25rem;background:transparent;border:none;border-left:3px solid transparent;font-family:var(--body);font-size:.82rem;color:var(--m);cursor:pointer;transition:all .15s}
.cbtn:hover{color:var(--t);background:rgba(255,255,255,.03)}
.cbtn.active{color:var(--a);border-left-color:var(--a);background:rgba(220,38,38,.06);font-weight:600}
.menu{overflow-y:auto;padding:1.5rem 2rem;background:var(--bg)}
.snote{font-size:.8rem;color:var(--m);margin-bottom:1rem}
.ch{font-family:var(--head);font-size:.8rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:white;background:var(--a);display:inline-block;padding:.4rem 1rem;border-radius:4px;margin:2rem 0 1rem;position:relative}
.ch::after{content:'';position:absolute;left:0;right:0;bottom:-6px;height:1px;background:linear-gradient(90deg,var(--a),transparent 60%)}
.ch:first-child{margin-top:0}
.mlist{display:flex;flex-direction:column;gap:2px;margin-bottom:.5rem}
.mrow{display:flex;align-items:center;gap:1rem;background:var(--s);border:1px solid var(--b);border-radius:var(--radius);padding:.85rem 1rem;cursor:pointer;transition:all .2s ease;position:relative;overflow:hidden}
.mrow::before{content:'';position:absolute;left:0;top:0;bottom:0;width:0;background:var(--a);transition:width .2s ease}
.mrow:hover{border-color:var(--b2);transform:translateY(-1px);box-shadow:0 4px 20px rgba(0,0,0,.3)}
.mrow:hover::before{width:3px}
.mrow.unavail{opacity:.35;cursor:not-allowed;filter:grayscale(.5)}.mrow.unavail:hover{transform:none;box-shadow:none}
.mrow.oos{cursor:not-allowed;opacity:.7}.mrow.oos:hover{transform:none;box-shadow:none}
.oos-badge{font-family:var(--head);font-size:.68rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;background:rgba(220,38,38,.12);color:#f87171;border:1px solid rgba(220,38,38,.2);border-radius:4px;padding:3px 8px}
.re{font-size:1.4rem;flex-shrink:0}.ri{flex:1;min-width:0}
.rn{font-family:var(--body);font-size:.92rem;font-weight:600;color:var(--t);line-height:1.3}
.rd{font-size:.75rem;color:var(--m);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:400}
.rr{display:flex;align-items:center;gap:.6rem;flex-shrink:0}
.rp{font-family:var(--head);font-size:.95rem;font-weight:600;color:var(--a);white-space:nowrap;letter-spacing:.02em}
.radd{width:32px;height:32px;border-radius:var(--radius-sm);background:transparent;border:2px solid var(--a);color:var(--a);font-size:1.1rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s ease;position:relative}
.radd:hover{background:var(--a);color:white;transform:scale(1.1);box-shadow:0 0 16px var(--aGlow)}
.radd:active{transform:scale(.95)}
.rq{background:var(--a);color:white;border-radius:6px;padding:2px 8px;font-family:var(--head);font-size:.72rem;font-weight:700;letter-spacing:.03em;min-width:22px;text-align:center}
.rtag{font-family:var(--head);font-size:.6rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;background:rgba(220,38,38,.1);color:var(--a);border-radius:4px;padding:3px 7px}
.ov{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.8);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem}
.om{background:var(--s);border:1px solid var(--b2);border-radius:var(--radius-lg);padding:2rem;width:360px;max-width:95vw;animation:popIn .25s cubic-bezier(.16,1,.3,1)}
@keyframes popIn{from{transform:scale(.92) translateY(8px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
.om h3{font-family:var(--head);font-size:1.3rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;text-align:center;margin-bottom:.3rem}
.om-desc{text-align:center;color:var(--m);font-size:.8rem;margin-bottom:1.2rem;line-height:1.5}
.olbl{font-family:var(--head);font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--m);margin-bottom:.6rem}
.ochoices{display:flex;gap:.5rem;margin-bottom:1.2rem;flex-wrap:wrap}
.oc{flex:1;min-width:90px;padding:.8rem;border-radius:var(--radius);border:2px solid var(--b);background:var(--s2);cursor:pointer;text-align:center;transition:all .15s}
.oc:hover{border-color:var(--a)}.oc.sel{border-color:var(--a);background:rgba(220,38,38,.08);box-shadow:0 0 0 3px var(--aGlow)}
.oc-lbl{font-family:var(--head);font-size:.92rem;font-weight:600;text-transform:uppercase;letter-spacing:.03em}
.oc-price{font-size:.78rem;color:var(--a);margin-top:4px;font-weight:600}
.addon-row{display:flex;align-items:center;justify-content:space-between;padding:.7rem .85rem;border:1px solid var(--b);border-radius:var(--radius-sm);margin-bottom:.4rem;cursor:pointer;transition:all .15s}
.addon-row.sel{border-color:var(--a);background:rgba(220,38,38,.06)}
.addon-row-left{display:flex;align-items:center;gap:.5rem;font-size:.88rem;font-weight:500}
.addon-check{width:20px;height:20px;border-radius:5px;border:2px solid var(--b2);display:flex;align-items:center;justify-content:center;font-size:.7rem;transition:all .15s}
.addon-check.checked{background:var(--a);border-color:var(--a);color:white}
.addon-price{font-size:.8rem;color:var(--a);font-weight:600}
.oacts{display:flex;gap:.5rem;margin-top:1.2rem}
.cpanel{background:var(--s);border-left:1px solid var(--b);display:flex;flex-direction:column;overflow:hidden}
.chead{padding:1.25rem;border-bottom:1px solid var(--b);background:linear-gradient(180deg,rgba(220,38,38,.06),transparent)}
.chead h2{font-family:var(--head);font-size:1.15rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.chead p{font-size:.76rem;color:var(--m);margin-top:3px}
.cbody{flex:1;overflow-y:auto;padding:.75rem 1rem}
.cempty{text-align:center;padding:3rem 1rem;color:var(--m);font-size:.85rem}
.cempty-icon{font-size:2.5rem;margin-bottom:.6rem;opacity:.5}
.ci{display:flex;align-items:flex-start;gap:.6rem;padding:.7rem 0;border-bottom:1px solid rgba(255,255,255,.04);animation:cartSlideIn .25s ease}
@keyframes cartSlideIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
.ci-i{flex:1;min-width:0}.ci-n{font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ci-v{font-size:.68rem;color:var(--a);margin-top:2px;font-weight:500}.ci-p{font-size:.72rem;color:var(--m);margin-top:1px}
.ci-note{font-size:.68rem;color:var(--m);font-style:italic;margin-top:2px}
.ci-note-input{width:100%;padding:.3rem .5rem;background:var(--s2);border:1px solid var(--b);border-radius:5px;color:var(--t);font-family:var(--body);font-size:.68rem;outline:none;margin-top:4px;transition:border .15s}
.ci-note-input:focus{border-color:var(--a)}.ci-note-input::placeholder{color:var(--m)}
.qc{display:flex;align-items:center;gap:0;border:1px solid var(--a);border-radius:var(--radius-sm);overflow:hidden;background:var(--s2);flex-shrink:0}
.qb{width:28px;height:28px;border:none;background:transparent;color:var(--a);font-size:.9rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .1s}
.qb:hover{background:var(--a);color:white}.qb:active{transform:scale(.9)}
.qn{font-family:var(--head);font-size:.82rem;font-weight:700;width:22px;text-align:center;color:var(--t)}
.cfoot{padding:1rem;border-top:1px solid var(--b);background:linear-gradient(0deg,rgba(220,38,38,.04),transparent)}
.ctotal{display:flex;justify-content:space-between;font-weight:600;font-size:.9rem;margin-bottom:.4rem}
.discount-line{display:flex;justify-content:space-between;font-size:.82rem;color:var(--g);margin-bottom:.4rem}
.chkbtn{width:100%;padding:.8rem;background:linear-gradient(135deg,var(--a),var(--a2));color:white;border:none;border-radius:var(--radius-sm);font-family:var(--head);font-size:.92rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;cursor:pointer;transition:all .15s;position:relative;overflow:hidden}
.chkbtn:hover:not(:disabled){background:linear-gradient(135deg,var(--a2),var(--a3));box-shadow:0 4px 20px var(--aGlow);transform:translateY(-1px)}
.chkbtn:active:not(:disabled){transform:translateY(0)}.chkbtn:disabled{opacity:.3;cursor:not-allowed}
.fab{display:none;position:fixed;bottom:1.2rem;left:50%;transform:translateX(-50%);z-index:150;background:linear-gradient(135deg,var(--a),var(--a2));color:white;border:none;border-radius:40px;padding:.75rem 1.8rem;font-family:var(--head);font-size:.9rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;align-items:center;gap:.6rem;box-shadow:0 6px 28px rgba(220,38,38,.4);animation:fabPulse 2s infinite}
@keyframes fabPulse{0%,100%{box-shadow:0 6px 28px rgba(220,38,38,.4)}50%{box-shadow:0 6px 36px rgba(220,38,38,.6)}}
.fabbadge{background:white;color:var(--a);border-radius:10px;padding:2px 8px;font-size:.7rem;font-weight:700}
.access-footer{display:block;width:100%;text-align:center;padding:1.2rem;background:transparent;border:none;border-top:1px solid var(--b);color:var(--m);font-family:var(--body);font-size:.72rem;cursor:pointer;margin-top:2rem;transition:color .15s}
.access-footer:hover{color:var(--t)}
.contact-footer{border-top:1px solid var(--b);padding:1.5rem;margin-top:2rem;text-align:center}
.contact-footer a{color:var(--a);text-decoration:none;font-size:.82rem;font-weight:500}.contact-footer a:hover{text-decoration:underline}
.contact-row{display:flex;align-items:center;justify-content:center;gap:.5rem;margin-bottom:.5rem;font-size:.82rem;color:var(--m)}
.contact-row a{color:var(--a);text-decoration:none}.contact-row a:hover{text-decoration:underline}
.dov{position:fixed;inset:0;z-index:160;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .2s}.dov.open{opacity:1;pointer-events:all}
.drawer{position:fixed;bottom:0;left:0;right:0;z-index:170;background:var(--s);border-radius:20px 20px 0 0;max-height:85vh;display:flex;flex-direction:column;transform:translateY(100%);transition:transform .3s cubic-bezier(.16,1,.3,1)}.drawer.open{transform:translateY(0)}
.dhandle{width:36px;height:4px;background:var(--b2);border-radius:2px;margin:10px auto 0;flex-shrink:0}
.dclose{position:absolute;top:.7rem;right:1rem;background:var(--s2);border:none;border-radius:50%;width:30px;height:30px;color:var(--m);cursor:pointer;font-size:.85rem;transition:all .15s}
.dclose:hover{background:var(--b);color:var(--t)}
.mov{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem}
.modal{background:var(--s);border:1px solid var(--b);border-radius:var(--radius-lg);padding:2rem;width:440px;max-width:95vw;animation:slideUp .25s cubic-bezier(.16,1,.3,1)}
@keyframes slideUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal h2{font-family:var(--head);font-size:1.4rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:1.2rem}
.del-warn{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);color:var(--amber);border-radius:var(--radius-sm);padding:.65rem .9rem;font-size:.8rem;margin-bottom:.75rem}
.addr-block{background:var(--s2);border:1px solid var(--b);border-radius:var(--radius);padding:1rem 1.1rem;margin-bottom:.75rem}
.addr-block-title{font-family:var(--head);font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--m);margin-bottom:.7rem;display:flex;align-items:center;gap:.5rem}
.autofill-tag{background:rgba(34,197,94,.12);color:var(--g);border-radius:4px;padding:2px 7px;font-size:.62rem;font-weight:600}
.fg{margin-bottom:.75rem}
.fl{display:block;font-family:var(--head);font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--m);margin-bottom:.35rem}
.fi{width:100%;padding:.6rem .85rem;background:var(--s2);border:1px solid var(--b);border-radius:var(--radius-sm);color:var(--t);font-family:var(--body);font-size:.85rem;outline:none;transition:all .15s}
.fi:focus{border-color:var(--a);box-shadow:0 0 0 3px var(--aGlow)}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}
.osb{background:var(--s2);border-radius:var(--radius-sm);padding:.85rem;margin:.75rem 0;max-height:170px;overflow-y:auto}
.osi{display:flex;justify-content:space-between;font-size:.8rem;color:var(--m);padding:.2rem 0}
.ost{display:flex;justify-content:space-between;font-weight:700;font-size:.9rem;border-top:1px solid var(--b);padding-top:.5rem;margin-top:.35rem}
.macts{display:flex;gap:.65rem;margin-top:1.2rem}
.sbox{text-align:center}.sicon{font-size:3rem;margin-bottom:.75rem}
.sbox h2{font-family:var(--head);font-size:1.4rem;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.4rem}
.sbox p{color:var(--m);font-size:.85rem;margin-bottom:1.4rem;line-height:1.6}
.otag{font-family:var(--head);font-size:1rem;color:var(--a);margin-bottom:1rem;letter-spacing:.04em}
.bg{flex:1;padding:.65rem;border:1px solid var(--b);background:transparent;border-radius:var(--radius-sm);color:var(--t);font-family:var(--body);cursor:pointer;font-size:.85rem;transition:all .15s}
.bg:hover{background:var(--s2);border-color:var(--b2)}
.ba{flex:2;padding:.65rem;background:var(--a);color:white;border:none;border-radius:var(--radius-sm);cursor:pointer;font-family:var(--head);font-size:.88rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;transition:all .15s}
.ba:hover{background:var(--a2);box-shadow:0 4px 16px var(--aGlow)}.ba:disabled{opacity:.35;cursor:not-allowed}
.alog{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:1rem}
.abox{background:var(--s);border:1px solid var(--b);border-radius:var(--radius-lg);padding:2.5rem;width:380px;max-width:95vw;text-align:center}
.abox h2{font-family:var(--head);font-size:1.6rem;text-transform:uppercase;letter-spacing:.06em}
.abox p{color:var(--m);font-size:.85rem;margin-bottom:1.5rem;margin-top:.4rem}
.aerr{background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.25);color:#f87171;border-radius:var(--radius-sm);padding:.5rem;font-size:.8rem;margin-bottom:.75rem}
.adm{min-height:100vh;background:var(--bg)}
.adm-nav{background:var(--s);border-bottom:1px solid var(--b);padding:0 2rem;height:64px;display:flex;align-items:center;justify-content:space-between}
.adm-nav img{height:44px;width:auto}
.adm-inner{padding:2rem;max-width:1240px;margin:0 auto}
.atop{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:.75rem}
.atop h1{font-family:var(--head);font-size:1.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.atabs{display:flex;border:1px solid var(--b);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:1.5rem;background:var(--s)}
.atab{padding:.5rem 1.2rem;background:transparent;border:none;font-family:var(--head);font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--m);cursor:pointer;position:relative;transition:all .15s}
.atab.active{background:var(--a);color:white}.atab:hover:not(.active){background:var(--s2);color:var(--t)}
.nbadge{position:absolute;top:4px;right:4px;background:var(--r);color:white;border-radius:8px;font-size:.55rem;padding:0 5px;min-width:14px;text-align:center;font-family:var(--body)}
.astats{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem}
.asc{background:var(--s);border:1px solid var(--b);border-radius:var(--radius);padding:1.25rem;transition:all .15s}
.asc:hover{border-color:var(--b2);transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,.2)}
.asl{font-family:var(--head);font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--m);margin-bottom:.4rem}
.asv{font-family:var(--head);font-size:2rem;font-weight:700}
.ord-filter{display:flex;gap:.5rem;margin-bottom:1.25rem;flex-wrap:wrap}
.ord-fbtn{padding:.4rem 1rem;border-radius:20px;border:1px solid var(--b);background:transparent;color:var(--m);font-family:var(--head);font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;cursor:pointer;transition:all .15s}
.ord-fbtn:hover{border-color:var(--a);color:var(--t)}.ord-fbtn.active{background:var(--a);border-color:var(--a);color:white}
.ord-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}
.ord-card{background:var(--s);border:1px solid var(--b);border-radius:var(--radius);overflow:hidden;animation:slideUp .2s ease;transition:all .15s}
.ord-card:hover{border-color:var(--b2);box-shadow:0 4px 20px rgba(0,0,0,.2)}
.ord-card.status-New{border-left:4px solid var(--r)}.ord-card.status-Preparing{border-left:4px solid var(--g)}.ord-card.status-Done{border-left:4px solid var(--m);opacity:.65}
.ord-card-head{padding:1rem 1.1rem;display:flex;align-items:flex-start;justify-content:space-between}
.ord-num{font-family:var(--head);font-size:1.05rem;font-weight:700}
.ord-customer{font-size:.84rem;font-weight:500;margin-top:3px}.ord-time{font-size:.72rem;color:var(--m);margin-top:3px}
.ord-type{font-family:var(--head);font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;background:var(--s2);border:1px solid var(--b2);border-radius:4px;padding:3px 7px}
.ord-status-pill{font-family:var(--head);font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-radius:20px;padding:4px 12px}
.ord-items{padding:.85rem 1.1rem}
.ord-item-row{display:flex;justify-content:space-between;align-items:baseline;font-size:.82rem;padding:.22rem 0}
.ord-item-name{color:var(--m);flex:1}.ord-item-var{font-size:.7rem;color:var(--a);margin-left:4px;font-weight:500}
.ord-item-price{font-weight:600;white-space:nowrap;margin-left:.5rem}
.ord-notes{font-size:.75rem;color:var(--m);font-style:italic;padding:.55rem 1.1rem;border-top:1px solid var(--b)}
.ord-foot{padding:.85rem 1.1rem;border-top:1px solid var(--b);display:flex;align-items:center;justify-content:space-between}
.ord-total{font-family:var(--head);font-weight:700;font-size:1rem}.ord-actions{display:flex;gap:.4rem}
.ord-next-btn{padding:.4rem .9rem;border-radius:var(--radius-sm);border:none;cursor:pointer;font-family:var(--head);font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:white;transition:all .15s}
.ord-next-btn:hover{opacity:.85;transform:translateY(-1px)}
.ord-del-btn{padding:.4rem .65rem;border-radius:var(--radius-sm);border:1px solid rgba(220,38,38,.25);background:transparent;color:#f87171;cursor:pointer;font-size:.75rem;transition:all .15s}
.ord-del-btn:hover{background:rgba(220,38,38,.08)}
.ord-empty{text-align:center;padding:4rem 2rem;color:var(--m)}.ord-empty-icon{font-size:3rem;margin-bottom:.75rem;opacity:.5}.ord-empty p{font-size:.88rem}
.tw{background:var(--s);border:1px solid var(--b);border-radius:var(--radius);overflow:hidden}
.thb{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--b);flex-wrap:wrap;gap:.5rem}
.thb h2{font-family:var(--head);font-size:1.1rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.tfs{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
.fsel{background:var(--s2);border:1px solid var(--b);color:var(--t);border-radius:6px;padding:.35rem .6rem;font-family:var(--body);font-size:.78rem}
.abtn{padding:.48rem 1rem;background:var(--a);color:white;border:none;border-radius:var(--radius-sm);cursor:pointer;font-family:var(--head);font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;transition:all .15s}
.abtn:hover{background:var(--a2);box-shadow:0 4px 16px var(--aGlow)}
.tscr{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{padding:.7rem 1rem;text-align:left;font-family:var(--head);font-size:.65rem;font-weight:600;color:var(--m);letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid var(--b);background:var(--s2)}
td{padding:.7rem 1rem;font-size:.83rem;border-bottom:1px solid rgba(255,255,255,.03);color:var(--t);vertical-align:middle}
tr:last-child td{border-bottom:none}tr:hover td{background:rgba(255,255,255,.015)}
.bdg{display:inline-block;padding:3px 10px;border-radius:10px;font-family:var(--head);font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.bon{background:rgba(34,197,94,.12);color:#4ade80}.boff{background:rgba(220,38,38,.12);color:#f87171}.boos{background:rgba(245,158,11,.12);color:#fbbf24}
.ttog{padding:.28rem .65rem;border-radius:6px;border:1px solid var(--b);background:transparent;color:var(--m);cursor:pointer;font-size:.72rem;font-family:var(--body);margin-right:.3rem;transition:all .15s}
.ttog:hover{background:var(--s2);color:var(--t)}.toos{border-color:rgba(245,158,11,.3);color:var(--amber)}.toos:hover{background:rgba(245,158,11,.08)}
.tedit{padding:.28rem .65rem;border-radius:6px;border:1px solid var(--b2);background:transparent;color:var(--m);cursor:pointer;font-size:.72rem;font-family:var(--body);margin-right:.3rem;transition:all .15s}
.tedit:hover{background:var(--s2);color:var(--t)}
.tdel{padding:.28rem .6rem;border-radius:6px;border:1px solid rgba(220,38,38,.25);background:transparent;color:#f87171;cursor:pointer;font-size:.72rem;font-family:var(--body);transition:all .15s}
.tdel:hover{background:rgba(220,38,38,.08)}
.lout{padding:.42rem 1rem;background:transparent;border:1px solid var(--b);border-radius:var(--radius-sm);color:var(--m);cursor:pointer;font-family:var(--head);font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;transition:all .15s}
.lout:hover{border-color:var(--r);color:var(--r)}
.bulk{background:var(--s);border:1px solid var(--b);border-radius:var(--radius);padding:1.5rem}
.bulk h2{font-family:var(--head);font-size:1.2rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.4rem}
.bulk p{color:var(--m);font-size:.82rem;margin-bottom:1rem;line-height:1.6}
.bta{width:100%;height:160px;padding:.85rem;background:var(--s2);border:1px solid var(--b);border-radius:var(--radius-sm);color:var(--t);font-family:var(--body);font-size:.82rem;resize:vertical;outline:none;transition:border .15s}
.bta:focus{border-color:var(--a);box-shadow:0 0 0 3px var(--aGlow)}
.bprev{margin-top:1rem;background:var(--s2);border-radius:var(--radius-sm);padding:1rem;font-size:.8rem}
.bpi{padding:.3rem 0;border-bottom:1px solid var(--b);display:flex;gap:.9rem}.bpi:last-child{border-bottom:none}
.pok{color:#4ade80}.perr{color:#f87171}
.bacts{display:flex;gap:.65rem;margin-top:1rem;align-items:center}.bnote{font-size:.78rem;color:var(--m)}
.loading-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--m);font-family:var(--head);font-size:1rem;text-transform:uppercase;letter-spacing:.15em}
.setting-row{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.1rem;border:1px solid var(--b);border-radius:var(--radius);margin-bottom:.65rem;background:var(--s);transition:all .15s}
.setting-row:hover{border-color:var(--b2)}
.setting-label{font-size:.88rem;font-weight:600}.setting-desc{font-size:.72rem;color:var(--m);margin-top:3px}
.toggle-switch{position:relative;width:46px;height:26px;border-radius:13px;cursor:pointer;transition:all .2s}
.toggle-switch.on{background:var(--a)}.toggle-switch.off{background:var(--b2)}
.toggle-dot{position:absolute;top:3px;width:20px;height:20px;border-radius:50%;background:white;transition:all .2s;box-shadow:0 1px 4px rgba(0,0,0,.3)}
.toggle-switch.on .toggle-dot{left:23px}.toggle-switch.off .toggle-dot{left:3px}
@media(max-width:900px){.layout{grid-template-columns:1fr;height:auto;overflow:visible}.sidebar{display:none}.cpanel{display:none!important}.fab{display:flex!important}.menu{padding:1rem 1rem 6rem}.astats{grid-template-columns:1fr 1fr}.ord-grid{grid-template-columns:1fr}}
@media(max-width:580px){.nav{padding:0 1rem;height:64px}.nav-logo img{height:48px}.sb{width:140px;padding:.4rem .8rem}.adm-inner{padding:1rem}.fr{grid-template-columns:1fr}.modal{padding:1.5rem 1.2rem}.ch{font-size:.72rem;padding:.35rem .85rem}}
`;

function OptionPopup({ item, onConfirm, onClose }) {
  const [sel, setSel] = useState(null);
  const [addons, setAddons] = useState({});
  const basePrice = parseFloat(item.price) || 0;
  const getChoices = () => {
    if (item.popup === "halfFull") { const [lo,hi] = item.price.split("/").map(Number); return [{label:"Half",price:lo},{label:"Full",price:hi}]; }
    if (item.popup === "dryGravy") return [{label:"Dry",price:basePrice},{label:"Gravy",price:basePrice}];
    if (item.popup === "choices") return item.choices;
    return [];
  };
  const choices = getChoices();
  const isAddon = item.popup === "addon";
  const toggleAddon = (label) => setAddons(prev => ({...prev,[label]:!prev[label]}));
  const handleConfirm = () => {
    if (isAddon) {
      const s = item.addons.filter(a => addons[a.label]);
      const extra = s.reduce((sum,a) => sum+a.price, 0);
      onConfirm(item, { val: s.length ? s.map(a=>a.label).join(", ") : null, num: basePrice + extra });
    } else {
      const choice = choices.find(c => c.label === sel);
      onConfirm(item, { val: choice.label, num: choice.price });
    }
  };
  const promptLabel = {halfFull:"Choose portion size",dryGravy:"Choose style",choices:"Choose an option",addon:"Select add-ons"}[item.popup];
  return (
    <div className="ov" onClick={onClose}>
      <div className="om" onClick={e=>e.stopPropagation()}>
        <h3>{cleanName(item.name)}</h3>
        {item.description && <p className="om-desc">{item.description}</p>}
        <div className="olbl">{promptLabel}</div>
        {isAddon ? (
          <>{item.addons.map(a=>(
            <div key={a.label} className={`addon-row ${addons[a.label]?"sel":""}`} onClick={()=>toggleAddon(a.label)}>
              <div className="addon-row-left"><div className={`addon-check ${addons[a.label]?"checked":""}`}>{addons[a.label]?"✓":""}</div>{a.label}</div>
              <span className="addon-price">+₹{a.price}</span>
            </div>
          ))}<p style={{fontSize:".74rem",color:"var(--m)",marginTop:".5rem"}}>Base ₹{basePrice}{Object.values(addons).some(Boolean)?` + ₹${item.addons.filter(a=>addons[a.label]).reduce((s,a)=>s+a.price,0)}`:""}</p></>
        ) : (
          <div className="ochoices">{choices.map(c=>(
            <div key={c.label} className={`oc ${sel===c.label?"sel":""}`} onClick={()=>setSel(c.label)}>
              <div className="oc-lbl">{c.label}</div><div className="oc-price">₹{c.price}</div>
            </div>
          ))}</div>
        )}
        <div className="oacts"><button className="bg" onClick={onClose}>Cancel</button><button className="ba" disabled={!isAddon&&!sel} onClick={handleConfirm}>Add to Order</button></div>
      </div>
    </div>
  );
}

function CustomerView({ menuItems, search, setSearch, onOrderPlaced, orders, onAccessClick, settings }) {
  const [activeCat, setActiveCat] = useState("All");
  const [cart, setCart] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [popupItem, setPopupItem] = useState(null);
  const [form, setForm] = useState({phone:"",name:"",type:"Delivery",addr:{house:"",apartment:"",street:"",place:"",landmark:""},notes:""});
  const [orderNum] = useState(() => Math.floor(Math.random()*9000)+1000);
  const [autoFilled, setAutoFilled] = useState(false);
  const DELIVERY_MIN = settings.deliveryMinEnabled ? 300 : 0;
  const GST_RATE = 0.05;
  const setAddr = (field,val) => setForm(f=>({...f,addr:{...f.addr,[field]:val}}));
  const addrComplete = form.addr.house.trim() && form.addr.street.trim() && form.addr.place.trim();
  const fullAddress = (addr) => [addr.house,addr.apartment,addr.street,addr.place,addr.landmark].filter(Boolean).join(", ");
  const cats = useMemo(() => [...new Set(menuItems.map(i=>i.category))], [menuItems]);
  const handlePhoneChange = async (val) => {
    setForm(f=>({...f,phone:val})); setAutoFilled(false);
    if (val.length >= 10) {
      const cust = await findCustomerByPhone(val);
      if (cust) {
        setForm(f=>({...f,phone:val,name:cust.name||f.name,addr:{house:cust.house||"",apartment:cust.apartment||"",street:cust.street||"",place:cust.place||"",landmark:cust.landmark||""}}));
        setAutoFilled(true);
      }
    }
  };
  const filtered = useMemo(() => {
    if (search.trim()) { const q=search.toLowerCase(); return menuItems.filter(i=>i.name.toLowerCase().includes(q)||i.category.toLowerCase().includes(q)); }
    return activeCat==="All" ? menuItems : menuItems.filter(i=>i.category===activeCat);
  }, [menuItems,search,activeCat]);
  const grouped = useMemo(() => filtered.reduce((acc,item)=>{acc[item.category]=acc[item.category]||[];acc[item.category].push(item);return acc;},{}), [filtered]);
  const handleClick = (item) => { if(!item.available||item.outOfStock)return; if(needsPopup(item))setPopupItem(item); else addItem(item,{val:null,num:parseFloat(item.price)||0}); };
  const cartKey = (item,variant) => `${item.id}__${variant||""}`;
  const addItem = (item,choice) => { const key=cartKey(item,choice.val); setCart(prev=>{const ex=prev.find(c=>c.key===key); return ex?prev.map(c=>c.key===key?{...c,qty:c.qty+1}:c):[...prev,{...item,key,variant:choice.val,unitPrice:choice.num,qty:1,itemNote:""}];}); };
  const confirmOption = (item,choice) => { addItem(item,choice); setPopupItem(null); };
  const changeQty = (key,d) => setCart(prev=>prev.map(c=>c.key===key?{...c,qty:c.qty+d}:c).filter(c=>c.qty>0));
  const updateItemNote = (key,note) => setCart(prev=>prev.map(c=>c.key===key?{...c,itemNote:note}:c));
  const itemQty = (item) => cart.filter(c=>c.id===item.id).reduce((s,c)=>s+c.qty,0);
  const subtotal = cart.reduce((s,c)=>s+c.unitPrice*c.qty,0);
  const discountPct = settings.offerEnabled ? (settings.offerPercent || 0) : 0;
  const discountAmt = subtotal * (discountPct / 100);
  const afterDiscount = subtotal - discountAmt;
  const gstAmt = afterDiscount * GST_RATE;
  const total = afterDiscount + gstAmt;
  const totalItems = cart.reduce((s,c)=>s+c.qty,0);
  const deliveryShort = form.type==="Delivery" && subtotal<DELIVERY_MIN;
  const canPlace = form.phone.trim()&&form.name.trim()&&!deliveryShort&&(form.type==="Pickup"||addrComplete);
  const placeOrder = async () => {
    const order = {id:Date.now(),num:orderNum,customer:form.name,phone:form.phone,
      address:form.type==="Delivery"?fullAddress(form.addr):null,addr:form.type==="Delivery"?form.addr:null,
      type:form.type,notes:form.addr.landmark||"",items:cart.map(c=>({name:cleanName(c.name),variant:c.variant,qty:c.qty,unitPrice:c.unitPrice,itemNote:c.itemNote||""})),
      total,status:"New",placedAt:new Date()};
    await insertOrder(order);
    await upsertCustomer({phone:form.phone,name:form.name,...(form.type==="Delivery"?form.addr:{})});
    onOrderPlaced(order); setOrderPlaced(true); setCart([]);
  };
  const reset = () => { setOrderPlaced(false);setShowCheckout(false);setForm({phone:"",name:"",type:"Delivery",addr:{house:"",apartment:"",street:"",place:"",landmark:""},notes:""});setAutoFilled(false); };
  const CartBody = () => (<>
    <div className="chead"><h2>Your Order</h2><p>{totalItems===0?"No items yet":`${totalItems} item${totalItems>1?"s":""}`}</p></div>
    <div className="cbody">{cart.length===0?<div className="cempty"><div className="cempty-icon">🍖</div><p>Add items from the menu<br/><span style={{fontSize:".75rem",opacity:.6}}>Your selections will appear here</span></p></div>
      :cart.map(item=>(<div key={item.key} className="ci"><div className="ci-i"><div className="ci-n">{cleanName(item.name)}</div>{item.variant&&<div className="ci-v">{item.variant}</div>}<div className="ci-p">₹{item.unitPrice} × {item.qty} = ₹{(item.unitPrice*item.qty).toFixed(0)}</div>
      <input className="ci-note-input" placeholder="Special instructions…" value={item.itemNote||""} onChange={e=>updateItemNote(item.key,e.target.value)} onClick={e=>e.stopPropagation()}/></div>
      <div className="qc"><button className="qb" onClick={()=>changeQty(item.key,-1)}>−</button><span className="qn">{item.qty}</span><button className="qb" onClick={()=>changeQty(item.key,1)}>+</button></div></div>))}</div>
    {cart.length>0&&<div className="cfoot">
      <div className="ctotal" style={{fontSize:".82rem",fontWeight:500,opacity:.7}}><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
      {discountPct>0&&<div className="discount-line"><span>Discount ({discountPct}%)</span><span>-₹{discountAmt.toFixed(0)}</span></div>}
      <div className="ctotal" style={{fontSize:".78rem",color:"var(--m)",fontWeight:400}}><span>GST (5%)</span><span>₹{gstAmt.toFixed(0)}</span></div>
      <div className="ctotal" style={{borderTop:"1px solid var(--b)",paddingTop:".55rem",fontSize:"1rem"}}><span>Total</span><span style={{color:"var(--a)"}}>₹{total.toFixed(0)}</span></div>
      <button className="chkbtn" onClick={()=>{setDrawerOpen(false);setShowCheckout(true);}}>Proceed to Checkout →</button>
    </div>}
  </>);
  return (<>
    <nav className="nav"><div className="nav-logo"><img src={LOGO_SRC} alt="Grillin'"/></div><div className="nav-right"><div className="sb"><span style={{color:"var(--m)",fontSize:".9rem"}}>🔍</span><input placeholder="Search menu…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div></nav>
    <div className="layout">
      <div className="sidebar"><div className="slbl">Menu</div><button className={`cbtn ${activeCat==="All"&&!search?"active":""}`} onClick={()=>{setActiveCat("All");setSearch("");}}>All Items</button>
        {cats.map(cat=><button key={cat} className={`cbtn ${activeCat===cat&&!search?"active":""}`} onClick={()=>{setActiveCat(cat);setSearch("");}}>{cat}</button>)}</div>
      <div className="menu">
        {search&&<div className="snote">{filtered.length} result{filtered.length!==1?"s":""} for &ldquo;{search}&rdquo;</div>}
        {Object.entries(grouped).map(([cat,items])=>(<div key={cat}><div className="ch">{cat}</div><div className="mlist">
          {items.map(item=>{const qty=itemQty(item);const tag=tagLabel(item);return(
            <div key={item.id} className={`mrow ${!item.available?"unavail":item.outOfStock?"oos":""}`} onClick={()=>handleClick(item)}>
              <div className="ri"><div className="rn">{cleanName(item.name)}</div>{item.description&&<div className="rd">{item.description}</div>}</div>
              <div className="rr">{tag&&!item.outOfStock&&<span className="rtag">{tag}</span>}{item.outOfStock?<span className="oos-badge">Out of Stock</span>:<>{qty>0&&<span className="rq">{qty}</span>}<span className="rp">{displayPrice(item)}</span>{item.available&&<button className="radd" onClick={e=>{e.stopPropagation();handleClick(item);}}>+</button>}</>}</div>
            </div>);})}</div></div>))}
        {filtered.length===0&&<div style={{textAlign:"center",padding:"3rem",color:"var(--m)"}}>No items found</div>}
        <div className="contact-footer">
          <div className="contact-row">📞 <a href="tel:9901538782">9901538782</a> · <a href="tel:7259020939">7259020939</a></div>
          <div className="contact-row">📍 <a href="https://maps.app.goo.gl/dvy2KWqhZ542ABgE8?g_st=ic" target="_blank" rel="noopener noreferrer">Vignan Nagar Main Rd, Bangalore</a></div>
          <button className="access-footer" style={{marginTop:".75rem",borderTop:"none",padding:".5rem"}} onClick={onAccessClick}>Restaurant Access</button>
        </div>
      </div>
      <div className="cpanel"><CartBody/></div>
    </div>
    {cart.length>0&&<button className="fab" style={{display:"flex"}} onClick={()=>setDrawerOpen(true)}>🛒 View Order <span className="fabbadge">{totalItems}</span> · ₹{total.toFixed(0)}</button>}
    <div className={`dov ${drawerOpen?"open":""}`} onClick={()=>setDrawerOpen(false)}/><div className={`drawer ${drawerOpen?"open":""}`}><div className="dhandle"/><button className="dclose" onClick={()=>setDrawerOpen(false)}>✕</button><div style={{display:"flex",flexDirection:"column",overflow:"hidden",flex:1}}><CartBody/></div></div>
    {popupItem&&<OptionPopup item={popupItem} onConfirm={confirmOption} onClose={()=>setPopupItem(null)}/>}
    {showCheckout&&!orderPlaced&&(<div className="mov"><div className="modal" style={{maxHeight:"90vh",overflowY:"auto"}}>
      <h2>Complete Your Order</h2>
      <div className="fg"><label className="fl">Mobile Number *</label><input className="fi" value={form.phone} onChange={e=>handlePhoneChange(e.target.value)} placeholder="Enter mobile number"/></div>
      <div className="fg"><label className="fl">Your Name *</label><input className="fi" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></div>
      <div className="fg"><label className="fl">Order Type</label><div style={{display:"flex",gap:".5rem"}}>{["Delivery","Pickup"].map(t=>(<div key={t} onClick={()=>setForm({...form,type:t})} style={{flex:1,padding:".65rem",borderRadius:"var(--radius-sm)",border:`2px solid ${form.type===t?"var(--a)":"var(--b)"}`,background:form.type===t?"rgba(220,38,38,.08)":"var(--s2)",cursor:"pointer",textAlign:"center",fontFamily:"var(--head)",fontSize:".85rem",fontWeight:form.type===t?700:500,textTransform:"uppercase",letterSpacing:".04em"}}>{t==="Delivery"?"🛵 Delivery":"🏃 Pickup"}</div>))}</div></div>
      {form.type==="Delivery"&&<div className="addr-block"><div className="addr-block-title">🏠 Delivery Address *{autoFilled&&<span className="autofill-tag">✓ Auto-filled</span>}</div>
        <div className="fg"><label className="fl">House / Flat No. *</label><input className="fi" value={form.addr.house} onChange={e=>setAddr("house",e.target.value)}/></div>
        <div className="fg"><label className="fl">Apartment / Building</label><input className="fi" value={form.addr.apartment} onChange={e=>setAddr("apartment",e.target.value)}/></div>
        <div className="fg"><label className="fl">Street *</label><input className="fi" value={form.addr.street} onChange={e=>setAddr("street",e.target.value)}/></div>
        <div className="fg"><label className="fl">Place / Area *</label><input className="fi" value={form.addr.place} onChange={e=>setAddr("place",e.target.value)}/></div>
        <div className="fg" style={{marginBottom:0}}><label className="fl">Address Instructions</label><input className="fi" value={form.addr.landmark} onChange={e=>setAddr("landmark",e.target.value)} placeholder="Gate code, directions, etc."/></div></div>}
      {deliveryShort&&<div className="del-warn">⚠️ Minimum delivery order is <strong>₹{DELIVERY_MIN}</strong> — add ₹{Math.ceil(DELIVERY_MIN-subtotal)} more</div>}
      <div className="osb">{cart.map(i=><div key={i.key} className="osi"><span>{cleanName(i.name)}{i.variant?` (${i.variant})`:""} ×{i.qty}{i.itemNote?` — ${i.itemNote}`:""}</span><span>₹{(i.unitPrice*i.qty).toFixed(0)}</span></div>)}
        {discountPct>0&&<div className="osi" style={{color:"var(--g)"}}><span>Discount ({discountPct}%)</span><span>-₹{discountAmt.toFixed(0)}</span></div>}
        <div className="osi"><span>GST (5%)</span><span>₹{gstAmt.toFixed(0)}</span></div>
        <div className="ost"><span>Total</span><span>₹{total.toFixed(0)}</span></div></div>
      <div className="macts"><button className="bg" onClick={()=>setShowCheckout(false)}>Back</button><button className="ba" onClick={placeOrder} disabled={!canPlace}>Place Order</button></div>
    </div></div>)}
    {orderPlaced&&<div className="mov"><div className="modal"><div className="sbox"><div className="sicon">🔥</div><h2>Order Placed!</h2><div className="otag">Order #{orderNum}</div><p>Thank you, {form.name}!<br/>Your order has been received and is being prepared.</p><button className="ba" style={{width:"100%"}} onClick={reset}>Place New Order</button></div></div></div>}
  </>);
}

function OrderDashboard({ orders, onAdvance, onRemove, onClearDone }) {
  const [filter, setFilter] = useState("All");
  const counts = useMemo(()=>STATUS_FLOW.reduce((acc,s)=>({...acc,[s]:orders.filter(o=>o.status===s).length}),{}), [orders]);
  const displayed = useMemo(()=>{const o=filter==="All"?orders:orders.filter(o=>o.status===filter);return [...o].sort((a,b)=>new Date(b.placedAt)-new Date(a.placedAt));},[orders,filter]);
  return (<div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1rem",marginBottom:"1.5rem"}}>
      <div className="asc"><div className="asl">Total Orders</div><div className="asv">{orders.length}</div></div>
      <div className="asc"><div className="asl" style={{color:"#ef4444"}}>New</div><div className="asv">{counts["New"]||0}</div></div>
      <div className="asc"><div className="asl" style={{color:"#22c55e"}}>Preparing</div><div className="asv">{counts["Preparing"]||0}</div></div>
      <div className="asc"><div className="asl">Done</div><div className="asv">{counts["Done"]||0}</div></div>
    </div>
    <div className="ord-filter">
      {["All",...STATUS_FLOW].map(s=><button key={s} className={`ord-fbtn ${filter===s?"active":""}`} onClick={()=>setFilter(s)}>{s}{s!=="All"&&counts[s]>0?` (${counts[s]})`:""}</button>)}
      {orders.some(o=>o.status==="Done")&&<button className="ord-fbtn" style={{marginLeft:"auto",color:"#f87171",borderColor:"rgba(220,38,38,.25)"}} onClick={onClearDone}>Clear Done</button>}
    </div>
    {displayed.length===0?<div className="ord-empty"><div className="ord-empty-icon">📋</div><p>{filter==="All"?"No orders yet":"No "+filter+" orders"}</p></div>
    :<div className="ord-grid">{displayed.map(order=>{
      const nextStatus=STATUS_FLOW[STATUS_FLOW.indexOf(order.status)+1];
      const btnColor=order.status==="New"?"#dc2626":order.status==="Preparing"?"#16a34a":"#555";
      return(<div key={order.id} className={`ord-card status-${order.status}`}>
        <div className="ord-card-head"><div>
          <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".2rem"}}><div className="ord-num">#{order.num}</div><span className="ord-type">{order.type==="Delivery"?"🛵 Delivery":"🏃 Pickup"}</span></div>
          <div className="ord-customer">👤 {order.customer}{order.phone?` · ${order.phone}`:""}</div>
          {order.address&&<div className="ord-time">📍 {order.address}</div>}
          <div className="ord-time">🕐 {fmt(order.placedAt)}</div>
        </div><span className="ord-status-pill" style={{background:STATUS_BG[order.status],color:STATUS_COLOR[order.status]}}>{order.status}</span></div>
        <div className="ord-items">{order.items.map((item,i)=><div key={i} className="ord-item-row"><span className="ord-item-name">{item.name}{item.variant&&<span className="ord-item-var">({item.variant})</span>} ×{item.qty}</span><span className="ord-item-price">₹{(item.unitPrice*item.qty).toFixed(0)}</span></div>)}</div>
        {order.notes&&<div className="ord-notes">📝 {order.notes}</div>}
        <div className="ord-foot"><div className="ord-total">₹{order.total.toFixed(0)}</div><div className="ord-actions">
          {nextStatus&&<button className="ord-next-btn" style={{background:btnColor}} onClick={()=>onAdvance(order.id,nextStatus)}>{nextStatus==="Preparing"?"Start Preparing":"Mark Done"}</button>}
          <button className="ord-del-btn" onClick={()=>onRemove(order.id)}>✕</button></div></div>
      </div>);})}</div>}
  </div>);
}

function AdminLogin({ onLogin, password }) {
  const [pwd,setPwd]=useState(""); const [err,setErr]=useState(false);
  const go=()=>pwd===password?onLogin():setErr(true);
  return (<div className="alog"><div className="abox">
    <h2>Grillin&apos;</h2>
    <p>Restaurant Access — enter password to continue</p>
    {err&&<div className="aerr">Incorrect password. Try again.</div>}
    <div className="fg"><label className="fl">Password</label><input className="fi" type="password" value={pwd} onChange={e=>{setPwd(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
    <button className="ba" style={{width:"100%",marginTop:".5rem"}} onClick={go}>Sign In</button>
  </div></div>);
}

function SettingsPanel({ settings, setSettings, adminPassword, setAdminPassword }) {
  const [showPwdChange, setShowPwdChange] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdOk, setPwdOk] = useState(false);
  const changePassword = async () => {
    if (oldPwd !== adminPassword) { setPwdMsg("Current password is incorrect"); return; }
    if (newPwd.length < 4) { setPwdMsg("New password must be at least 4 characters"); return; }
    setAdminPassword(newPwd);
    await updateSetting("admin_password", newPwd);
    setShowPwdChange(false); setOldPwd(""); setNewPwd(""); setPwdMsg("");
    setPwdOk(true); setTimeout(() => setPwdOk(false), 3000);
  };
  const toggleSetting = async (key, dbKey) => {
    setSettings(s => {
      const newVal = !s[key];
      updateSetting(dbKey, String(newVal));
      return { ...s, [key]: newVal };
    });
  };
  const updateOfferPercent = async (val) => {
    const pct = Math.min(50, Math.max(0, parseInt(val) || 0));
    setSettings(s => ({ ...s, offerPercent: pct }));
    updateSetting("offer_percent", String(pct));
  };
  const Toggle = ({ on, onToggle }) => (
    <div className={`toggle-switch ${on?"on":"off"}`} onClick={onToggle}><div className="toggle-dot"/></div>
  );
  return (<div>
    <div style={{marginBottom:"1.25rem"}}><h2 style={{fontFamily:"var(--head)",fontSize:"1.2rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginBottom:".75rem"}}>Settings</h2></div>
    <div className="setting-row"><div><div className="setting-label">🔒 Change Admin Password</div><div className="setting-desc">Update the password used to access the admin panel</div></div>
      <button className="abtn" onClick={()=>setShowPwdChange(!showPwdChange)}>{showPwdChange?"Cancel":"Change"}</button></div>
    {pwdOk&&<div style={{background:"rgba(34,197,94,.12)",border:"1px solid rgba(34,197,94,.25)",color:"#4ade80",borderRadius:"var(--radius-sm)",padding:".5rem .8rem",fontSize:".8rem",marginBottom:".5rem"}}>✓ Password updated successfully</div>}
    {showPwdChange&&<div style={{background:"var(--s)",border:"1px solid var(--b)",borderRadius:"var(--radius)",padding:"1rem",marginBottom:".65rem",marginTop:"-0.3rem"}}>
      {pwdMsg&&<div className="aerr" style={{marginBottom:".5rem"}}>{pwdMsg}</div>}
      <div className="fg"><label className="fl">Current Password</label><input className="fi" type="password" value={oldPwd} onChange={e=>{setOldPwd(e.target.value);setPwdMsg("");}}/></div>
      <div className="fg"><label className="fl">New Password</label><input className="fi" type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)}/></div>
      <button className="ba" onClick={changePassword}>Update Password</button>
    </div>}
    <div className="setting-row"><div><div className="setting-label">🗑️ Require Password to Delete Items</div><div className="setting-desc">Admin must enter password before deleting a menu item</div></div>
      <Toggle on={settings.deleteProtection} onToggle={()=>toggleSetting("deleteProtection","delete_protection")}/></div>
    <div className="setting-row"><div><div className="setting-label">🛵 Minimum ₹300 for Delivery</div><div className="setting-desc">Require a minimum order of ₹300 for delivery orders</div></div>
      <Toggle on={settings.deliveryMinEnabled} onToggle={()=>toggleSetting("deliveryMinEnabled","delivery_min_enabled")}/></div>
    <div className="setting-row" style={{flexWrap:"wrap",gap:".5rem"}}><div><div className="setting-label">🏷️ Offer / Discount</div><div className="setting-desc">Apply a percentage discount to all orders</div></div>
      <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
        <Toggle on={settings.offerEnabled} onToggle={()=>toggleSetting("offerEnabled","offer_enabled")}/>
        {settings.offerEnabled&&<div style={{display:"flex",alignItems:"center",gap:".3rem"}}>
          <input className="fi" style={{width:60,textAlign:"center",padding:".35rem"}} type="number" min="1" max="50" value={settings.offerPercent} onChange={e=>updateOfferPercent(e.target.value)}/>
          <span style={{fontSize:".85rem",color:"var(--m)"}}>%</span>
        </div>}
      </div>
    </div>
  </div>);
}

function AdminPanel({ menuItems, setMenuItems, orders, setOrders, onLogout, settings, setSettings, adminPassword, setAdminPassword }) {
  const [tab, setTab] = useState("orders");
  const [fCat,setFCat]=useState("All"); const [fSt,setFSt]=useState("All");
  const [showAdd,setShowAdd]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [bulk,setBulk]=useState(""); const [bParsed,setBParsed]=useState([]);
  const [newItem,setNewItem]=useState({name:"",category:"",price:"",description:"",emoji:""});
  const [delPwdModal, setDelPwdModal] = useState(null);
  const [delPwd, setDelPwd] = useState("");
  const [delPwdErr, setDelPwdErr] = useState(false);
  const cats=[...new Set(menuItems.map(i=>i.category))];
  const avail=menuItems.filter(i=>i.available&&!i.outOfStock).length;
  const outOfStockCount=menuItems.filter(i=>i.outOfStock).length;
  const newOrders=orders.filter(o=>o.status==="New").length;
  const filtered=menuItems.filter(i=>{
    if(fCat!=="All"&&i.category!==fCat)return false;
    if(fSt==="Available"&&(!i.available||i.outOfStock))return false;
    if(fSt==="Unavailable"&&i.available)return false;
    if(fSt==="Out of Stock"&&!i.outOfStock)return false;
    return true;
  });
  const tog=async(id)=>{const item=menuItems.find(i=>i.id===id);if(!item)return;const updated={...item,available:!item.available};setMenuItems(p=>p.map(i=>i.id===id?updated:i));await updateMenuItem(updated);};
  const togOos=async(id)=>{const item=menuItems.find(i=>i.id===id);if(!item)return;const updated={...item,outOfStock:!item.outOfStock};setMenuItems(p=>p.map(i=>i.id===id?updated:i));await updateMenuItem(updated);};
  const requestDelete = (id) => {
    if (settings.deleteProtection) { setDelPwdModal(id); setDelPwd(""); setDelPwdErr(false); }
    else { confirmDelete(id); }
  };
  const confirmDelete = async (id) => { setMenuItems(p=>p.filter(i=>i.id!==id)); await deleteMenuItem(id); setDelPwdModal(null); };
  const handleDelPwd = () => { if (delPwd === adminPassword) { confirmDelete(delPwdModal); } else { setDelPwdErr(true); } };
  const saveEdit=async(updated)=>{setMenuItems(p=>p.map(i=>i.id===updated.id?updated:i));setEditItem(null);await updateMenuItem(updated);};
  const addIt=async()=>{
    if(!newItem.name||!newItem.price)return;
    const item={...newItem,id:Date.now(),available:true,outOfStock:false};
    setMenuItems(p=>[...p,item]);setNewItem({name:"",category:cats[0]||"",price:"",description:"",emoji:""});setShowAdd(false);
    await insertMenuItem(item);
  };
  const handleAdvance=async(id,nextStatus)=>{setOrders(p=>p.map(o=>o.id===id?{...o,status:nextStatus}:o));await updateOrderStatus(id,nextStatus);};
  const handleRemove=async(id)=>{setOrders(p=>p.filter(o=>o.id!==id));await deleteOrder(id);};
  const handleClearDone=async()=>{if(window.confirm("Clear all done orders?")){setOrders(p=>p.filter(o=>o.status!=="Done"));await deleteDoneOrders();}};
  const parseBulk=(t)=>{setBParsed(t.trim().split("\n").filter(l=>l.trim()).map((line,i)=>{const p=line.split(",").map(x=>x.trim());return p.length<3?{line:i+1,err:"Need: Name, Category, Price",raw:line}:{line:i+1,name:p[0],category:p[1],price:p[2],description:p[3]||"",emoji:p[4]||"",ok:true};}));};
  const importBulk=async()=>{const items=bParsed.filter(x=>x.ok).map(x=>({id:Date.now()+Math.random(),name:x.name,category:x.category,price:x.price,description:x.description,emoji:x.emoji,available:true,outOfStock:false}));setMenuItems(p=>[...p,...items]);setBulk("");setBParsed([]);setTab("manage");await bulkInsertMenuItems(items);};
  return (<div className="adm">
    <div className="adm-nav"><img src={LOGO_SRC} alt="Grillin'"/><button className="lout" onClick={onLogout}>Sign Out</button></div>
    <div className="adm-inner">
      <div className="atop"><h1>Restaurant Dashboard</h1></div>
      <div className="atabs">
        <button className={`atab ${tab==="orders"?"active":""}`} onClick={()=>setTab("orders")}>Orders {newOrders>0&&<span className="nbadge">{newOrders}</span>}</button>
        <button className={`atab ${tab==="manage"?"active":""}`} onClick={()=>setTab("manage")}>Menu</button>
        <button className={`atab ${tab==="bulk"?"active":""}`} onClick={()=>setTab("bulk")}>Bulk Add</button>
        <button className={`atab ${tab==="settings"?"active":""}`} onClick={()=>setTab("settings")}>Settings</button>
      </div>
      {tab==="orders"&&<OrderDashboard orders={orders} onAdvance={handleAdvance} onRemove={handleRemove} onClearDone={handleClearDone}/>}
      {tab==="settings"&&<SettingsPanel settings={settings} setSettings={setSettings} adminPassword={adminPassword} setAdminPassword={setAdminPassword}/>}
      {tab==="manage"&&<>
        <div className="astats">
          <div className="asc"><div className="asl">Total Items</div><div className="asv">{menuItems.length}</div></div>
          <div className="asc"><div className="asl">Available</div><div className="asv">{avail}</div></div>
          <div className="asc"><div className="asl">Out of Stock</div><div className="asv">{outOfStockCount}</div></div>
          <div className="asc"><div className="asl">Hidden</div><div className="asv">{menuItems.filter(i=>!i.available).length}</div></div>
        </div>
        <div className="tw"><div className="thb"><h2>All Menu Items</h2><div className="tfs">
          <select className="fsel" value={fCat} onChange={e=>setFCat(e.target.value)}><option value="All">All Categories</option>{cats.map(c=><option key={c}>{c}</option>)}</select>
          <select className="fsel" value={fSt} onChange={e=>setFSt(e.target.value)}><option value="All">All Status</option><option>Available</option><option>Unavailable</option><option>Out of Stock</option></select>
          <button className="abtn" onClick={()=>setShowAdd(true)}>+ Add Item</button></div></div>
          <div className="tscr"><table><thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {filtered.map(item=><tr key={item.id}>
              <td><strong>{cleanName(item.name)}</strong>{item.description&&<div style={{fontSize:".72rem",color:"var(--m)",marginTop:2}}>{item.description}</div>}</td>
              <td style={{color:"var(--m)",fontSize:".78rem"}}>{item.category}</td>
              <td><strong style={{color:"var(--a)"}}>₹{item.price}</strong></td>
              <td><span className={`bdg ${item.outOfStock?"boos":item.available?"bon":"boff"}`}>{item.outOfStock?"Out of Stock":item.available?"On":"Off"}</span></td>
              <td>
                <button className="tedit" onClick={()=>setEditItem(item)}>Edit</button>
                <button className="ttog" onClick={()=>tog(item.id)}>{item.available?"Hide":"Show"}</button>
                <button className="ttog toos" onClick={()=>togOos(item.id)}>{item.outOfStock?"Restock":"OOS"}</button>
                <button className="tdel" onClick={()=>requestDelete(item.id)}>Delete</button>
              </td></tr>)}</tbody></table></div></div>
      </>}
      {tab==="bulk"&&<div className="bulk"><h2>Bulk Add Items</h2><p>One item per line: <code>Name, Category, Price, Description, Emoji</code></p>
        <textarea className="bta" value={bulk} onChange={e=>{setBulk(e.target.value);if(e.target.value.trim())parseBulk(e.target.value);else setBParsed([]);}} placeholder="Chicken Wings, Indian Starters, 320, Crispy wings"/>
        {bParsed.length>0&&<div className="bprev">{bParsed.map(p=><div key={p.line} className="bpi"><span className={p.ok?"pok":"perr"}>{p.ok?"✓":"✗"}</span><span>{p.ok?`${p.name} — ${p.category} — ₹${p.price}`:`Line ${p.line}: ${p.err}`}</span></div>)}</div>}
        <div className="bacts"><button className="ba" onClick={importBulk} disabled={!bParsed.some(p=>p.ok)}>Import Valid Items</button><button className="bg" onClick={()=>{setBulk("");setBParsed([]);}}>Clear</button>{bParsed.length>0&&<span className="bnote">{bParsed.filter(p=>p.ok).length} valid items</span>}</div></div>}
    </div>
    {showAdd&&<div className="mov"><div className="modal"><h2>Add Menu Item</h2>
      <div className="fr"><div className="fg"><label className="fl">Name *</label><input className="fi" value={newItem.name} onChange={e=>setNewItem({...newItem,name:e.target.value})}/></div><div className="fg"><label className="fl">Emoji</label><input className="fi" value={newItem.emoji} onChange={e=>setNewItem({...newItem,emoji:e.target.value})}/></div></div>
      <div className="fr"><div className="fg"><label className="fl">Category *</label><select className="fi" value={newItem.category} onChange={e=>setNewItem({...newItem,category:e.target.value})}>{cats.map(c=><option key={c}>{c}</option>)}</select></div><div className="fg"><label className="fl">Price *</label><input className="fi" value={newItem.price} onChange={e=>setNewItem({...newItem,price:e.target.value})}/></div></div>
      <div className="fg"><label className="fl">Description</label><input className="fi" value={newItem.description} onChange={e=>setNewItem({...newItem,description:e.target.value})}/></div>
      <div className="macts"><button className="bg" onClick={()=>setShowAdd(false)}>Cancel</button><button className="ba" onClick={addIt} disabled={!newItem.name||!newItem.price}>Add Item</button></div></div></div>}
    {editItem&&<EditItemModal item={editItem} onSave={saveEdit} onClose={()=>setEditItem(null)}/>}
    {delPwdModal&&<div className="mov"><div className="modal"><h2>Confirm Delete</h2>
      <p style={{color:"var(--m)",fontSize:".85rem",marginBottom:"1rem"}}>Enter admin password to delete this item</p>
      {delPwdErr&&<div className="aerr" style={{marginBottom:".5rem"}}>Incorrect password</div>}
      <div className="fg"><label className="fl">Password</label><input className="fi" type="password" value={delPwd} onChange={e=>{setDelPwd(e.target.value);setDelPwdErr(false);}} onKeyDown={e=>e.key==="Enter"&&handleDelPwd()}/></div>
      <div className="macts"><button className="bg" onClick={()=>setDelPwdModal(null)}>Cancel</button><button className="ba" onClick={handleDelPwd}>Delete Item</button></div>
    </div></div>}
  </div>);
}

function EditItemModal({ item, onSave, onClose }) {
  const [name,setName]=useState(item.name); const [desc,setDesc]=useState(item.description||"");
  const [price,setPrice]=useState(item.price); const [emoji,setEmoji]=useState(item.emoji||"🍽");
  const [popupType,setPopupType]=useState(item.popup||"none");
  const [choices,setChoices]=useState(item.popup==="choices"?(item.choices||[]).map(c=>({...c})):item.popup==="addon"?(item.addons||[]).map(a=>({...a})):[]);
  const addChoice=()=>setChoices(p=>[...p,{label:"",price:0}]);
  const removeChoice=(i)=>setChoices(p=>p.filter((_,j)=>j!==i));
  const updateChoice=(i,field,val)=>setChoices(p=>p.map((c,j)=>j===i?{...c,[field]:field==="price"?Number(val)||0:val}:c));
  const save=()=>{
    if(!name.trim()||!price.trim())return;
    const base={...item,name:name.trim(),description:desc.trim(),price:price.trim(),emoji};
    if(popupType==="none"){delete base.popup;delete base.choices;delete base.addons;}
    if(popupType==="halfFull"){base.popup="halfFull";delete base.choices;delete base.addons;}
    if(popupType==="dryGravy"){base.popup="dryGravy";delete base.choices;delete base.addons;}
    if(popupType==="choices"){base.popup="choices";base.choices=choices.filter(c=>c.label.trim());delete base.addons;}
    if(popupType==="addon"){base.popup="addon";base.addons=choices.filter(c=>c.label.trim());delete base.choices;}
    onSave(base);
  };
  const isList=popupType==="choices"||popupType==="addon";
  return(<div className="mov"><div className="modal" style={{maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
    <h2>Edit Item</h2>
    <div className="fr"><div className="fg"><label className="fl">Name</label><input className="fi" value={name} onChange={e=>setName(e.target.value)}/></div><div className="fg"><label className="fl">Emoji</label><input className="fi" value={emoji} onChange={e=>setEmoji(e.target.value)}/></div></div>
    <div className="fg"><label className="fl">Price (₹)</label><input className="fi" value={price} onChange={e=>setPrice(e.target.value)}/></div>
    <div className="fg"><label className="fl">Description</label><input className="fi" value={desc} onChange={e=>setDesc(e.target.value)}/></div>
    <div className="fg"><label className="fl">Variation Type</label><div style={{display:"flex",gap:".4rem",flexWrap:"wrap"}}>
      {[["none","None"],["halfFull","Half / Full"],["dryGravy","Dry / Gravy"],["choices","Choices"],["addon","Add-on"]].map(([val,lbl])=>
        <div key={val} onClick={()=>setPopupType(val)} style={{padding:".4rem .75rem",borderRadius:"var(--radius-sm)",border:`2px solid ${popupType===val?"var(--a)":"var(--b)"}`,background:popupType===val?"rgba(220,38,38,.08)":"var(--s2)",cursor:"pointer",fontFamily:"var(--head)",fontSize:".78rem",fontWeight:600,textTransform:"uppercase",letterSpacing:".03em"}}>{lbl}</div>
      )}</div></div>
    {isList&&<div className="fg"><label className="fl">{popupType==="choices"?"Choice Options":"Add-on Options"}</label>
      <div style={{display:"flex",flexDirection:"column",gap:".4rem",marginBottom:".5rem"}}>{choices.map((c,i)=>
        <div key={i} style={{display:"flex",gap:".4rem",alignItems:"center"}}><input className="fi" style={{flex:2}} value={c.label} onChange={e=>updateChoice(i,"label",e.target.value)} placeholder="Label"/><input className="fi" style={{flex:1}} value={c.price} onChange={e=>updateChoice(i,"price",e.target.value)} placeholder="Price"/><button onClick={()=>removeChoice(i)} style={{background:"transparent",border:"none",color:"#f87171",cursor:"pointer",fontSize:"1rem"}}>✕</button></div>
      )}</div><button onClick={addChoice} style={{background:"var(--s2)",border:"1px dashed var(--b2)",borderRadius:"var(--radius-sm)",padding:".4rem",width:"100%",color:"var(--m)",cursor:"pointer",fontSize:".78rem"}}>+ Add Option</button></div>}
    <div className="macts"><button className="bg" onClick={onClose}>Cancel</button><button className="ba" onClick={save} disabled={!name.trim()||!price.trim()}>Save Changes</button></div>
  </div></div>);
}

export default function GrillinApp() {
  const [page, setPage] = useState("customer");
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [authed, setAuthed] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [settings, setSettings] = useState({ deliveryMinEnabled:true, deleteProtection:false, offerEnabled:false, offerPercent:10 });
  useEffect(() => {
    async function loadData() {
      const [menu, ords, dbSettings] = await Promise.all([fetchMenuItems(), fetchOrders(), fetchSettings()]);
      setMenuItems(menu); setOrders(ords);
      if (dbSettings.admin_password) setAdminPassword(dbSettings.admin_password);
      setSettings({ deliveryMinEnabled:dbSettings.delivery_min_enabled!=="false", deleteProtection:dbSettings.delete_protection==="true", offerEnabled:dbSettings.offer_enabled==="true", offerPercent:parseInt(dbSettings.offer_percent)||10 });
      setLoading(false);
    }
    loadData();
  }, []);
  const [alertOrder, setAlertOrder] = useState(null);
  const alertIntervalRef = useState(null);
  const playLoudAlarm = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, start, dur, vol) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = "square";
        gain.gain.setValueAtTime(vol, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + dur);
      };
      playTone(800,0,0.12,0.5);playTone(1000,0.15,0.12,0.5);playTone(800,0.3,0.12,0.5);playTone(1000,0.45,0.12,0.5);playTone(1200,0.6,0.3,0.6);
    } catch(e) {}
  }, []);
  const startAlarm = useCallback((order) => {
    setAlertOrder(order); playLoudAlarm();
    if (alertIntervalRef[0]) clearInterval(alertIntervalRef[0]);
    alertIntervalRef[0] = setInterval(() => { playLoudAlarm(); }, 3000);
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("NEW ORDER #" + order.num, { body: order.customer + " — ₹" + parseFloat(order.total).toFixed(0), requireInteraction: true });
    }
  }, [playLoudAlarm, alertIntervalRef]);
  const acknowledgeOrder = useCallback(() => {
    if (alertIntervalRef[0]) { clearInterval(alertIntervalRef[0]); alertIntervalRef[0] = null; }
    setAlertOrder(null);
  }, [alertIntervalRef]);
  useEffect(() => { if (page === "admin" && "Notification" in window && Notification.permission === "default") { Notification.requestPermission(); } }, [page]);
  useEffect(() => { return () => { if (alertIntervalRef[0]) clearInterval(alertIntervalRef[0]); }; }, [alertIntervalRef]);
  useEffect(() => {
    const channel = subscribeToOrders((payload) => {
      if (payload.eventType === "INSERT") {
        setOrders(prev => {
          if (prev.find(o => o.id === payload.new.id)) return prev;
          const newOrder = { id:payload.new.id, num:payload.new.num, customer:payload.new.customer, phone:payload.new.phone, address:payload.new.address, addr:payload.new.addr, type:payload.new.type, notes:payload.new.notes||"", items:payload.new.items||[], total:parseFloat(payload.new.total), status:payload.new.status, placedAt:new Date(payload.new.placed_at) };
          startAlarm(newOrder); return [newOrder, ...prev];
        });
      } else if (payload.eventType === "UPDATE") {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? {...o, status:payload.new.status} : o));
      } else if (payload.eventType === "DELETE") {
        setOrders(prev => prev.filter(o => o.id !== payload.old.id));
      }
    });
    return () => { channel.unsubscribe(); };
  }, [startAlarm]);
  useEffect(() => {
    const channel = subscribeToMenu((payload) => {
      if (payload.eventType === "UPDATE") {
        const r = payload.new;
        setMenuItems(prev => prev.map(i => i.id === r.id ? {...i, available:r.available, outOfStock:r.out_of_stock, name:r.name, price:r.price, description:r.description||""} : i));
      } else if (payload.eventType === "INSERT") { fetchMenuItems().then(setMenuItems); }
      else if (payload.eventType === "DELETE") { setMenuItems(prev => prev.filter(i => i.id !== payload.old.id)); }
    });
    return () => { channel.unsubscribe(); };
  }, []);
  const handleOrderPlaced = (order) => { setOrders(prev => { if (prev.find(o => o.id === order.id)) return prev; return [order, ...prev]; }); };
  const AlertOverlay = () => alertOrder ? (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.88)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"var(--s)",border:"2px solid var(--a)",borderRadius:20,padding:"2.5rem",width:420,maxWidth:"95vw",textAlign:"center",animation:"popIn .25s cubic-bezier(.16,1,.3,1)"}}>
        <div style={{fontSize:"4rem",marginBottom:".5rem",animation:"pulse 1s infinite"}}>🔔</div>
        <h2 style={{fontFamily:"var(--head)",fontSize:"1.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".04em",marginBottom:".3rem"}}>New Order!</h2>
        <div style={{fontFamily:"var(--head)",fontSize:"1.3rem",color:"var(--a)",fontWeight:700,marginBottom:".5rem",letterSpacing:".03em"}}>#{alertOrder.num}</div>
        <div style={{fontSize:".95rem",marginBottom:".2rem"}}>{alertOrder.customer}</div>
        <div style={{fontSize:".85rem",color:"var(--m)",marginBottom:".3rem"}}>{alertOrder.type==="Delivery"?"🛵 Delivery":"🏃 Pickup"}</div>
        <div style={{fontFamily:"var(--head)",fontSize:"1.4rem",fontWeight:700,marginBottom:"1.5rem"}}>₹{parseFloat(alertOrder.total).toFixed(0)}</div>
        <button onClick={acknowledgeOrder} style={{width:"100%",padding:".9rem",background:"var(--a)",color:"white",border:"none",borderRadius:"var(--radius-sm)",fontFamily:"var(--head)",fontSize:"1rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",cursor:"pointer"}}>✓ Accept Order</button>
      </div>
    </div>
  ) : null;
  if (loading) return <><style>{S}</style><div className="loading-screen">Loading menu…</div></>;
  if (page === "admin-login") return <><style>{S}</style><AdminLogin onLogin={()=>{setAuthed(true);setPage("admin");}} password={adminPassword}/></>;
  if (page === "admin") return (<><style>{S}</style><AdminPanel menuItems={menuItems} setMenuItems={setMenuItems} orders={orders} setOrders={setOrders} onLogout={()=>setPage("customer")} settings={settings} setSettings={setSettings} adminPassword={adminPassword} setAdminPassword={setAdminPassword}/><AlertOverlay/><style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style></>);
  return (<><style>{S}</style><CustomerView menuItems={menuItems} search={search} setSearch={setSearch} onOrderPlaced={handleOrderPlaced} orders={orders} onAccessClick={()=>setPage(authed?"admin":"admin-login")} settings={settings}/></>);
}
