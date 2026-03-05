"use client";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  fetchMenuItems, updateMenuItem, insertMenuItem, deleteMenuItem, bulkInsertMenuItems,
  fetchOrders, insertOrder, updateOrderStatus, cancelOrder, deleteOrder, deleteDoneOrders, deleteOldOrders,
  findCustomerByPhone, upsertCustomer,
  subscribeToOrders, subscribeToMenu,
  fetchSettings, updateSetting,
} from "@/lib/supabase";

const needsPopup = (item) => !!item.popup;
const cleanName = (name) => name.replace(/\s*Half\/Full\s*/gi,"").replace(/\s*Dry\/Gravy\s*/gi,"").trim();
const displayPrice = (item) => {
  if (item.popup === "halfFull") { const parts = String(item.price).split("/"); return `₹${parts[0]} / ₹${parts[1]||parts[0]}`; }
  if (item.popup === "choices") { const min = Math.min(...item.choices.map(c => c.price)); return `₹${min}+`; }
  return `₹${item.price}`;
};
const tagLabel = (item) => {
  if (item.popup === "halfFull") return "HALF / FULL";
  if (item.popup === "dryGravy") return "DRY / GRAVY";
  if (item.popup === "choices") return "OPTIONS";
  if (item.popup === "addon") return "+ ADD-ON";
  return null;
};
const DEFAULT_ADMIN_PASSWORD = "grillin2024";
const STATUS_FLOW = ["New","Preparing","Done"];
const ALL_STATUSES = ["New","Preparing","Done","Cancelled"];
const STATUS_BG = {New:"rgba(220,38,38,.14)",Preparing:"rgba(34,197,94,.12)",Done:"rgba(120,113,108,.12)",Cancelled:"rgba(245,158,11,.12)"};
const STATUS_COLOR = {New:"#ef4444",Preparing:"#22c55e",Done:"#78716c",Cancelled:"#f59e0b"};
const LOGO_SRC = "/grillin-logo.png";
const PHONE_1 = "9901538782";
const PHONE_2 = "7259020939";
const fmt = (d) => {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  const diff = Math.floor((new Date()-date)/1000);
  if(diff<60) return "Just now";
  if(diff<3600) return `${Math.floor(diff/60)}m ago`;
  return `${Math.floor(diff/3600)}h ago`;
};
const isStoreOpen = (settings) => {
  if (!settings.orderTimingEnabled) return true;
  const now = new Date();
  const mins = now.getHours()*60+now.getMinutes();
  const [oh,om] = (settings.openTime||"10:00").split(":").map(Number);
  const [ch,cm] = (settings.closeTime||"23:00").split(":").map(Number);
  const open = oh*60+om, close = ch*60+cm;
  return close > open ? (mins>=open && mins<close) : (mins>=open || mins<close);
};

const CartIcon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);
const ClearIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const FoodTypeDot = ({type}) => {
  const color = type === "veg" ? "#22c55e" : "#dc2626";
  return <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:14,height:14,border:`1.5px solid ${color}`,borderRadius:2,flexShrink:0}}><span style={{width:7,height:7,borderRadius:"50%",background:color}}/></span>;
};

const S = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0d0d0d;--s:#161616;--s2:#1c1c1c;--s3:#242424;
  --b:#252525;--b2:#333;--b3:#3d3d3d;
  --t:#f5f0eb;--t2:#d4cfc8;--m:#7a7470;
  --a:#dc2626;--a2:#b91c1c;--a3:#991b1b;--aGlow:rgba(220,38,38,.25);
  --g:#22c55e;--g2:#16a34a;--r:#ef4444;--amber:#f59e0b;
  --font:'DM Sans',sans-serif;
  --radius:14px;--radius-sm:8px;--radius-lg:18px;
}
html,body{background:var(--bg);color:var(--t);font-family:var(--font);-webkit-font-smoothing:antialiased;line-height:1.5;min-height:100vh;min-height:100dvh}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--b2);border-radius:3px}
.sticky-top{position:sticky;top:0;z-index:100;background:var(--bg)}
@media(min-width:901px){.sticky-top{box-shadow:0 4px 16px rgba(0,0,0,.5)}}
.nav{padding:.85rem .5rem .35rem;display:flex;align-items:center;justify-content:space-between}
@media(max-width:700px){.nav{padding:.5rem 1.25rem .25rem}}
.nav-logo img{height:120px;width:auto;object-fit:contain;display:block}
@media(max-width:580px){.nav-logo img{height:110px;max-height:calc(100% + 10px)}}
.cart-pill{display:flex;align-items:center;gap:.45rem;background:var(--a);color:white;border:none;border-radius:26px;padding:.5rem 1.1rem;font-family:var(--font);font-size:.85rem;font-weight:700;cursor:pointer;position:relative;transition:all .15s}
.cart-pill:hover{background:var(--a2)}
.cart-pill svg{flex-shrink:0}
.cart-badge{position:absolute;top:-4px;right:-4px;background:#f5f5f5;color:var(--a);border-radius:50%;width:19px;height:19px;font-size:.6rem;font-weight:700;display:flex;align-items:center;justify-content:center}
.search-wrap{padding:.35rem .5rem .4rem}
@media(max-width:700px){.search-wrap{padding:.25rem 1.25rem .35rem}}
.search-box{display:flex;align-items:center;gap:.55rem;background:var(--s2);border:1px solid var(--b);border-radius:var(--radius);padding:.6rem .95rem;transition:border .2s}
.search-box:focus-within{border-color:rgba(220,38,38,.35)}
.search-box input{background:transparent;border:none;outline:none;color:var(--t);font-family:var(--font);font-size:.85rem;width:100%}
.search-box input::placeholder{color:var(--m)}
.search-icon{color:var(--m);flex-shrink:0;display:flex;align-items:center}
.search-clear{background:none;border:none;color:var(--m);cursor:pointer;padding:2px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:color .15s;font-size:0}
.search-clear:hover{color:var(--t)}
.cat-strip{display:flex;gap:.4rem;padding:.1rem .5rem .55rem;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
@media(max-width:700px){.cat-strip{padding:.1rem 1.25rem .5rem}}
.cat-strip::-webkit-scrollbar{display:none}
.cat-pill{flex-shrink:0;padding:.38rem .9rem;border-radius:20px;border:1px solid var(--b2);background:transparent;color:var(--m);font-family:var(--font);font-size:.77rem;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap}
.cat-pill:hover{border-color:var(--a);color:var(--t)}
.cat-pill.active{background:var(--a);border-color:var(--a);color:white;font-weight:600}
.layout{display:flex;justify-content:center;height:100vh;height:100dvh;overflow:hidden;width:100%}
.main-col{display:flex;flex-direction:column;overflow:hidden;flex:1;padding:0 5vw}
.main-col .sticky-top{flex-shrink:0;position:relative}
.menu-scroll{flex:1;overflow-y:auto;background:var(--bg)}
@media(max-width:900px){.layout{height:auto;overflow:visible;display:block}.main-col{overflow:visible;padding:0;height:auto}.main-col .sticky-top{position:sticky;top:0;z-index:100}.menu-scroll{overflow:visible;flex:none}}
.cpanel{width:380px;flex-shrink:0;background:var(--s);border-left:1px solid var(--b);display:flex;flex-direction:column;overflow:hidden;position:fixed;top:0;right:0;bottom:0;z-index:200;transform:translateX(100%);transition:transform .3s cubic-bezier(.16,1,.3,1)}
.cpanel.open{transform:translateX(0)}
.cpanel-overlay{position:fixed;inset:0;z-index:190;background:rgba(0,0,0,.5);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .2s}
.cpanel-overlay.open{opacity:1;pointer-events:all}
.cpanel .cp-header{padding:1.1rem 1.2rem;border-bottom:1px solid var(--b);display:flex;align-items:center;justify-content:space-between}
.cpanel .cp-header h2{font-size:1.05rem;font-weight:800;display:flex;align-items:center;gap:.4rem}
.cpanel .cp-close{background:none;border:none;color:var(--m);cursor:pointer;font-size:1.1rem;padding:4px;display:flex;align-items:center;justify-content:center}
.cpanel .cp-close:hover{color:var(--t)}
.cpanel .cp-body{flex:1;overflow-y:auto;padding:.5rem 1.1rem}
.cpanel .cp-empty{text-align:center;padding:2.5rem 1rem;color:var(--m);font-size:.83rem}
.cpanel .cp-empty-icon{font-size:2rem;margin-bottom:.4rem;opacity:.4}
.cpanel .cp-foot{padding:.85rem 1.1rem;border-top:1px solid var(--b)}
.cpanel .cp-item{display:flex;align-items:flex-start;gap:.5rem;padding:.65rem 0;border-bottom:1px solid rgba(255,255,255,.04)}
.cpanel .cp-item-info{flex:1;min-width:0}
.cpanel .cp-item-name{font-size:.85rem;font-weight:600}
.cpanel .cp-item-variant{font-size:.66rem;color:var(--a);margin-top:2px;font-weight:500}
.cpanel .cp-item-price{font-size:.72rem;color:var(--m);margin-top:1px}
.cpanel .cp-item-note{width:100%;padding:.3rem .5rem;background:var(--s2);border:1px solid var(--b);border-radius:4px;color:var(--t);font-family:var(--font);font-size:.68rem;outline:none;margin-top:3px}
.cpanel .cp-item-note:focus{border-color:var(--a)}.cpanel .cp-item-note::placeholder{color:var(--m)}
.cp-qty{display:flex;align-items:center;border:1px solid var(--a);border-radius:6px;overflow:hidden;flex-shrink:0}
.cp-qty button{width:26px;height:26px;border:none;background:transparent;color:var(--a);font-size:.85rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center}
.cp-qty button:hover{background:rgba(220,38,38,.1)}
.cp-qty span{font-family:var(--font);font-size:.78rem;font-weight:700;width:20px;text-align:center;color:var(--t)}
@media(max-width:900px){.main-col{padding:0}.cpanel{display:none!important}.cpanel-overlay{display:none!important}}
.menu-area{padding:0 .5rem 2rem}
@media(max-width:900px){.menu-area{padding:0 1.25rem .5rem}}
.snote{font-size:.78rem;color:var(--m);margin-bottom:.7rem}
.sec-head{font-family:var(--font);font-size:1.3rem;font-weight:800;color:var(--a);margin:1.8rem 0 .85rem;padding-bottom:.5rem;border-bottom:2px solid rgba(220,38,38,.2);letter-spacing:-.01em}
.sec-head:first-child{margin-top:.5rem}
.mcard-grid{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}
@media(max-width:700px){.mcard-grid{grid-template-columns:1fr}}
.mcard{background:var(--s);border:1px solid var(--b);border-radius:var(--radius);padding:1.15rem 1.2rem;display:flex;gap:.85rem;align-items:flex-start;cursor:pointer;transition:all .15s}
.mcard:hover{border-color:var(--b2)}
.mcard.unavail{opacity:.35;cursor:not-allowed;filter:grayscale(.4)}.mcard.unavail:hover{border-color:var(--b)}
.mcard.oos{cursor:not-allowed;opacity:.65}.mcard.oos:hover{border-color:var(--b)}
.mc-info{flex:1;min-width:0}
.mc-name{font-family:var(--font);font-size:.93rem;font-weight:700;color:var(--t);line-height:1.35;margin-bottom:.2rem}
.mc-desc{font-size:.76rem;color:var(--m);line-height:1.5;margin-bottom:.45rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mc-price{font-family:var(--font);font-size:.88rem;font-weight:700;color:var(--a);letter-spacing:.01em}
.mc-tag{font-family:var(--font);font-size:.6rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--m);margin-top:2px}
.mc-right{display:flex;flex-direction:column;align-items:center;gap:.35rem;flex-shrink:0;padding-top:.2rem}
.oos-badge{font-size:.62rem;font-weight:600;letter-spacing:.03em;text-transform:uppercase;background:rgba(220,38,38,.08);color:#f87171;border:1px solid rgba(220,38,38,.12);border-radius:6px;padding:4px 8px}
.zomato-add{min-width:76px;height:33px;border-radius:8px;background:var(--s2);border:1.5px solid var(--a);color:var(--a);font-family:var(--font);font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s}
.zomato-add:hover{background:rgba(220,38,38,.08)}.zomato-add:active{transform:scale(.95)}
.zomato-qty{min-width:76px;height:33px;border-radius:8px;background:var(--a);border:none;display:flex;align-items:center;justify-content:space-between;overflow:hidden}
.zomato-qty button{width:26px;height:33px;border:none;background:transparent;color:white;font-size:.95rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .1s}
.zomato-qty button:hover{background:rgba(255,255,255,.12)}.zomato-qty button:active{background:rgba(255,255,255,.2)}
.zomato-qty span{font-family:var(--font);font-size:.82rem;font-weight:700;color:white;min-width:20px;text-align:center}
.offer-banner{background:linear-gradient(135deg,var(--a),var(--a2));color:white;text-align:center;padding:.55rem 1rem;font-size:.78rem;font-weight:600;letter-spacing:.02em}
.closed-banner{background:var(--s2);border:1px solid var(--b);color:var(--amber);text-align:center;padding:.7rem 1rem;font-size:.82rem;font-weight:600;border-radius:var(--radius);margin:0 .5rem .6rem}
@media(max-width:900px){.closed-banner{margin:0 1.25rem .5rem}}
.ov{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.78);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:1rem}
.om{background:var(--s);border:1px solid var(--b2);border-radius:var(--radius-lg);padding:1.6rem;width:340px;max-width:95vw;animation:popIn .22s cubic-bezier(.16,1,.3,1)}
@keyframes popIn{from{transform:scale(.93) translateY(6px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
.om h3{font-family:var(--font);font-size:1.1rem;font-weight:800;text-align:center;margin-bottom:.2rem}
.om-desc{text-align:center;color:var(--m);font-size:.76rem;margin-bottom:1rem;line-height:1.5}
.olbl{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--m);margin-bottom:.5rem}
.ochoices{display:flex;gap:.4rem;margin-bottom:1rem;flex-wrap:wrap}
.oc{flex:1;min-width:85px;padding:.7rem;border-radius:var(--radius-sm);border:2px solid var(--b);background:var(--s2);cursor:pointer;text-align:center;transition:all .12s}
.oc:hover{border-color:var(--a)}.oc.sel{border-color:var(--a);background:rgba(220,38,38,.06)}
.oc-lbl{font-family:var(--font);font-size:.85rem;font-weight:700}
.oc-price{font-size:.75rem;color:var(--a);margin-top:3px;font-weight:700}
.addon-row{display:flex;align-items:center;justify-content:space-between;padding:.65rem .8rem;border:1px solid var(--b);border-radius:var(--radius-sm);margin-bottom:.35rem;cursor:pointer;transition:all .15s}
.addon-row.sel{border-color:var(--a);background:rgba(220,38,38,.05)}
.addon-row-left{display:flex;align-items:center;gap:.45rem;font-size:.85rem;font-weight:500}
.addon-check{width:18px;height:18px;border-radius:4px;border:2px solid var(--b2);display:flex;align-items:center;justify-content:center;font-size:.65rem;transition:all .15s}
.addon-check.checked{background:var(--a);border-color:var(--a);color:white}
.addon-price{font-size:.78rem;color:var(--a);font-weight:600}
.oacts{display:flex;gap:.4rem;margin-top:1rem}
.chead{padding:1rem 1.1rem;border-bottom:1px solid var(--b)}
.chead h2{font-size:1.05rem;font-weight:800}.chead p{font-size:.72rem;color:var(--m);margin-top:2px}
.cbody{flex:1;overflow-y:auto;padding:.5rem .9rem}
.cempty{text-align:center;padding:2.5rem 1rem;color:var(--m);font-size:.83rem}
.cempty-icon{font-size:1.8rem;margin-bottom:.5rem;opacity:.5}
.ci{display:flex;align-items:flex-start;gap:.5rem;padding:.55rem 0;border-bottom:1px solid rgba(255,255,255,.04);animation:cartIn .2s ease}
@keyframes cartIn{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:translateX(0)}}
.ci-i{flex:1;min-width:0}.ci-n{font-size:.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ci-v{font-size:.65rem;color:var(--a);margin-top:2px;font-weight:500}.ci-p{font-size:.7rem;color:var(--m);margin-top:1px}
.ci-note-input{width:100%;padding:.28rem .45rem;background:var(--s2);border:1px solid var(--b);border-radius:4px;color:var(--t);font-family:var(--font);font-size:.65rem;outline:none;margin-top:3px;transition:border .15s}
.ci-note-input:focus{border-color:var(--a)}.ci-note-input::placeholder{color:var(--m)}
.qc{display:flex;align-items:center;border:1px solid var(--a);border-radius:6px;overflow:hidden;flex-shrink:0}
.qb{width:24px;height:24px;border:none;background:transparent;color:var(--a);font-size:.82rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center}
.qb:hover{background:rgba(220,38,38,.1)}
.qn{font-family:var(--font);font-size:.75rem;font-weight:700;width:18px;text-align:center;color:var(--t)}
.cfoot{padding:.8rem 1rem;border-top:1px solid var(--b)}
.ctotal{display:flex;justify-content:space-between;font-weight:600;font-size:.85rem;margin-bottom:.3rem}
.discount-line{display:flex;justify-content:space-between;font-size:.8rem;color:var(--g);margin-bottom:.3rem}
.chkbtn{width:100%;padding:.7rem;background:var(--a);color:white;border:none;border-radius:var(--radius-sm);font-family:var(--font);font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;cursor:pointer;transition:all .15s}
.chkbtn:hover:not(:disabled){background:var(--a2)}.chkbtn:disabled{opacity:.3;cursor:not-allowed}
.access-footer{display:block;width:100%;text-align:center;padding:.4rem;background:transparent;border:none;color:var(--m);font-family:var(--font);font-size:.6rem;cursor:pointer;margin-top:.3rem;transition:color .15s;opacity:.4}
.access-footer:hover{color:var(--t);opacity:1}
.contact-footer{border:none;padding:1.5rem 1rem 1rem;text-align:center;background:transparent}
.contact-footer a{color:var(--t2);text-decoration:none;font-size:.72rem;font-weight:400}.contact-footer a:hover{text-decoration:underline;color:var(--t)}
.contact-row{display:flex;align-items:center;justify-content:center;gap:.5rem;margin-bottom:.25rem;font-size:.72rem;color:var(--t2);opacity:.8}
.contact-row a{color:var(--t2);text-decoration:none}.contact-row a:hover{text-decoration:underline;color:var(--t)}
.dov{position:fixed;inset:0;z-index:160;background:rgba(0,0,0,.55);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .2s}.dov.open{opacity:1;pointer-events:all}
.drawer{position:fixed;bottom:0;left:0;right:0;z-index:170;background:var(--s);border-radius:18px 18px 0 0;max-height:85vh;display:flex;flex-direction:column;transform:translateY(100%);transition:transform .3s cubic-bezier(.16,1,.3,1)}.drawer.open{transform:translateY(0)}
.dhandle{width:36px;height:4px;background:var(--b2);border-radius:2px;margin:10px auto 4px;flex-shrink:0}
.dclose{position:absolute;top:.65rem;right:1rem;background:var(--s2);border:none;border-radius:50%;width:28px;height:28px;color:var(--m);cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center}.dclose:hover{color:var(--t)}
.mov{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.75);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:1rem}
.modal{background:var(--s);border:1px solid var(--b);border-radius:var(--radius-lg);padding:1.75rem;width:420px;max-width:95vw;animation:slideUp .25s cubic-bezier(.16,1,.3,1)}
@keyframes slideUp{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal h2{font-family:var(--font);font-size:1.2rem;font-weight:800;margin-bottom:1.1rem}
.del-warn{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.22);color:var(--amber);border-radius:var(--radius-sm);padding:.6rem .85rem;font-size:.78rem;margin-bottom:.7rem}
.addr-block{background:var(--s2);border:1px solid var(--b);border-radius:var(--radius);padding:.9rem 1rem;margin-bottom:.7rem}
.addr-block-title{font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--m);margin-bottom:.6rem;display:flex;align-items:center;gap:.5rem}
.autofill-tag{background:rgba(34,197,94,.1);color:var(--g);border-radius:4px;padding:2px 6px;font-size:.6rem;font-weight:600}
.fg{margin-bottom:.7rem}
.fl{display:block;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--m);margin-bottom:.3rem}
.fi{width:100%;padding:.55rem .8rem;background:var(--s2);border:1px solid var(--b);border-radius:var(--radius-sm);color:var(--t);font-family:var(--font);font-size:.85rem;outline:none;transition:border .15s}
.fi:focus{border-color:var(--a)}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
.osb{background:var(--s2);border-radius:var(--radius-sm);padding:.8rem;margin:.7rem 0;max-height:160px;overflow-y:auto}
.osi{display:flex;justify-content:space-between;font-size:.78rem;color:var(--m);padding:.18rem 0}
.ost{display:flex;justify-content:space-between;font-weight:700;font-size:.88rem;border-top:1px solid var(--b);padding-top:.45rem;margin-top:.3rem}
.macts{display:flex;gap:.6rem;margin-top:1rem}
.sbox{text-align:center}.sicon{font-size:2.8rem;margin-bottom:.7rem}
.sbox h2{font-size:1.2rem;font-weight:800;margin-bottom:.35rem}
.sbox p{color:var(--m);font-size:.83rem;margin-bottom:1rem;line-height:1.6}
.otag{font-size:1rem;font-weight:700;color:var(--a);margin-bottom:.5rem}
.call-btn{display:inline-flex;align-items:center;gap:.4rem;padding:.5rem 1.2rem;background:var(--s2);border:1px solid var(--b);border-radius:var(--radius-sm);color:var(--t);text-decoration:none;font-size:.8rem;font-weight:600;margin-top:.5rem;transition:all .15s}
.call-btn:hover{border-color:var(--a);color:var(--a)}
.payment-note{background:var(--s2);border:1px solid var(--b);border-radius:var(--radius-sm);padding:.6rem .85rem;font-size:.76rem;color:var(--t2);text-align:center;margin-bottom:.7rem}
.delivery-note{font-size:.72rem;color:var(--amber);text-align:center;margin-bottom:.5rem}
.bg{flex:1;padding:.6rem;border:1px solid var(--b);background:transparent;border-radius:var(--radius-sm);color:var(--t);font-family:var(--font);cursor:pointer;font-size:.83rem;transition:all .15s}
.bg:hover{background:var(--s2)}
.ba{flex:2;padding:.6rem;background:var(--a);color:white;border:none;border-radius:var(--radius-sm);cursor:pointer;font-family:var(--font);font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;transition:all .15s}
.ba:hover{background:var(--a2)}.ba:disabled{opacity:.35;cursor:not-allowed}
.alog{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:1rem}
.abox{background:var(--s);border:1px solid var(--b);border-radius:var(--radius-lg);padding:2.25rem;width:370px;max-width:95vw;text-align:center}
.abox h2{font-size:1.5rem;font-weight:800}.abox p{color:var(--m);font-size:.83rem;margin-bottom:1.3rem;margin-top:.35rem}
.aerr{background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.22);color:#f87171;border-radius:var(--radius-sm);padding:.45rem;font-size:.78rem;margin-bottom:.7rem}
.adm{min-height:100vh;background:var(--bg)}
.adm-nav{background:var(--s);border-bottom:1px solid var(--b);padding:0 1.75rem;height:60px;display:flex;align-items:center;justify-content:space-between}
.adm-nav img{height:40px;width:auto}
.adm-inner{padding:1.5rem;max-width:1200px;margin:0 auto}
.atop{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;flex-wrap:wrap;gap:.7rem}
.atop h1{font-size:1.5rem;font-weight:800}
.atabs{display:flex;border:1px solid var(--b);border-radius:var(--radius-sm);overflow:hidden;margin-bottom:1.25rem;background:var(--s)}
.atab{padding:.45rem 1.1rem;background:transparent;border:none;font-family:var(--font);font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--m);cursor:pointer;position:relative;transition:all .15s}
.atab.active{background:var(--a);color:white}.atab:hover:not(.active){background:var(--s2);color:var(--t)}
.nbadge{position:absolute;top:3px;right:3px;background:var(--r);color:white;border-radius:8px;font-size:.52rem;padding:0 4px;min-width:13px;text-align:center}
.astats{display:grid;grid-template-columns:repeat(4,1fr);gap:.85rem;margin-bottom:1.25rem}
.asc{background:var(--s);border:1px solid var(--b);border-radius:var(--radius);padding:1.1rem}
.asl{font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--m);margin-bottom:.35rem}
.asv{font-size:1.8rem;font-weight:800}
.ord-filter{display:flex;gap:.45rem;margin-bottom:1.1rem;flex-wrap:wrap}
.ord-fbtn{padding:.38rem .9rem;border-radius:20px;border:1px solid var(--b);background:transparent;color:var(--m);font-family:var(--font);font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.03em;cursor:pointer;transition:all .15s}
.ord-fbtn:hover{border-color:var(--a);color:var(--t)}.ord-fbtn.active{background:var(--a);border-color:var(--a);color:white}
.ord-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:.85rem}
.ord-card{background:var(--s);border:1px solid var(--b);border-radius:var(--radius);overflow:hidden;animation:slideUp .2s ease}
.ord-card.status-New{border-left:4px solid var(--r)}.ord-card.status-Preparing{border-left:4px solid var(--g)}.ord-card.status-Done{border-left:4px solid var(--m);opacity:.6}.ord-card.status-Cancelled{border-left:4px solid var(--amber);opacity:.7}
.cancel-reason{font-size:.72rem;color:var(--amber);padding:.4rem 1rem;border-top:1px solid var(--b)}
.cancel-modal-opts{display:flex;flex-direction:column;gap:.4rem;margin-bottom:.7rem}
.cancel-opt{display:flex;align-items:center;gap:.5rem;padding:.55rem .75rem;border:1px solid var(--b);border-radius:var(--radius-sm);cursor:pointer;font-size:.82rem;transition:all .12s}
.cancel-opt:hover{border-color:var(--amber)}.cancel-opt.sel{border-color:var(--amber);background:rgba(245,158,11,.06)}
.cancel-check{width:16px;height:16px;border-radius:50%;border:2px solid var(--b2);display:flex;align-items:center;justify-content:center;font-size:.55rem;flex-shrink:0;transition:all .12s}
.cancel-check.checked{background:var(--amber);border-color:var(--amber);color:#000}
.contacted-row{display:flex;align-items:center;gap:.5rem;padding:.5rem 0;font-size:.8rem;cursor:pointer}
.contacted-check{width:18px;height:18px;border-radius:4px;border:2px solid var(--b2);display:flex;align-items:center;justify-content:center;font-size:.6rem;transition:all .12s}
.contacted-check.checked{background:var(--a);border-color:var(--a);color:white}
.ord-card-head{padding:.85rem 1rem;display:flex;align-items:flex-start;justify-content:space-between}
.ord-num{font-size:1rem;font-weight:800}.ord-customer{font-size:.82rem;font-weight:500;margin-top:2px}.ord-time{font-size:.7rem;color:var(--m);margin-top:2px}
.ord-type{font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;background:var(--s2);border:1px solid var(--b2);border-radius:4px;padding:2px 6px}
.ord-status-pill{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border-radius:20px;padding:3px 10px}
.ord-items{padding:.75rem 1rem}
.ord-item-row{display:flex;justify-content:space-between;align-items:baseline;font-size:.8rem;padding:.2rem 0}
.ord-item-name{color:white;flex:1;font-weight:600}.ord-item-var{font-size:.68rem;color:var(--a);margin-left:4px;font-weight:500}
.ord-item-price{font-weight:600;white-space:nowrap;margin-left:.5rem}
.ord-item-note{font-size:.68rem;color:var(--amber);font-style:italic;padding-left:1rem}
.ord-notes{font-size:.73rem;color:var(--m);font-style:italic;padding:.5rem 1rem;border-top:1px solid var(--b)}
.ord-foot{padding:.75rem 1rem;border-top:1px solid var(--b);display:flex;align-items:center;justify-content:space-between}
.ord-total{font-weight:800;font-size:.95rem}.ord-actions{display:flex;gap:.35rem}
.ord-next-btn{padding:.35rem .85rem;border-radius:var(--radius-sm);border:none;cursor:pointer;font-family:var(--font);font-size:.73rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:white}
.ord-del-btn{padding:.35rem .6rem;border-radius:var(--radius-sm);border:1px solid rgba(220,38,38,.22);background:transparent;color:#f87171;cursor:pointer;font-size:.73rem}
.ord-del-btn:hover{background:rgba(220,38,38,.07)}
.ord-empty{text-align:center;padding:3.5rem 2rem;color:var(--m)}.ord-empty-icon{font-size:2.5rem;margin-bottom:.7rem;opacity:.4}.ord-empty p{font-size:.85rem}
.tw{background:var(--s);border:1px solid var(--b);border-radius:var(--radius);overflow:hidden}
.thb{display:flex;align-items:center;justify-content:space-between;padding:.85rem 1.1rem;border-bottom:1px solid var(--b);flex-wrap:wrap;gap:.45rem}
.thb h2{font-size:1.05rem;font-weight:800}
.tfs{display:flex;gap:.45rem;align-items:center;flex-wrap:wrap}
.fsel{background:var(--s2);border:1px solid var(--b);color:var(--t);border-radius:6px;padding:.32rem .55rem;font-family:var(--font);font-size:.75rem}
.abtn{padding:.42rem .9rem;background:var(--a);color:white;border:none;border-radius:var(--radius-sm);cursor:pointer;font-family:var(--font);font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
.abtn:hover{background:var(--a2)}
.tscr{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{padding:.6rem .9rem;text-align:left;font-size:.62rem;font-weight:700;color:var(--m);letter-spacing:.1em;text-transform:uppercase;border-bottom:1px solid var(--b);background:var(--s2)}
td{padding:.6rem .9rem;font-size:.8rem;border-bottom:1px solid rgba(255,255,255,.03);color:var(--t);vertical-align:middle}
tr:last-child td{border-bottom:none}tr:hover td{background:rgba(255,255,255,.015)}
.bdg{display:inline-block;padding:2px 9px;border-radius:10px;font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em}
.bon{background:rgba(34,197,94,.1);color:#4ade80}.boff{background:rgba(220,38,38,.1);color:#f87171}.boos{background:rgba(245,158,11,.1);color:#fbbf24}
.ttog{padding:.25rem .6rem;border-radius:6px;border:1px solid var(--b);background:transparent;color:var(--m);cursor:pointer;font-size:.7rem;font-family:var(--font);margin-right:.25rem}
.ttog:hover{background:var(--s2);color:var(--t)}.toos{border-color:rgba(245,158,11,.25);color:var(--amber)}.toos:hover{background:rgba(245,158,11,.07)}
.tedit{padding:.25rem .6rem;border-radius:6px;border:1px solid var(--b2);background:transparent;color:var(--m);cursor:pointer;font-size:.7rem;font-family:var(--font);margin-right:.25rem}
.tedit:hover{background:var(--s2);color:var(--t)}
.tdel{padding:.25rem .55rem;border-radius:6px;border:1px solid rgba(220,38,38,.22);background:transparent;color:#f87171;cursor:pointer;font-size:.7rem;font-family:var(--font)}
.tdel:hover{background:rgba(220,38,38,.07)}
.lout{padding:.38rem .9rem;background:transparent;border:1px solid var(--b);border-radius:var(--radius-sm);color:var(--m);cursor:pointer;font-family:var(--font);font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.03em}
.lout:hover{border-color:var(--r);color:var(--r)}
.bulk{background:var(--s);border:1px solid var(--b);border-radius:var(--radius);padding:1.35rem}
.bulk h2{font-size:1.15rem;font-weight:800;margin-bottom:.35rem}
.bulk p{color:var(--m);font-size:.8rem;margin-bottom:.85rem;line-height:1.6}
.bta{width:100%;height:150px;padding:.8rem;background:var(--s2);border:1px solid var(--b);border-radius:var(--radius-sm);color:var(--t);font-family:var(--font);font-size:.8rem;resize:vertical;outline:none}
.bta:focus{border-color:var(--a)}
.bprev{margin-top:.85rem;background:var(--s2);border-radius:var(--radius-sm);padding:.9rem;font-size:.78rem}
.bpi{padding:.25rem 0;border-bottom:1px solid var(--b);display:flex;gap:.85rem}.bpi:last-child{border-bottom:none}
.pok{color:#4ade80}.perr{color:#f87171}
.bacts{display:flex;gap:.6rem;margin-top:.85rem;align-items:center}.bnote{font-size:.76rem;color:var(--m)}
.loading-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);color:var(--m);font-family:var(--font);font-size:.9rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em}
.setting-row{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1rem;border:1px solid var(--b);border-radius:var(--radius);margin-bottom:.6rem;background:var(--s)}
.setting-label{font-size:.85rem;font-weight:600}.setting-desc{font-size:.7rem;color:var(--m);margin-top:2px}
.toggle-switch{position:relative;width:44px;height:24px;border-radius:12px;cursor:pointer;transition:all .2s}
.toggle-switch.on{background:var(--a)}.toggle-switch.off{background:var(--b2)}
.toggle-dot{position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:white;transition:all .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.toggle-switch.on .toggle-dot{left:23px}.toggle-switch.off .toggle-dot{left:3px}
@media(max-width:900px){.main-col{max-width:100%;padding:0}.cpanel{display:none!important}.astats{grid-template-columns:1fr 1fr}.ord-grid{grid-template-columns:1fr}}
@media(max-width:580px){.adm-inner{padding:1rem}.fr{grid-template-columns:1fr}.modal{padding:1.35rem 1.1rem}}
@media(max-width:768px){input,textarea,select,.fi,.ci-note-input,.search-box input,.bta,.cp-item-note{font-size:16px!important}}
`;

// ── OPTION POPUP ──
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
          ))}<p style={{fontSize:".72rem",color:"var(--m)",marginTop:".4rem"}}>Base ₹{basePrice}{Object.values(addons).some(Boolean)?` + ₹${item.addons.filter(a=>addons[a.label]).reduce((s,a)=>s+a.price,0)}`:""}</p></>
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

// ── CUSTOMER VIEW ──
function CustomerView({ menuItems, search, setSearch, onOrderPlaced, orders, onAccessClick, settings }) {
  const [activeCat, setActiveCat] = useState("All");
  const [cart, setCart] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sideCartOpen, setSideCartOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [popupItem, setPopupItem] = useState(null);
  const [form, setForm] = useState({phone:"",name:"",type:"Delivery",addr:{house:"",apartment:"",street:"",place:"",landmark:""},notes:""});
  const [orderNum] = useState(() => Math.floor(Math.random()*9000)+1000);
  const [autoFilled, setAutoFilled] = useState(false);
  const DELIVERY_MIN = settings.deliveryMinEnabled ? 300 : 0;
  const GST_RATE = 0.05;
  const storeOpen = isStoreOpen(settings);
  const setAddr = (field,val) => setForm(f=>({...f,addr:{...f.addr,[field]:val}}));
  const addrComplete = form.addr.house.trim() && form.addr.street.trim() && form.addr.place.trim();
  const fullAddress = (addr) => [addr.house,addr.apartment,addr.street,addr.place,addr.landmark].filter(Boolean).join(", ");
  const visibleItems = useMemo(() => menuItems.filter(i => i.available), [menuItems]);
  const cats = useMemo(() => [...new Set(visibleItems.map(i=>i.category))], [visibleItems]);
  const handlePhoneChange = async (val) => {
    setForm(f=>({...f,phone:val})); setAutoFilled(false);
    if (val.length >= 10) { const cust = await findCustomerByPhone(val); if (cust) { setForm(f=>({...f,phone:val,name:cust.name||f.name,addr:{house:cust.house||"",apartment:cust.apartment||"",street:cust.street||"",place:cust.place||"",landmark:cust.landmark||""}})); setAutoFilled(true); } }
  };
  const menuScrollEl = useRef(null);
  const scrollToCat = (cat) => {
    setActiveCat(cat); setSearch("");
    if (cat === "All") { if(menuScrollEl.current) menuScrollEl.current.scrollTo({top:0,behavior:"smooth"}); else window.scrollTo({top:0,behavior:"smooth"}); return; }
    setTimeout(() => {
      const el = document.getElementById(`cat-${cat.replace(/\s+/g,"-")}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };
  const filtered = useMemo(() => {
    if (search.trim()) { const q=search.toLowerCase(); return visibleItems.filter(i=>i.name.toLowerCase().includes(q)||i.category.toLowerCase().includes(q)); }
    return visibleItems;
  }, [visibleItems,search]);
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
  const oosInCart = cart.some(c => { const mi = menuItems.find(m=>m.id===c.id); return mi && (mi.outOfStock || !mi.available); });
  const canPlace = storeOpen&&!oosInCart&&form.phone.trim()&&form.name.trim()&&!deliveryShort&&(form.type==="Pickup"||addrComplete);
  const placeOrder = async () => {
    if (!storeOpen) return;
    const order = {id:Date.now(),num:orderNum,customer:form.name,phone:form.phone,address:form.type==="Delivery"?fullAddress(form.addr):null,addr:form.type==="Delivery"?form.addr:null,type:form.type,notes:form.type==="Delivery"&&form.addr.landmark?form.addr.landmark:"",items:cart.map(c=>({name:cleanName(c.name),variant:c.variant,qty:c.qty,unitPrice:c.unitPrice,itemNote:c.itemNote||""})),total,status:"New",placedAt:new Date()};
    await insertOrder(order); await upsertCustomer({phone:form.phone,name:form.name,...(form.type==="Delivery"?form.addr:{})}); onOrderPlaced(order); setOrderPlaced(true); setCart([]);
  };
  const reset = () => { setOrderPlaced(false);setShowCheckout(false);setForm({phone:"",name:"",type:"Delivery",addr:{house:"",apartment:"",street:"",place:"",landmark:""},notes:""});setAutoFilled(false); };
  const handleItemQtyChange = (item, d, e) => { if(e)e.stopPropagation(); const entries=cart.filter(c=>c.id===item.id); if(entries.length===1)changeQty(entries[0].key,d); else if(entries.length>1)setDrawerOpen(true); };

  const cartBody = (<>
    <div className="chead"><h2>Your Order</h2><p>{totalItems===0?"No items yet":`${totalItems} item${totalItems>1?"s":""}`}</p></div>
    <div className="cbody">{cart.length===0?<div className="cempty"><div className="cempty-icon"><svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:.4}}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div><p>Add items from the menu</p></div>
      :cart.map(item=>(<div key={item.key} className="ci"><div className="ci-i"><div className="ci-n">{cleanName(item.name)}</div>{item.variant&&<div className="ci-v">{item.variant}</div>}<div className="ci-p">₹{item.unitPrice} × {item.qty} = ₹{(item.unitPrice*item.qty).toFixed(0)}</div>
      <input className="ci-note-input" placeholder="Special Note" value={item.itemNote||""} onChange={e=>updateItemNote(item.key,e.target.value)} onClick={e=>e.stopPropagation()}/></div>
      <div className="qc"><button className="qb" onClick={()=>changeQty(item.key,-1)}>−</button><span className="qn">{item.qty}</span><button className="qb" onClick={()=>changeQty(item.key,1)}>+</button></div></div>))}</div>
    {cart.length>0&&<div className="cfoot">
      <div className="ctotal" style={{fontSize:".78rem",fontWeight:500,opacity:.65}}><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
      {discountPct>0&&<div className="discount-line"><span>Discount ({discountPct}%)</span><span>-₹{discountAmt.toFixed(0)}</span></div>}
      <div className="ctotal" style={{fontSize:".74rem",color:"var(--m)",fontWeight:400}}><span>GST (5%)</span><span>₹{gstAmt.toFixed(0)}</span></div>
      <div className="ctotal" style={{borderTop:"1px solid var(--b)",paddingTop:".4rem",fontSize:".92rem"}}><span>Total</span><span style={{color:"var(--a)"}}>₹{total.toFixed(0)}</span></div>
      <button className="chkbtn" onClick={()=>{setDrawerOpen(false);setShowCheckout(true);}}>Checkout →</button>
    </div>}
  </>);

  return (<>
    {/* Offer banner */}
    {settings.offerEnabled&&discountPct>0&&<div className="offer-banner">🏷️ Order From Our App or Website — Get {discountPct}% Off Your Order!</div>}
    <div className="layout">
      <div className="main-col">
        <div className="sticky-top">
          <nav className="nav">
            <div className="nav-logo"><img src={LOGO_SRC} alt="Grillin'" onError={e=>{e.target.style.display='none'}}/></div>
            <button className="cart-pill" onClick={()=>{if(window.innerWidth>900)setSideCartOpen(true);else setDrawerOpen(true);}}><CartIcon/>{totalItems>0?<> ₹{total.toFixed(0)}<span className="cart-badge">{totalItems}</span></>:" Cart"}</button>
          </nav>
          <div className="search-wrap"><div className="search-box"><span className="search-icon"><SearchIcon/></span><input placeholder="What are you craving?" value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button className="search-clear" onClick={()=>setSearch("")}><ClearIcon/></button>}</div></div>
          <div className="cat-strip">
            <button className={`cat-pill ${activeCat==="All"&&!search?"active":""}`} onClick={()=>scrollToCat("All")}>All</button>
            {cats.map(cat=><button key={cat} className={`cat-pill ${activeCat===cat&&!search?"active":""}`} onClick={()=>scrollToCat(cat)}>{cat}</button>)}
          </div>
        </div>
        <div className="menu-scroll" ref={menuScrollEl}>
          {!storeOpen&&<div className="closed-banner">🕐 We&apos;re currently closed</div>}
          <div className="menu-area">
            {search&&<div className="snote">{filtered.length} result{filtered.length!==1?"s":""} for &ldquo;{search}&rdquo;</div>}
            {Object.entries(grouped).map(([cat,items])=>(<div key={cat} id={`cat-${cat.replace(/\s+/g,"-")}`}>
              <div className="sec-head">{cat}</div>
              <div className="mcard-grid">
              {items.map(item=>{const qty=itemQty(item);const tag=tagLabel(item);return(
                <div key={item.id} className={`mcard ${item.outOfStock?"oos":""}`} onClick={()=>handleClick(item)}>
                  <div className="mc-info">
                    <div className="mc-name">{cleanName(item.name)}</div>
                    {item.description&&<div className="mc-desc">{item.description}</div>}
                    <div style={{display:"flex",alignItems:"center",gap:".35rem"}}><FoodTypeDot type={item.foodType}/><div className="mc-price">{displayPrice(item)}</div></div>
                    {tag&&!item.outOfStock&&<div className="mc-tag">{tag}</div>}
                  </div>
                  <div className="mc-right">
                    {item.outOfStock?<span className="oos-badge">Out of Stock</span>:
                      qty>0?(<div className="zomato-qty"><button onClick={e=>handleItemQtyChange(item,-1,e)}>−</button><span>{qty}</span><button onClick={e=>{e.stopPropagation();handleClick(item);}}>+</button></div>):
                      (<button className="zomato-add" onClick={e=>{e.stopPropagation();handleClick(item);}}>ADD</button>)
                    }
                  </div>
                </div>
              );})}
              </div>
            </div>))}
            {filtered.length===0&&<div style={{textAlign:"center",padding:"3rem",color:"var(--m)"}}>No items found</div>}
            <div className="contact-footer">
              <div className="contact-row">📞 <a href={`tel:${PHONE_1}`}>{PHONE_1}</a> · <a href={`tel:${PHONE_2}`}>{PHONE_2}</a></div>
              <div className="contact-row">📍 <a href="https://maps.app.goo.gl/dvy2KWqhZ542ABgE8?g_st=ic" target="_blank" rel="noopener noreferrer">Vignan Nagar Main Rd, Bangalore</a></div>
              <button className="access-footer" onClick={onAccessClick}>Restaurant Access</button>
            </div>
          </div>
        </div>
      </div>
      {/* Desktop side cart */}
      <div className={`cpanel-overlay ${sideCartOpen?"open":""}`} onClick={()=>setSideCartOpen(false)}/>
      <div className={`cpanel ${sideCartOpen?"open":""}`}>
        <div className="cp-header"><h2>🛒 Your Order</h2><button className="cp-close" onClick={()=>setSideCartOpen(false)}>✕</button></div>
        <div className="cp-body">
          {cart.length===0?<div className="cp-empty"><div className="cp-empty-icon" style={{opacity:.4}}><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg></div><p>Add items from the menu</p></div>
          :cart.map(item=>(<div key={item.key} className="cp-item"><div className="cp-item-info"><div className="cp-item-name">{cleanName(item.name)}</div>{item.variant&&<div className="cp-item-variant">{item.variant}</div>}<div className="cp-item-price">₹{item.unitPrice} × {item.qty} = ₹{(item.unitPrice*item.qty).toFixed(0)}</div>
          <input className="cp-item-note" placeholder="Special Note" value={item.itemNote||""} onChange={e=>updateItemNote(item.key,e.target.value)} onClick={e=>e.stopPropagation()}/></div>
          <div className="cp-qty"><button onClick={()=>changeQty(item.key,-1)}>−</button><span>{item.qty}</span><button onClick={()=>changeQty(item.key,1)}>+</button></div></div>))}
        </div>
        {cart.length>0&&<div className="cp-foot">
          <div className="ctotal" style={{fontSize:".78rem",fontWeight:500,opacity:.65}}><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
          {discountPct>0&&<div className="discount-line"><span>Discount ({discountPct}%)</span><span>-₹{discountAmt.toFixed(0)}</span></div>}
          <div className="ctotal" style={{fontSize:".74rem",color:"var(--m)",fontWeight:400}}><span>GST (5%)</span><span>₹{gstAmt.toFixed(0)}</span></div>
          <div className="ctotal" style={{borderTop:"1px solid var(--b)",paddingTop:".4rem",fontSize:".92rem"}}><span>Total</span><span style={{color:"var(--a)"}}>₹{total.toFixed(0)}</span></div>
          <button className="chkbtn" onClick={()=>{setSideCartOpen(false);setShowCheckout(true);}}>Proceed to Checkout →</button>
        </div>}
      </div>
    </div>
    {/* Mobile cart drawer */}
    <div className={`dov ${drawerOpen?"open":""}`} onClick={()=>setDrawerOpen(false)}/><div className={`drawer ${drawerOpen?"open":""}`}><div className="dhandle"/><button className="dclose" onClick={()=>setDrawerOpen(false)}>✕</button><div style={{display:"flex",flexDirection:"column",overflow:"hidden",flex:1}}>{cartBody}</div></div>
    {popupItem&&<OptionPopup item={popupItem} onConfirm={confirmOption} onClose={()=>setPopupItem(null)}/>}
    {showCheckout&&!orderPlaced&&(<div className="mov"><div className="modal" style={{maxHeight:"90vh",overflowY:"auto"}}>
      <h2>Complete Your Order</h2>
      {!storeOpen&&<div className="del-warn">🕐 We're currently closed. You cannot place orders right now.</div>}
      <div className="fg"><label className="fl">Mobile Number *</label><input className="fi" value={form.phone} onChange={e=>handlePhoneChange(e.target.value)} placeholder="Enter mobile number"/></div>
      <div className="fg"><label className="fl">Your Name *</label><input className="fi" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></div>
      <div className="fg"><label className="fl">Order Type</label><div style={{display:"flex",gap:".45rem"}}>{["Delivery","Pickup"].map(t=>(<div key={t} onClick={()=>setForm({...form,type:t})} style={{flex:1,padding:".6rem",borderRadius:"var(--radius-sm)",border:`2px solid ${form.type===t?"var(--a)":"var(--b)"}`,background:form.type===t?"rgba(220,38,38,.06)":"var(--s2)",cursor:"pointer",textAlign:"center",fontSize:".82rem",fontWeight:form.type===t?700:500,textTransform:"uppercase",letterSpacing:".03em"}}>{t==="Delivery"?"🛵 Delivery":"🏃 Pickup"}</div>))}</div></div>
      {form.type==="Delivery"&&<>
        <div className="delivery-note">🛵 We deliver within {settings.deliveryRadius||3} km only</div>
        <div className="addr-block"><div className="addr-block-title">🏠 Delivery Address *{autoFilled&&<span className="autofill-tag">✓ Auto-filled</span>}</div>
        <div className="fg"><label className="fl">House / Flat No. *</label><input className="fi" value={form.addr.house} onChange={e=>setAddr("house",e.target.value)}/></div>
        <div className="fg"><label className="fl">Apartment / Building</label><input className="fi" value={form.addr.apartment} onChange={e=>setAddr("apartment",e.target.value)}/></div>
        <div className="fg"><label className="fl">Street *</label><input className="fi" value={form.addr.street} onChange={e=>setAddr("street",e.target.value)}/></div>
        <div className="fg"><label className="fl">Place / Area *</label><input className="fi" value={form.addr.place} onChange={e=>setAddr("place",e.target.value)}/></div>
        <div className="fg" style={{marginBottom:0}}><label className="fl">Address Instructions</label><input className="fi" value={form.addr.landmark} onChange={e=>setAddr("landmark",e.target.value)} placeholder="Gate code, directions, etc."/></div></div>
      </>}
      {deliveryShort&&<div className="del-warn">⚠️ Minimum delivery order is <strong>₹{DELIVERY_MIN}</strong> — add ₹{Math.ceil(DELIVERY_MIN-subtotal)} more</div>}
      {oosInCart&&<div className="del-warn">⚠️ Some items in your cart are no longer available. Please remove them to proceed.</div>}
      <div className="osb">{cart.map(i=><div key={i.key} className="osi"><span>{cleanName(i.name)}{i.variant?` (${i.variant})`:""} ×{i.qty}{i.itemNote?` — ${i.itemNote}`:""}</span><span>₹{(i.unitPrice*i.qty).toFixed(0)}</span></div>)}
        {discountPct>0&&<div className="osi" style={{color:"var(--g)"}}><span>Discount ({discountPct}%)</span><span>-₹{discountAmt.toFixed(0)}</span></div>}
        <div className="osi"><span>GST (5%)</span><span>₹{gstAmt.toFixed(0)}</span></div>
        <div className="ost"><span>Total</span><span>₹{total.toFixed(0)}</span></div></div>
      <div className="payment-note">{form.type==="Delivery"?"💳 Payment on Delivery — Cash or UPI accepted":"💳 Pay at Restaurant"}</div>
      <div className="macts"><button className="bg" onClick={()=>setShowCheckout(false)}>Back</button><button className="ba" onClick={placeOrder} disabled={!canPlace}>Place Order</button></div>
    </div></div>)}
    {orderPlaced&&<div className="mov"><div className="modal"><div className="sbox"><div className="sicon">🔥</div><h2>Order Placed!</h2><div className="otag">Order #{orderNum}</div><p>Thank you, {form.name}!<br/>Your order has been received and is being prepared.</p><p style={{fontSize:".78rem",color:"var(--m)",marginBottom:".7rem"}}>Need to change or cancel? Call us immediately.</p><a href={`tel:${PHONE_1}`} className="call-btn"><PhoneIcon/> Call {PHONE_1}</a><div style={{marginTop:"1rem"}}><button className="ba" style={{width:"100%"}} onClick={reset}>Place New Order</button></div></div></div></div>}
  </>);
}

// ── ORDER DASHBOARD — now shows item-wise special instructions (#3) ──
function OrderDashboard({ orders, onAdvance, onRemove, onCancel }) {
  const [filter, setFilter] = useState("All");
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [contacted, setContacted] = useState(false);
  const CANCEL_REASONS = ["Item unavailable","Customer asked to cancel","Restaurant busy","No delivery person"];
  const counts = useMemo(()=>ALL_STATUSES.reduce((acc,s)=>({...acc,[s]:orders.filter(o=>o.status===s).length}),{}), [orders]);
  const displayed = useMemo(()=>{
    const o=filter==="All"?orders:orders.filter(o=>o.status===filter);
    const priority={New:0,Preparing:1,Done:2,Cancelled:3};
    return [...o].sort((a,b)=>{
      const pa=priority[a.status]??9, pb=priority[b.status]??9;
      if(pa!==pb) return pa-pb;
      return new Date(b.placedAt)-new Date(a.placedAt);
    });
  },[orders,filter]);
  const handleCancel = () => {
    if (!cancelReason) return;
    onCancel(cancelModal, cancelReason, contacted);
    setCancelModal(null); setCancelReason(""); setContacted(false);
  };
  return (<div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:".85rem",marginBottom:"1.25rem"}}>
      <div className="asc"><div className="asl">Total Orders</div><div className="asv">{orders.length}</div></div>
      <div className="asc"><div className="asl" style={{color:"#ef4444"}}>New</div><div className="asv">{counts["New"]||0}</div></div>
      <div className="asc"><div className="asl" style={{color:"#22c55e"}}>Preparing</div><div className="asv">{counts["Preparing"]||0}</div></div>
      <div className="asc"><div className="asl" style={{color:"#f59e0b"}}>Cancelled</div><div className="asv">{counts["Cancelled"]||0}</div></div>
    </div>
    <div className="ord-filter">
      {["All",...ALL_STATUSES].map(s=><button key={s} className={`ord-fbtn ${filter===s?"active":""}`} onClick={()=>setFilter(s)}>{s}{s!=="All"&&counts[s]>0?` (${counts[s]})`:""}</button>)}
    </div>
    {displayed.length===0?<div className="ord-empty"><div className="ord-empty-icon">📋</div><p>{filter==="All"?"No orders yet":"No "+filter+" orders"}</p></div>
    :<div className="ord-grid">{displayed.map(order=>{
      const nextStatus=STATUS_FLOW[STATUS_FLOW.indexOf(order.status)+1];
      const btnColor=order.status==="New"?"#dc2626":order.status==="Preparing"?"#16a34a":"#555";
      return(<div key={order.id} className={`ord-card status-${order.status}`}>
        <div className="ord-card-head"><div>
          <div style={{display:"flex",alignItems:"center",gap:".45rem",marginBottom:".15rem"}}><div className="ord-num">#{order.num}</div><span className="ord-type">{order.type==="Delivery"?"🛵 Delivery":"🏃 Pickup"}</span></div>
          <div className="ord-customer">👤 {order.customer}{order.phone?` · ${order.phone}`:""}</div>
          {order.address&&<div className="ord-time">📍 {order.address}</div>}
          {order.notes&&<div className="ord-time" style={{color:"var(--t2)"}}>📝 {order.notes}</div>}
          <div className="ord-time">🕐 {fmt(order.placedAt)}</div>
        </div><span className="ord-status-pill" style={{background:STATUS_BG[order.status],color:STATUS_COLOR[order.status]}}>{order.status}</span></div>
        <div className="ord-items">{order.items.map((item,i)=><div key={i}>
          <div className="ord-item-row"><span className="ord-item-name">{item.name}{item.variant&&<span className="ord-item-var">({item.variant})</span>} ×{item.qty}</span><span className="ord-item-price">₹{(item.unitPrice*item.qty).toFixed(0)}</span></div>
          {item.itemNote&&<div className="ord-item-note">↳ {item.itemNote}</div>}
        </div>)}</div>
        {order.cancelReason&&<div className="cancel-reason">❌ {order.cancelReason}{order.contactedCustomer?" · ✓ Customer contacted":""}</div>}
        <div className="ord-foot"><div className="ord-total">₹{order.total.toFixed(0)}</div><div className="ord-actions">
          {nextStatus&&order.status!=="Cancelled"&&<button className="ord-next-btn" style={{background:btnColor}} onClick={()=>onAdvance(order.id,nextStatus)}>{nextStatus==="Preparing"?"Start Preparing":"Mark Done"}</button>}
          {(order.status==="New"||order.status==="Preparing")&&<button className="ord-del-btn" onClick={()=>{setCancelModal(order.id);setCancelReason("");setContacted(false);}}>Cancel</button>}
        </div></div>
      </div>);})}</div>}
    {/* Cancel modal */}
    {cancelModal&&<div className="mov"><div className="modal">
      <h2>Cancel Order</h2>
      <p style={{color:"var(--m)",fontSize:".82rem",marginBottom:".8rem"}}>Select a reason for cancellation</p>
      <div className="cancel-modal-opts">
        {CANCEL_REASONS.map(r=><div key={r} className={`cancel-opt ${cancelReason===r?"sel":""}`} onClick={()=>setCancelReason(r)}>
          <div className={`cancel-check ${cancelReason===r?"checked":""}`}>{cancelReason===r?"✓":""}</div>{r}
        </div>)}
      </div>
      <div className="contacted-row" onClick={()=>setContacted(!contacted)}>
        <div className={`contacted-check ${contacted?"checked":""}`}>{contacted?"✓":""}</div>
        Contacted customer about cancellation
      </div>
      <div className="macts"><button className="bg" onClick={()=>setCancelModal(null)}>Back</button><button className="ba" onClick={handleCancel} disabled={!cancelReason}>Cancel Order</button></div>
    </div></div>}
  </div>);
}

// ── ADMIN LOGIN ──
function AdminLogin({ onLogin, password }) {
  const [pwd,setPwd]=useState(""); const [err,setErr]=useState(false);
  const go=()=>pwd===password?onLogin():setErr(true);
  return (<div className="alog"><div className="abox"><h2>Grillin&apos;</h2><p>Restaurant Access — enter password to continue</p>{err&&<div className="aerr">Incorrect password. Try again.</div>}<div className="fg"><label className="fl">Password</label><input className="fi" type="password" value={pwd} onChange={e=>{setPwd(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&go()}/></div><button className="ba" style={{width:"100%",marginTop:".4rem"}} onClick={go}>Sign In</button></div></div>);
}

// ── SETTINGS — with order timing, auto-clear ──
function SettingsPanel({ settings, setSettings, adminPassword, setAdminPassword }) {
  const [showPwdChange, setShowPwdChange] = useState(false);
  const [oldPwd, setOldPwd] = useState(""); const [newPwd, setNewPwd] = useState("");
  const [pwdMsg, setPwdMsg] = useState(""); const [pwdOk, setPwdOk] = useState(false);
  const changePassword = async () => { if(oldPwd!==adminPassword){setPwdMsg("Current password is incorrect");return;} if(newPwd.length<4){setPwdMsg("New password must be at least 4 characters");return;} setAdminPassword(newPwd);await updateSetting("admin_password",newPwd);setShowPwdChange(false);setOldPwd("");setNewPwd("");setPwdMsg("");setPwdOk(true);setTimeout(()=>setPwdOk(false),3000); };
  const toggleSetting = async (key, dbKey) => { setSettings(s=>{const v=!s[key];updateSetting(dbKey,String(v));return{...s,[key]:v};}); };
  const updateOfferPercent = async (val) => { const pct=Math.min(50,Math.max(0,parseInt(val)||0));setSettings(s=>({...s,offerPercent:pct}));updateSetting("offer_percent",String(pct)); };
  const updateTime = async (key, dbKey, val) => { setSettings(s=>({...s,[key]:val}));updateSetting(dbKey,val); };
  const updateAutoClear = async (val) => { setSettings(s=>({...s,autoClear:val}));updateSetting("auto_clear",val); };
  const Toggle = ({ on, onToggle }) => (<div className={`toggle-switch ${on?"on":"off"}`} onClick={onToggle}><div className="toggle-dot"/></div>);
  return (<div>
    <div style={{marginBottom:"1.1rem"}}><h2 style={{fontSize:"1.15rem",fontWeight:800,marginBottom:".7rem"}}>Settings</h2></div>
    <div className="setting-row"><div><div className="setting-label">🔒 Change Admin Password</div><div className="setting-desc">Update the password used to access the admin panel</div></div><button className="abtn" onClick={()=>setShowPwdChange(!showPwdChange)}>{showPwdChange?"Cancel":"Change"}</button></div>
    {pwdOk&&<div style={{background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.22)",color:"#4ade80",borderRadius:"var(--radius-sm)",padding:".45rem .75rem",fontSize:".78rem",marginBottom:".45rem"}}>✓ Password updated successfully</div>}
    {showPwdChange&&<div style={{background:"var(--s)",border:"1px solid var(--b)",borderRadius:"var(--radius)",padding:"1rem",marginBottom:".6rem",marginTop:"-.25rem"}}>{pwdMsg&&<div className="aerr" style={{marginBottom:".45rem"}}>{pwdMsg}</div>}<div className="fg"><label className="fl">Current Password</label><input className="fi" type="password" value={oldPwd} onChange={e=>{setOldPwd(e.target.value);setPwdMsg("");}}/></div><div className="fg"><label className="fl">New Password</label><input className="fi" type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)}/></div><button className="ba" onClick={changePassword}>Update Password</button></div>}
    <div className="setting-row"><div><div className="setting-label">🛵 Minimum ₹300 for Delivery</div><div className="setting-desc">Require a minimum order of ₹300 for delivery orders</div></div><Toggle on={settings.deliveryMinEnabled} onToggle={()=>toggleSetting("deliveryMinEnabled","delivery_min_enabled")}/></div>
    <div className="setting-row" style={{flexWrap:"wrap",gap:".45rem"}}><div><div className="setting-label">🏷️ Offer / Discount</div><div className="setting-desc">Apply a percentage discount to all orders</div></div><div style={{display:"flex",alignItems:"center",gap:".45rem"}}><Toggle on={settings.offerEnabled} onToggle={()=>toggleSetting("offerEnabled","offer_enabled")}/>{settings.offerEnabled&&<div style={{display:"flex",alignItems:"center",gap:".25rem"}}><input className="fi" style={{width:55,textAlign:"center",padding:".3rem"}} type="number" min="1" max="50" value={settings.offerPercent} onChange={e=>updateOfferPercent(e.target.value)}/><span style={{fontSize:".82rem",color:"var(--m)"}}>%</span></div>}</div></div>
    {/* Order timing */}
    <div className="setting-row" style={{flexWrap:"wrap",gap:".45rem"}}><div><div className="setting-label">🕐 Order Timing</div><div className="setting-desc">Only accept orders during set hours</div></div>
      <div style={{display:"flex",alignItems:"center",gap:".45rem"}}><Toggle on={settings.orderTimingEnabled} onToggle={()=>toggleSetting("orderTimingEnabled","order_timing_enabled")}/>
      {settings.orderTimingEnabled&&<div style={{display:"flex",alignItems:"center",gap:".3rem"}}><input className="fi" style={{width:80,textAlign:"center",padding:".3rem"}} type="time" value={settings.openTime||"10:00"} onChange={e=>updateTime("openTime","open_time",e.target.value)}/><span style={{color:"var(--m)",fontSize:".78rem"}}>to</span><input className="fi" style={{width:80,textAlign:"center",padding:".3rem"}} type="time" value={settings.closeTime||"23:00"} onChange={e=>updateTime("closeTime","close_time",e.target.value)}/></div>}
      </div></div>
    {/* Auto-clear done orders */}
    <div className="setting-row" style={{flexWrap:"wrap",gap:".45rem"}}><div><div className="setting-label">🧹 Auto-Clear Done Orders</div><div className="setting-desc">Automatically clear completed orders after a set period</div></div>
      <select className="fsel" value={settings.autoClear||"off"} onChange={e=>updateAutoClear(e.target.value)}>
        <option value="off">Off</option><option value="weekly">Weekly (7 days)</option><option value="monthly">Monthly (30 days)</option>
      </select>
    </div>
    {/* Delivery radius */}
    <div className="setting-row" style={{flexWrap:"wrap",gap:".45rem"}}><div><div className="setting-label">📍 Delivery Radius</div><div className="setting-desc">Maximum delivery distance shown to customers</div></div>
      <div style={{display:"flex",alignItems:"center",gap:".25rem"}}><input className="fi" style={{width:55,textAlign:"center",padding:".3rem"}} type="number" min="1" max="50" value={settings.deliveryRadius||3} onChange={e=>{const v=Math.max(1,parseInt(e.target.value)||3);setSettings(s=>({...s,deliveryRadius:v}));updateSetting("delivery_radius",String(v));}}/><span style={{fontSize:".82rem",color:"var(--m)"}}>km</span></div>
    </div>
  </div>);
}

// ── ADMIN PANEL — fixed item add with sortOrder and category input (#2) ──
function AdminPanel({ menuItems, setMenuItems, orders, setOrders, onLogout, settings, setSettings, adminPassword, setAdminPassword }) {
  const [tab, setTab] = useState("orders");
  const [fCat,setFCat]=useState("All"); const [fSt,setFSt]=useState("All");
  const [showAdd,setShowAdd]=useState(false); const [editItem,setEditItem]=useState(null);
  const [bulk,setBulk]=useState(""); const [bParsed,setBParsed]=useState([]);
  const [newItem,setNewItem]=useState({name:"",category:"",price:"",description:"",foodType:"nonveg",sortOrder:""});
  const [newCatInput,setNewCatInput]=useState("");
  const [delPwdModal, setDelPwdModal] = useState(null); const [delPwd, setDelPwd] = useState(""); const [delPwdErr, setDelPwdErr] = useState(false);
  const cats=[...new Set(menuItems.map(i=>i.category))];
  const avail=menuItems.filter(i=>i.available&&!i.outOfStock).length;
  const outOfStockCount=menuItems.filter(i=>i.outOfStock).length;
  const newOrders=orders.filter(o=>o.status==="New").length;
  const filtered=menuItems.filter(i=>{if(fCat!=="All"&&i.category!==fCat)return false;if(fSt==="Available"&&(!i.available||i.outOfStock))return false;if(fSt==="Unavailable"&&i.available)return false;if(fSt==="Out of Stock"&&!i.outOfStock)return false;return true;});
  const tog=async(id)=>{const item=menuItems.find(i=>i.id===id);if(!item)return;const updated={...item,available:!item.available};setMenuItems(p=>p.map(i=>i.id===id?updated:i));await updateMenuItem(updated);};
  const togOos=async(id)=>{const item=menuItems.find(i=>i.id===id);if(!item)return;const updated={...item,outOfStock:!item.outOfStock};setMenuItems(p=>p.map(i=>i.id===id?updated:i));await updateMenuItem(updated);};
  const requestDelete = (id) => { setDelPwdModal(id); setDelPwd(""); setDelPwdErr(false); };
  const confirmDelete = async (id) => { setMenuItems(p=>p.filter(i=>i.id!==id)); await deleteMenuItem(id); setDelPwdModal(null); };
  const handleDelPwd = () => { if(delPwd===adminPassword)confirmDelete(delPwdModal); else setDelPwdErr(true); };
  const saveEdit=async(updated)=>{setMenuItems(p=>p.map(i=>i.id===updated.id?updated:i));setEditItem(null);await updateMenuItem(updated);};
  // Fixed: use returned data from insertMenuItem so it persists (#2)
  const addIt=async()=>{
    if(!newItem.name||!newItem.price)return;
    const cat = newCatInput.trim() || newItem.category || cats[0] || "Uncategorized";
    const item={name:newItem.name,category:cat,price:newItem.price,description:newItem.description||"",foodType:newItem.foodType||"nonveg",available:true,outOfStock:false,sortOrder:parseInt(newItem.sortOrder)||Date.now(),id:Date.now()};
    const saved = await insertMenuItem(item);
    if(saved) setMenuItems(p=>[...p,saved]); else setMenuItems(p=>[...p,item]);
    setNewItem({name:"",category:"",price:"",description:"",foodType:"nonveg",sortOrder:""});setNewCatInput("");setShowAdd(false);
  };
  const handleAdvance=async(id,ns)=>{setOrders(p=>p.map(o=>o.id===id?{...o,status:ns}:o));await updateOrderStatus(id,ns);};
  const handleRemove=async(id)=>{setOrders(p=>p.filter(o=>o.id!==id));await deleteOrder(id);};
  const handleCancel=async(id,reason,contactedCustomer)=>{setOrders(p=>p.map(o=>o.id===id?{...o,status:"Cancelled",cancelReason:reason,contactedCustomer}:o));await cancelOrder(id,reason,contactedCustomer);};
  const parseBulk=(t)=>{setBParsed(t.trim().split("\n").filter(l=>l.trim()).map((line,i)=>{const p=line.split(",").map(x=>x.trim());return p.length<3?{line:i+1,err:"Need: Name, Category, Price",raw:line}:{line:i+1,name:p[0],category:p[1],price:p[2],description:p[3]||"",emoji:p[4]||"",ok:true};}));};
  const importBulk=async()=>{const items=bParsed.filter(x=>x.ok).map(x=>({id:Date.now()+Math.random(),name:x.name,category:x.category,price:x.price,description:x.description,emoji:x.emoji,available:true,outOfStock:false}));setMenuItems(p=>[...p,...items]);setBulk("");setBParsed([]);setTab("manage");await bulkInsertMenuItems(items);};
  return (<div className="adm">
    <div className="adm-nav"><img src={LOGO_SRC} alt="Grillin'" onError={e=>{e.target.style.display='none'}}/><button className="lout" onClick={onLogout}>Sign Out</button></div>
    <div className="adm-inner">
      <div className="atop"><h1>Dashboard</h1></div>
      <div className="atabs">
        <button className={`atab ${tab==="orders"?"active":""}`} onClick={()=>setTab("orders")}>Orders {newOrders>0&&<span className="nbadge">{newOrders}</span>}</button>
        <button className={`atab ${tab==="manage"?"active":""}`} onClick={()=>setTab("manage")}>Menu</button>
        <button className={`atab ${tab==="bulk"?"active":""}`} onClick={()=>setTab("bulk")}>Bulk Add</button>
        <button className={`atab ${tab==="settings"?"active":""}`} onClick={()=>setTab("settings")}>Settings</button>
      </div>
      {tab==="orders"&&<OrderDashboard orders={orders} onAdvance={handleAdvance} onRemove={handleRemove} onCancel={handleCancel}/>}
      {tab==="settings"&&<SettingsPanel settings={settings} setSettings={setSettings} adminPassword={adminPassword} setAdminPassword={setAdminPassword}/>}
      {tab==="manage"&&<><div className="astats"><div className="asc"><div className="asl">Total</div><div className="asv">{menuItems.length}</div></div><div className="asc"><div className="asl">Available</div><div className="asv">{avail}</div></div><div className="asc"><div className="asl">Out of Stock</div><div className="asv">{outOfStockCount}</div></div><div className="asc"><div className="asl">Hidden</div><div className="asv">{menuItems.filter(i=>!i.available).length}</div></div></div>
        <div className="tw"><div className="thb"><h2>Menu Items</h2><div className="tfs"><select className="fsel" value={fCat} onChange={e=>setFCat(e.target.value)}><option value="All">All Categories</option>{cats.map(c=><option key={c}>{c}</option>)}</select><select className="fsel" value={fSt} onChange={e=>setFSt(e.target.value)}><option value="All">All Status</option><option>Available</option><option>Unavailable</option><option>Out of Stock</option></select><button className="abtn" onClick={()=>setShowAdd(true)}>+ Add</button></div></div>
          <div className="tscr"><table><thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Sort</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {filtered.map(item=><tr key={item.id}><td><strong>{cleanName(item.name)}</strong>{item.description&&<div style={{fontSize:".7rem",color:"var(--m)",marginTop:2}}>{item.description}</div>}</td><td style={{color:"var(--m)",fontSize:".76rem"}}>{item.category}</td><td><strong style={{color:"var(--a)"}}>₹{item.price}</strong></td><td style={{color:"var(--m)",fontSize:".72rem"}}>{item.sortOrder||"-"}</td><td><span className={`bdg ${item.outOfStock?"boos":item.available?"bon":"boff"}`}>{item.outOfStock?"OOS":item.available?"On":"Off"}</span></td><td><button className="tdel" onClick={()=>requestDelete(item.id)}>Del</button><button className="tedit" onClick={()=>setEditItem(item)}>Edit</button><button className="ttog" onClick={()=>tog(item.id)}>{item.available?"Hide":"Show"}</button><button className="ttog toos" onClick={()=>togOos(item.id)}>{item.outOfStock?"Restock":"OOS"}</button></td></tr>)}</tbody></table></div></div></>}
      {tab==="bulk"&&<div className="bulk"><h2>Bulk Add</h2><p>One item per line: <code>Name, Category, Price, Description, Emoji</code></p><textarea className="bta" value={bulk} onChange={e=>{setBulk(e.target.value);if(e.target.value.trim())parseBulk(e.target.value);else setBParsed([]);}} placeholder="Chicken Wings, Starters, 320, Crispy wings"/>{bParsed.length>0&&<div className="bprev">{bParsed.map(p=><div key={p.line} className="bpi"><span className={p.ok?"pok":"perr"}>{p.ok?"✓":"✗"}</span><span>{p.ok?`${p.name} — ${p.category} — ₹${p.price}`:`Line ${p.line}: ${p.err}`}</span></div>)}</div>}<div className="bacts"><button className="ba" onClick={importBulk} disabled={!bParsed.some(p=>p.ok)}>Import</button><button className="bg" onClick={()=>{setBulk("");setBParsed([]);}}>Clear</button>{bParsed.length>0&&<span className="bnote">{bParsed.filter(p=>p.ok).length} valid</span>}</div></div>}
    </div>
    {/* Add Item Modal — improved with category text input, sort order (#2) */}
    {showAdd&&<div className="mov"><div className="modal"><h2>Add Menu Item</h2>
      <div className="fg"><label className="fl">Name *</label><input className="fi" value={newItem.name} onChange={e=>setNewItem({...newItem,name:e.target.value})}/></div>
      <div className="fr"><div className="fg"><label className="fl">Category *</label>
        {cats.length>0?<><select className="fi" value={newItem.category} onChange={e=>setNewItem({...newItem,category:e.target.value})} style={{marginBottom:".3rem"}}><option value="">Select existing…</option>{cats.map(c=><option key={c}>{c}</option>)}</select><input className="fi" value={newCatInput} onChange={e=>setNewCatInput(e.target.value)} placeholder="Or type new category"/></>:<input className="fi" value={newCatInput} onChange={e=>setNewCatInput(e.target.value)} placeholder="Category name"/>}
      </div><div className="fg"><label className="fl">Price *</label><input className="fi" value={newItem.price} onChange={e=>setNewItem({...newItem,price:e.target.value})} placeholder="e.g. 250 or 150/280"/></div></div>
      <div className="fr"><div className="fg"><label className="fl">Description</label><input className="fi" value={newItem.description} onChange={e=>setNewItem({...newItem,description:e.target.value})}/></div><div className="fg"><label className="fl">Sort Order</label><input className="fi" type="number" value={newItem.sortOrder} onChange={e=>setNewItem({...newItem,sortOrder:e.target.value})} placeholder="Lower = first"/></div></div>
      <div className="fg"><label className="fl">Food Type</label><div style={{display:"flex",gap:".4rem"}}>{[["veg","Veg"],["nonveg","Non-Veg"]].map(([v,l])=><div key={v} onClick={()=>setNewItem({...newItem,foodType:v})} style={{flex:1,padding:".5rem",borderRadius:"var(--radius-sm)",border:`2px solid ${newItem.foodType===v?(v==="veg"?"#22c55e":"#dc2626"):"var(--b)"}`,background:newItem.foodType===v?"rgba(255,255,255,.03)":"var(--s2)",cursor:"pointer",textAlign:"center",fontSize:".8rem",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:".35rem"}}><FoodTypeDot type={v}/>{l}</div>)}</div></div>
      <div className="macts"><button className="bg" onClick={()=>{setShowAdd(false);setNewCatInput("");}}>Cancel</button><button className="ba" onClick={addIt} disabled={!newItem.name||!newItem.price}>Add Item</button></div>
    </div></div>}
    {editItem&&<EditItemModal item={editItem} allCategories={cats} onSave={saveEdit} onClose={()=>setEditItem(null)}/>}
    {delPwdModal&&<div className="mov"><div className="modal"><h2>Confirm Delete</h2><p style={{color:"var(--m)",fontSize:".83rem",marginBottom:".9rem"}}>Enter admin password to delete this item</p>{delPwdErr&&<div className="aerr" style={{marginBottom:".45rem"}}>Incorrect password</div>}<div className="fg"><label className="fl">Password</label><input className="fi" type="password" value={delPwd} onChange={e=>{setDelPwd(e.target.value);setDelPwdErr(false);}} onKeyDown={e=>e.key==="Enter"&&handleDelPwd()}/></div><div className="macts"><button className="bg" onClick={()=>setDelPwdModal(null)}>Cancel</button><button className="ba" onClick={handleDelPwd}>Delete</button></div></div></div>}
  </div>);
}

// ── EDIT ITEM MODAL — now includes sort order ──
function EditItemModal({ item, allCategories, onSave, onClose }) {
  const [name,setName]=useState(item.name);const [desc,setDesc]=useState(item.description||"");
  const [price,setPrice]=useState(item.price);
  const [category,setCategory]=useState(item.category);const [newCat,setNewCat]=useState("");
  const [sortOrder,setSortOrder]=useState(item.sortOrder||"");
  const [foodType,setFoodType]=useState(item.foodType||"nonveg");
  const [popupType,setPopupType]=useState(item.popup||"none");
  const [choices,setChoices]=useState(item.popup==="choices"?(item.choices||[]).map(c=>({...c})):item.popup==="addon"?(item.addons||[]).map(a=>({...a})):[]);
  const addChoice=()=>setChoices(p=>[...p,{label:"",price:0}]);const removeChoice=(i)=>setChoices(p=>p.filter((_,j)=>j!==i));
  const updateChoice=(i,field,val)=>setChoices(p=>p.map((c,j)=>j===i?{...c,[field]:field==="price"?Number(val)||0:val}:c));
  const finalCat = newCat.trim() || category;
  const save=()=>{if(!name.trim()||!price.trim())return;const base={...item,name:name.trim(),category:finalCat,description:desc.trim(),price:price.trim(),foodType,sortOrder:parseInt(sortOrder)||item.sortOrder||item.id};if(popupType==="none"){delete base.popup;delete base.choices;delete base.addons;}if(popupType==="halfFull"){base.popup="halfFull";delete base.choices;delete base.addons;}if(popupType==="dryGravy"){base.popup="dryGravy";delete base.choices;delete base.addons;}if(popupType==="choices"){base.popup="choices";base.choices=choices.filter(c=>c.label.trim());delete base.addons;}if(popupType==="addon"){base.popup="addon";base.addons=choices.filter(c=>c.label.trim());delete base.choices;}onSave(base);};
  const isList=popupType==="choices"||popupType==="addon";
  return(<div className="mov"><div className="modal" style={{maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
    <h2>Edit Item</h2>
    <div className="fg"><label className="fl">Name</label><input className="fi" value={name} onChange={e=>setName(e.target.value)}/></div>
    <div className="fg"><label className="fl">Category</label><select className="fi" value={category} onChange={e=>setCategory(e.target.value)} style={{marginBottom:".3rem"}}>{allCategories.map(c=><option key={c}>{c}</option>)}</select><input className="fi" value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Or type new category"/></div>
    <div className="fr"><div className="fg"><label className="fl">Price (₹)</label><input className="fi" value={price} onChange={e=>setPrice(e.target.value)}/></div><div className="fg"><label className="fl">Sort Order</label><input className="fi" type="number" value={sortOrder} onChange={e=>setSortOrder(e.target.value)} placeholder="Lower = first"/></div></div>
    <div className="fg"><label className="fl">Description</label><input className="fi" value={desc} onChange={e=>setDesc(e.target.value)}/></div>
    <div className="fg"><label className="fl">Food Type</label><div style={{display:"flex",gap:".4rem"}}>{[["veg","Veg"],["nonveg","Non-Veg"]].map(([v,l])=><div key={v} onClick={()=>setFoodType(v)} style={{flex:1,padding:".5rem",borderRadius:"var(--radius-sm)",border:`2px solid ${foodType===v?(v==="veg"?"#22c55e":"#dc2626"):"var(--b)"}`,background:foodType===v?"rgba(255,255,255,.03)":"var(--s2)",cursor:"pointer",textAlign:"center",fontSize:".8rem",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:".35rem"}}><FoodTypeDot type={v}/>{l}</div>)}</div></div>
    <div className="fg"><label className="fl">Variation Type</label><div style={{display:"flex",gap:".35rem",flexWrap:"wrap"}}>
      {[["none","None"],["halfFull","Half/Full"],["dryGravy","Dry/Gravy"],["choices","Choices"],["addon","Add-on"]].map(([val,lbl])=>
        <div key={val} onClick={()=>setPopupType(val)} style={{padding:".35rem .7rem",borderRadius:"var(--radius-sm)",border:`2px solid ${popupType===val?"var(--a)":"var(--b)"}`,background:popupType===val?"rgba(220,38,38,.06)":"var(--s2)",cursor:"pointer",fontSize:".75rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".02em"}}>{lbl}</div>
      )}</div></div>
    {isList&&<div className="fg"><label className="fl">{popupType==="choices"?"Choices":"Add-ons"}</label>
      <div style={{display:"flex",flexDirection:"column",gap:".35rem",marginBottom:".4rem"}}>{choices.map((c,i)=>
        <div key={i} style={{display:"flex",gap:".35rem",alignItems:"center"}}><input className="fi" style={{flex:2}} value={c.label} onChange={e=>updateChoice(i,"label",e.target.value)} placeholder="Label"/><input className="fi" style={{flex:1}} value={c.price} onChange={e=>updateChoice(i,"price",e.target.value)} placeholder="Price"/><button onClick={()=>removeChoice(i)} style={{background:"transparent",border:"none",color:"#f87171",cursor:"pointer",fontSize:".95rem"}}>✕</button></div>
      )}</div><button onClick={addChoice} style={{background:"var(--s2)",border:"1px dashed var(--b2)",borderRadius:"var(--radius-sm)",padding:".35rem",width:"100%",color:"var(--m)",cursor:"pointer",fontSize:".76rem"}}>+ Add Option</button></div>}
    <div className="macts"><button className="bg" onClick={onClose}>Cancel</button><button className="ba" onClick={save} disabled={!name.trim()||!price.trim()}>Save</button></div>
  </div></div>);
}

// ── ROOT APP — with auto-clear logic (#6) ──
export default function GrillinApp() {
  const [page, setPage] = useState("customer");
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [authed, setAuthed] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [settings, setSettings] = useState({ deliveryMinEnabled:true, deleteProtection:true, offerEnabled:false, offerPercent:10, orderTimingEnabled:false, openTime:"10:00", closeTime:"23:00", autoClear:"off", deliveryRadius:3 });
  useEffect(() => {
    async function loadData() {
      const [menu, ords, dbSettings] = await Promise.all([fetchMenuItems(), fetchOrders(), fetchSettings()]);
      setMenuItems(menu); setOrders(ords);
      if (dbSettings.admin_password) setAdminPassword(dbSettings.admin_password);
      const s = {
        deliveryMinEnabled:dbSettings.delivery_min_enabled!=="false",
        deleteProtection:true,
        offerEnabled:dbSettings.offer_enabled==="true",
        offerPercent:parseInt(dbSettings.offer_percent)||10,
        orderTimingEnabled:dbSettings.order_timing_enabled==="true",
        openTime:dbSettings.open_time||"10:00",
        closeTime:dbSettings.close_time||"23:00",
        autoClear:dbSettings.auto_clear||"off",
        deliveryRadius:parseInt(dbSettings.delivery_radius)||3,
      };
      setSettings(s);
      // Auto-clear old done orders on load
      if (s.autoClear === "weekly") deleteOldOrders(7);
      else if (s.autoClear === "monthly") deleteOldOrders(30);
      setLoading(false);
    }
    loadData();
  }, []);
  const [alertOrder, setAlertOrder] = useState(null);
  const alertIntervalRef = useState(null);
  const playLoudAlarm = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, start, dur, vol) => { const osc=ctx.createOscillator();const gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=freq;osc.type="square";gain.gain.setValueAtTime(vol,ctx.currentTime+start);gain.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+start+dur);osc.start(ctx.currentTime+start);osc.stop(ctx.currentTime+start+dur); };
      playTone(800,0,0.12,0.5);playTone(1000,0.15,0.12,0.5);playTone(800,0.3,0.12,0.5);playTone(1000,0.45,0.12,0.5);playTone(1200,0.6,0.3,0.6);
    } catch(e) {}
  }, []);
  const startAlarm = useCallback((order) => {
    setAlertOrder(order); playLoudAlarm();
    if (alertIntervalRef[0]) clearInterval(alertIntervalRef[0]);
    alertIntervalRef[0] = setInterval(() => { playLoudAlarm(); }, 3000);
    if ("Notification" in window && Notification.permission === "granted") { new Notification("NEW ORDER #" + order.num, { body: order.customer + " — ₹" + parseFloat(order.total).toFixed(0), requireInteraction: true }); }
  }, [playLoudAlarm, alertIntervalRef]);
  const acknowledgeOrder = useCallback(() => { if (alertIntervalRef[0]) { clearInterval(alertIntervalRef[0]); alertIntervalRef[0] = null; } setAlertOrder(null); }, [alertIntervalRef]);
  useEffect(() => { if (page === "admin" && "Notification" in window && Notification.permission === "default") Notification.requestPermission(); }, [page]);
  useEffect(() => { return () => { if (alertIntervalRef[0]) clearInterval(alertIntervalRef[0]); }; }, [alertIntervalRef]);
  useEffect(() => {
    const channel = subscribeToOrders((payload) => {
      if (payload.eventType === "INSERT") { setOrders(prev => { if (prev.find(o => o.id === payload.new.id)) return prev; const n={id:payload.new.id,num:payload.new.num,customer:payload.new.customer,phone:payload.new.phone,address:payload.new.address,addr:payload.new.addr,type:payload.new.type,notes:payload.new.notes||"",items:payload.new.items||[],total:parseFloat(payload.new.total),status:payload.new.status,placedAt:new Date(payload.new.placed_at)}; startAlarm(n); return [n,...prev]; }); }
      else if (payload.eventType === "UPDATE") { const r=payload.new; setOrders(prev => prev.map(o => o.id === r.id ? {...o, status:r.status, ...(r.status==="Cancelled"?{cancelReason:r.notes||"",contactedCustomer:(r.notes||"").includes("[Customer contacted]")}:{})} : o)); }
      else if (payload.eventType === "DELETE") { setOrders(prev => prev.filter(o => o.id !== payload.old.id)); }
    });
    return () => { channel.unsubscribe(); };
  }, [startAlarm]);
  useEffect(() => {
    const channel = subscribeToMenu((payload) => {
      if (payload.eventType === "UPDATE") { const r=payload.new; setMenuItems(prev => prev.map(i => i.id===r.id?{...i,available:r.available,outOfStock:r.out_of_stock,name:r.name,price:r.price,description:r.description||""}:i)); }
      else if (payload.eventType === "INSERT") { fetchMenuItems().then(setMenuItems); }
      else if (payload.eventType === "DELETE") { setMenuItems(prev => prev.filter(i => i.id !== payload.old.id)); }
    });
    return () => { channel.unsubscribe(); };
  }, []);
  const handleOrderPlaced = (order) => { setOrders(prev => { if (prev.find(o => o.id === order.id)) return prev; return [order, ...prev]; }); };
  const AlertOverlay = () => alertOrder ? (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.88)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"var(--s)",border:"2px solid var(--a)",borderRadius:18,padding:"2.5rem",width:400,maxWidth:"95vw",textAlign:"center",animation:"popIn .25s cubic-bezier(.16,1,.3,1)"}}>
        <div style={{fontSize:"3.5rem",marginBottom:".4rem",animation:"pulse 1s infinite"}}>🔔</div>
        <h2 style={{fontSize:"1.5rem",fontWeight:800,marginBottom:".25rem"}}>New Order!</h2>
        <div style={{fontSize:"1.2rem",color:"var(--a)",fontWeight:700,marginBottom:".4rem"}}>#{alertOrder.num}</div>
        <div style={{fontSize:".92rem",marginBottom:".15rem"}}>{alertOrder.customer}</div>
        <div style={{fontSize:".82rem",color:"var(--m)",marginBottom:".25rem"}}>{alertOrder.type==="Delivery"?"🛵 Delivery":"🏃 Pickup"}</div>
        <div style={{fontSize:"1.35rem",fontWeight:800,marginBottom:"1.4rem"}}>₹{parseFloat(alertOrder.total).toFixed(0)}</div>
        <button onClick={acknowledgeOrder} style={{width:"100%",padding:".85rem",background:"var(--a)",color:"white",border:"none",borderRadius:"var(--radius-sm)",fontSize:"1rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",cursor:"pointer"}}>✓ Accept Order</button>
      </div>
    </div>
  ) : null;
  if (loading) return <><style>{S}</style><div className="loading-screen">Loading menu…</div></>;
  if (page === "admin-login") return <><style>{S}</style><AdminLogin onLogin={()=>{setAuthed(true);setPage("admin");}} password={adminPassword}/></>;
  if (page === "admin") return (<><style>{S}</style><AdminPanel menuItems={menuItems} setMenuItems={setMenuItems} orders={orders} setOrders={setOrders} onLogout={()=>setPage("customer")} settings={settings} setSettings={setSettings} adminPassword={adminPassword} setAdminPassword={setAdminPassword}/><AlertOverlay/><style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style></>);
  return (<><style>{S}</style><CustomerView menuItems={menuItems} search={search} setSearch={setSearch} onOrderPlaced={handleOrderPlaced} orders={orders} onAccessClick={()=>setPage(authed?"admin":"admin-login")} settings={settings}/></>);
}
