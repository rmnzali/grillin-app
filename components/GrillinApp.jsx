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
const STATUS_BG = {New:"rgba(192,57,43,.13)",Preparing:"rgba(74,140,92,.12)",Done:"rgba(138,128,120,.12)"};
const STATUS_COLOR = {New:"#c0392b",Preparing:"#4a8c5c",Done:"#8a8078"};
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
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Inter:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0f0e0c;--s:#1a1815;--s2:#231f1b;--b:#2e2a25;--b2:#3d3830;--t:#f0ebe4;--m:#8a8078;--a:#c0392b;--a2:#a93226;--g:#4a8c5c;--r:#c0392b}
html,body{background:var(--bg);color:var(--t);font-family:'Inter',sans-serif}
.nav{background:var(--s);border-bottom:1px solid var(--b);padding:0 1.25rem;height:72px;display:flex;align-items:center}
.nav-logo img{height:58px;width:auto;object-fit:contain;display:block}
.nav-right{display:flex;align-items:center;margin-left:auto}
.sb{display:flex;align-items:center;gap:.5rem;background:var(--s2);border:1px solid var(--b);border-radius:10px;padding:.4rem .7rem;width:200px}
.sb input{background:transparent;border:none;outline:none;color:var(--t);font-family:'Inter',sans-serif;font-size:.82rem;width:100%}
.sb input::placeholder{color:var(--m)}
.layout{display:grid;grid-template-columns:200px 1fr 300px;height:calc(100vh - 72px);overflow:hidden}
.sidebar{background:var(--s);border-right:1px solid var(--b);overflow-y:auto;padding:.75rem 0}
.slbl{font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--m);padding:.6rem 1.2rem .4rem}
.cbtn{display:block;width:100%;text-align:left;padding:.48rem 1.2rem;background:transparent;border:none;border-left:3px solid transparent;font-family:'Inter',sans-serif;font-size:.8rem;color:var(--m);cursor:pointer;transition:all .15s}
.cbtn:hover{color:var(--t);background:var(--s2)}
.cbtn.active{color:var(--a);border-left-color:var(--a);background:var(--s2);font-weight:500}
.menu{overflow-y:auto;padding:1.25rem}
.snote{font-size:.78rem;color:var(--m);margin-bottom:.75rem}
.ch{font-family:'Playfair Display',serif;font-size:1.15rem;font-weight:700;margin:1.25rem 0 .5rem}
.ch:first-child{margin-top:0}
.mlist{display:flex;flex-direction:column;gap:.35rem;margin-bottom:.35rem}
.mrow{display:flex;align-items:center;gap:.7rem;background:var(--s);border:1px solid var(--b);border-radius:10px;padding:.55rem .8rem;cursor:pointer;transition:all .15s}
.mrow:hover{border-color:var(--a);background:var(--s2)}
.mrow.unavail{opacity:.4;cursor:not-allowed}
.mrow.oos{cursor:not-allowed;opacity:.75}
.oos-badge{font-size:.68rem;background:rgba(192,57,43,.15);color:#e07070;border:1px solid rgba(192,57,43,.2);border-radius:4px;padding:2px 6px}
.re{font-size:1.25rem;flex-shrink:0}.ri{flex:1;min-width:0}
.rn{font-size:.87rem;font-weight:500}
.rd{font-size:.72rem;color:var(--m);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rr{display:flex;align-items:center;gap:.5rem;flex-shrink:0}
.rp{font-size:.85rem;font-weight:600;color:var(--a);white-space:nowrap}
.radd{width:27px;height:27px;border-radius:50%;background:var(--a);color:white;border:none;font-size:.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center}
.radd:hover{background:var(--a2)}
.rq{background:var(--s2);border:1px solid var(--b2);border-radius:20px;padding:2px 7px;font-size:.72rem;font-weight:700;color:var(--a)}
.rtag{font-size:.62rem;background:rgba(192,57,43,.12);color:var(--a);border-radius:4px;padding:2px 6px}
.ov{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.8);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1rem}
.om{background:var(--s);border:1px solid var(--b2);border-radius:16px;padding:1.75rem;width:340px;max-width:95vw;animation:popIn .2s ease}
@keyframes popIn{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}
.om h3{font-family:'Playfair Display',serif;font-size:1.15rem;text-align:center;margin-bottom:.3rem}
.om-desc{text-align:center;color:var(--m);font-size:.78rem;margin-bottom:1.1rem;line-height:1.5}
.olbl{font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--m);margin-bottom:.55rem}
.ochoices{display:flex;gap:.5rem;margin-bottom:1.1rem;flex-wrap:wrap}
.oc{flex:1;min-width:80px;padding:.7rem;border-radius:10px;border:2px solid var(--b);background:var(--s2);cursor:pointer;text-align:center;transition:all .15s}
.oc:hover{border-color:var(--a)}.oc.sel{border-color:var(--a);background:rgba(192,57,43,.1)}
.oc-lbl{font-size:.88rem;font-weight:600}.oc-price{font-size:.76rem;color:var(--a);margin-top:3px}
.addon-row{display:flex;align-items:center;justify-content:space-between;padding:.6rem .75rem;border:1px solid var(--b);border-radius:8px;margin-bottom:.4rem;cursor:pointer;transition:all .15s}
.addon-row.sel{border-color:var(--a);background:rgba(192,57,43,.08)}
.addon-row-left{display:flex;align-items:center;gap:.5rem;font-size:.88rem;font-weight:500}
.addon-check{width:18px;height:18px;border-radius:4px;border:2px solid var(--b2);display:flex;align-items:center;justify-content:center;font-size:.7rem;transition:all .15s}
.addon-check.checked{background:var(--a);border-color:var(--a);color:white}
.addon-price{font-size:.78rem;color:var(--a);font-weight:600}
.oacts{display:flex;gap:.5rem;margin-top:1rem}
.cpanel{background:var(--s);border-left:1px solid var(--b);display:flex;flex-direction:column;overflow:hidden}
.chead{padding:1.1rem 1.25rem;border-bottom:1px solid var(--b)}
.chead h2{font-family:'Playfair Display',serif;font-size:1.15rem}.chead p{font-size:.75rem;color:var(--m);margin-top:2px}
.cbody{flex:1;overflow-y:auto;padding:.6rem .9rem}
.cempty{text-align:center;padding:2.5rem 1rem;color:var(--m);font-size:.83rem}
.cempty-icon{font-size:2.2rem;margin-bottom:.5rem}
.ci{display:flex;align-items:center;gap:.55rem;padding:.55rem 0;border-bottom:1px solid var(--b)}
.ci-i{flex:1;min-width:0}.ci-n{font-size:.8rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ci-v{font-size:.68rem;color:var(--a);margin-top:1px}.ci-p{font-size:.72rem;color:var(--m)}
.qc{display:flex;align-items:center;gap:.3rem}
.qb{width:21px;height:21px;border-radius:50%;border:1px solid var(--b2);background:transparent;color:var(--t);font-size:.75rem;cursor:pointer;display:flex;align-items:center;justify-content:center}
.qb:hover{background:var(--s2)}.qn{font-size:.8rem;font-weight:600;width:17px;text-align:center}
.cfoot{padding:.9rem 1rem;border-top:1px solid var(--b)}
.ctotal{display:flex;justify-content:space-between;font-weight:600;font-size:.92rem;margin-bottom:.4rem}
.chkbtn{width:100%;padding:.75rem;background:var(--a);color:white;border:none;border-radius:8px;font-family:'Inter',sans-serif;font-size:.88rem;font-weight:600;cursor:pointer}
.chkbtn:hover:not(:disabled){background:var(--a2)}.chkbtn:disabled{opacity:.3;cursor:not-allowed}
.fab{display:none;position:fixed;bottom:1.1rem;left:50%;transform:translateX(-50%);z-index:150;background:var(--a);color:white;border:none;border-radius:40px;padding:.7rem 1.5rem;font-family:'Inter',sans-serif;font-size:.88rem;font-weight:600;cursor:pointer;align-items:center;gap:.5rem;box-shadow:0 4px 20px rgba(0,0,0,.4)}
.fabbadge{background:white;color:var(--a);border-radius:10px;padding:1px 7px;font-size:.7rem;font-weight:700}
.access-footer{display:block;width:100%;text-align:center;padding:1.2rem;background:transparent;border:none;border-top:1px solid var(--b);color:var(--m);font-family:'Inter',sans-serif;font-size:.72rem;cursor:pointer;margin-top:1.5rem}
.access-footer:hover{color:var(--t)}
.dov{position:fixed;inset:0;z-index:160;background:rgba(0,0,0,.6);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .2s}.dov.open{opacity:1;pointer-events:all}
.drawer{position:fixed;bottom:0;left:0;right:0;z-index:170;background:var(--s);border-radius:20px 20px 0 0;max-height:85vh;display:flex;flex-direction:column;transform:translateY(100%);transition:transform .3s ease}.drawer.open{transform:translateY(0)}
.dhandle{width:36px;height:4px;background:var(--b2);border-radius:2px;margin:10px auto 0;flex-shrink:0}
.dclose{position:absolute;top:.7rem;right:1rem;background:var(--s2);border:none;border-radius:50%;width:28px;height:28px;color:var(--m);cursor:pointer;font-size:.85rem}
.mov{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1rem}
.modal{background:var(--s);border:1px solid var(--b);border-radius:16px;padding:1.75rem;width:420px;max-width:95vw;animation:slideUp .25s ease}
@keyframes slideUp{from{transform:translateY(14px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal h2{font-family:'Playfair Display',serif;font-size:1.35rem;margin-bottom:1.1rem}
.del-warn{background:rgba(180,130,0,.12);border:1px solid rgba(180,130,0,.3);color:#b08000;border-radius:8px;padding:.6rem .8rem;font-size:.78rem;margin-bottom:.75rem}
.addr-block{background:var(--s2);border:1px solid var(--b);border-radius:10px;padding:.85rem 1rem;margin-bottom:.75rem}
.addr-block-title{font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--m);margin-bottom:.6rem;display:flex;align-items:center;gap:.5rem}
.autofill-tag{background:rgba(74,140,92,.15);color:var(--g);border-radius:4px;padding:2px 6px;font-size:.62rem;font-weight:600}
.fg{margin-bottom:.75rem}
.fl{display:block;font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--m);margin-bottom:.3rem}
.fi{width:100%;padding:.58rem .8rem;background:var(--s2);border:1px solid var(--b);border-radius:8px;color:var(--t);font-family:'Inter',sans-serif;font-size:.85rem;outline:none;transition:border .15s}
.fi:focus{border-color:var(--a)}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}
.osb{background:var(--s2);border-radius:8px;padding:.75rem;margin:.65rem 0;max-height:170px;overflow-y:auto}
.osi{display:flex;justify-content:space-between;font-size:.78rem;color:var(--m);padding:.18rem 0}
.ost{display:flex;justify-content:space-between;font-weight:600;font-size:.88rem;border-top:1px solid var(--b);padding-top:.5rem;margin-top:.35rem}
.macts{display:flex;gap:.65rem;margin-top:1.1rem}
.sbox{text-align:center}.sicon{font-size:2.8rem;margin-bottom:.65rem}.sbox h2{margin-bottom:.35rem}
.sbox p{color:var(--m);font-size:.83rem;margin-bottom:1.25rem;line-height:1.6}
.otag{font-family:'Playfair Display',serif;font-size:.95rem;color:var(--a);margin-bottom:.85rem}
.bg{flex:1;padding:.62rem;border:1px solid var(--b);background:transparent;border-radius:8px;color:var(--t);font-family:'Inter',sans-serif;cursor:pointer;font-size:.85rem}
.bg:hover{background:var(--s2)}
.ba{flex:2;padding:.62rem;background:var(--a);color:white;border:none;border-radius:8px;cursor:pointer;font-family:'Inter',sans-serif;font-size:.85rem;font-weight:600}
.ba:hover{background:var(--a2)}.ba:disabled{opacity:.35;cursor:not-allowed}
.alog{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:1rem}
.abox{background:var(--s);border:1px solid var(--b);border-radius:16px;padding:2rem;width:360px;max-width:95vw;text-align:center}
.abox p{color:var(--m);font-size:.83rem;margin-bottom:1.4rem}
.aerr{background:rgba(192,57,43,.12);border:1px solid rgba(192,57,43,.3);color:#e57373;border-radius:8px;padding:.5rem;font-size:.78rem;margin-bottom:.75rem}
.adm{min-height:100vh;background:var(--bg)}
.adm-nav{background:var(--s);border-bottom:1px solid var(--b);padding:0 1.75rem;height:64px;display:flex;align-items:center;justify-content:space-between}
.adm-nav img{height:44px;width:auto}
.adm-inner{padding:1.75rem;max-width:1200px;margin:0 auto}
.atop{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:.75rem}
.atop h1{font-family:'Playfair Display',serif;font-size:1.5rem}
.atabs{display:flex;border:1px solid var(--b);border-radius:8px;overflow:hidden;margin-bottom:1.25rem}
.atab{padding:.48rem 1.1rem;background:transparent;border:none;font-family:'Inter',sans-serif;font-size:.8rem;color:var(--m);cursor:pointer;position:relative}
.atab.active{background:var(--a);color:white}.atab:hover:not(.active){background:var(--s2);color:var(--t)}
.nbadge{position:absolute;top:3px;right:3px;background:#c0392b;color:white;border-radius:8px;font-size:.55rem;padding:0 4px;min-width:14px;text-align:center}
.astats{display:grid;grid-template-columns:repeat(4,1fr);gap:.9rem;margin-bottom:1.5rem}
.asc{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:1.1rem}
.asl{font-size:.68rem;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:var(--m);margin-bottom:.35rem}
.asv{font-family:'Playfair Display',serif;font-size:1.9rem}
.ord-filter{display:flex;gap:.5rem;margin-bottom:1.25rem;flex-wrap:wrap}
.ord-fbtn{padding:.38rem .9rem;border-radius:20px;border:1px solid var(--b);background:transparent;color:var(--m);font-family:'Inter',sans-serif;font-size:.78rem;cursor:pointer}
.ord-fbtn:hover{border-color:var(--a);color:var(--t)}.ord-fbtn.active{background:var(--a);border-color:var(--a);color:white}
.ord-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem}
.ord-card{background:var(--s);border:1px solid var(--b);border-radius:14px;overflow:hidden;animation:slideUp .2s ease}
.ord-card.status-New{border-left:3px solid #c0392b}.ord-card.status-Preparing{border-left:3px solid #4a8c5c}.ord-card.status-Done{border-left:3px solid #555;opacity:.7}
.ord-card-head{padding:.9rem 1rem;display:flex;align-items:flex-start;justify-content:space-between}
.ord-num{font-family:'Playfair Display',serif;font-size:1rem;font-weight:500}
.ord-customer{font-size:.82rem;font-weight:500;margin-top:2px}.ord-time{font-size:.7rem;color:var(--m);margin-top:2px}
.ord-type{font-size:.68rem;background:var(--s2);border:1px solid var(--b2);border-radius:4px;padding:2px 6px}
.ord-status-pill{font-size:.7rem;font-weight:700;border-radius:20px;padding:3px 10px;letter-spacing:.04em}
.ord-items{padding:.75rem 1rem}
.ord-item-row{display:flex;justify-content:space-between;align-items:baseline;font-size:.8rem;padding:.2rem 0}
.ord-item-name{color:var(--m);flex:1}.ord-item-var{font-size:.68rem;color:var(--a);margin-left:4px}
.ord-item-price{font-weight:500;white-space:nowrap;margin-left:.5rem}
.ord-notes{font-size:.73rem;color:var(--m);font-style:italic;padding:.5rem 1rem;border-top:1px solid var(--b)}
.ord-foot{padding:.75rem 1rem;border-top:1px solid var(--b);display:flex;align-items:center;justify-content:space-between}
.ord-total{font-weight:700;font-size:.9rem}.ord-actions{display:flex;gap:.4rem}
.ord-next-btn{padding:.35rem .85rem;border-radius:7px;border:none;cursor:pointer;font-size:.75rem;font-weight:600;color:white}
.ord-del-btn{padding:.35rem .6rem;border-radius:7px;border:1px solid rgba(192,57,43,.3);background:transparent;color:#e07070;cursor:pointer;font-size:.75rem}
.ord-del-btn:hover{background:rgba(192,57,43,.1)}
.ord-empty{text-align:center;padding:4rem 2rem;color:var(--m)}.ord-empty-icon{font-size:3rem;margin-bottom:.75rem}.ord-empty p{font-size:.88rem}
.tw{background:var(--s);border:1px solid var(--b);border-radius:12px;overflow:hidden}
.thb{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1.1rem;border-bottom:1px solid var(--b);flex-wrap:wrap;gap:.5rem}
.thb h2{font-family:'Playfair Display',serif;font-size:1.05rem}
.tfs{display:flex;gap:.45rem;align-items:center;flex-wrap:wrap}
.fsel{background:var(--s2);border:1px solid var(--b);color:var(--t);border-radius:6px;padding:.32rem .5rem;font-family:'Inter',sans-serif;font-size:.75rem}
.abtn{padding:.45rem .9rem;background:var(--a);color:white;border:none;border-radius:8px;cursor:pointer;font-family:'Inter',sans-serif;font-size:.78rem;font-weight:600}
.abtn:hover{background:var(--a2)}.tscr{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th{padding:.6rem .9rem;text-align:left;font-size:.66rem;font-weight:600;color:var(--m);letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid var(--b)}
td{padding:.65rem .9rem;font-size:.81rem;border-bottom:1px solid var(--b);color:var(--t);vertical-align:middle}
tr:last-child td{border-bottom:none}tr:hover td{background:rgba(255,255,255,.02)}
.bdg{display:inline-block;padding:2px 8px;border-radius:10px;font-size:.68rem;font-weight:600}
.bon{background:rgba(74,140,92,.15);color:#6ec98a}.boff{background:rgba(192,57,43,.15);color:#e07070}.boos{background:rgba(180,130,0,.15);color:#c89020}
.ttog{padding:.26rem .6rem;border-radius:6px;border:1px solid var(--b);background:transparent;color:var(--m);cursor:pointer;font-size:.72rem;font-family:'Inter',sans-serif;margin-right:.3rem}
.ttog:hover{background:var(--s2)}.toos{border-color:rgba(180,130,0,.35);color:#c89020}.toos:hover{background:rgba(180,130,0,.1)}
.tedit{padding:.26rem .6rem;border-radius:6px;border:1px solid var(--b2);background:transparent;color:var(--m);cursor:pointer;font-size:.72rem;font-family:'Inter',sans-serif;margin-right:.3rem}
.tedit:hover{background:var(--s2);color:var(--t)}
.tdel{padding:.26rem .55rem;border-radius:6px;border:1px solid rgba(192,57,43,.3);background:transparent;color:#e07070;cursor:pointer;font-size:.72rem;font-family:'Inter',sans-serif}
.tdel:hover{background:rgba(192,57,43,.1)}
.lout{padding:.4rem .9rem;background:transparent;border:1px solid var(--b);border-radius:8px;color:var(--m);cursor:pointer;font-family:'Inter',sans-serif;font-size:.78rem}
.lout:hover{border-color:var(--r);color:var(--r)}
.bulk{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:1.35rem}
.bulk h2{font-family:'Playfair Display',serif;font-size:1.15rem;margin-bottom:.4rem}
.bulk p{color:var(--m);font-size:.8rem;margin-bottom:.9rem;line-height:1.6}
.bta{width:100%;height:160px;padding:.8rem;background:var(--s2);border:1px solid var(--b);border-radius:8px;color:var(--t);font-family:'Inter',sans-serif;font-size:.8rem;resize:vertical;outline:none}
.bta:focus{border-color:var(--a)}
.bprev{margin-top:.9rem;background:var(--s2);border-radius:8px;padding:.9rem;font-size:.78rem}
.bpi{padding:.28rem 0;border-bottom:1px solid var(--b);display:flex;gap:.9rem}.bpi:last-child{border-bottom:none}
.pok{color:#6ec98a}.perr{color:#e07070}
.bacts{display:flex;gap:.65rem;margin-top:.9rem;align-items:center}.bnote{font-size:.76rem;color:var(--m)}
.loading-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f0e0c;color:#8a8078;font-family:'Inter',sans-serif}
.contact-footer{border-top:1px solid var(--b);padding:1.2rem;margin-top:1.5rem;text-align:center}
.contact-footer a{color:var(--a);text-decoration:none;font-size:.82rem;font-weight:500}
.contact-footer a:hover{text-decoration:underline}
.contact-row{display:flex;align-items:center;justify-content:center;gap:.5rem;margin-bottom:.5rem;font-size:.82rem;color:var(--m)}
.contact-row a{color:var(--a);text-decoration:none}.contact-row a:hover{text-decoration:underline}
.setting-row{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1rem;border:1px solid var(--b);border-radius:10px;margin-bottom:.65rem;background:var(--s)}
.setting-label{font-size:.85rem;font-weight:500}.setting-desc{font-size:.72rem;color:var(--m);margin-top:2px}
.toggle-switch{position:relative;width:44px;height:24px;border-radius:12px;cursor:pointer;transition:all .2s}
.toggle-switch.on{background:var(--a)}.toggle-switch.off{background:var(--b2)}
.toggle-dot{position:absolute;top:3px;width:18px;height:18px;border-radius:50%;background:white;transition:all .2s}
.toggle-switch.on .toggle-dot{left:23px}.toggle-switch.off .toggle-dot{left:3px}
.ci-note{font-size:.68rem;color:var(--m);font-style:italic;margin-top:2px}
.ci-note-input{width:100%;padding:.3rem .5rem;background:var(--s2);border:1px solid var(--b);border-radius:5px;color:var(--t);font-family:'Inter',sans-serif;font-size:.68rem;outline:none;margin-top:3px}
.ci-note-input:focus{border-color:var(--a)}
.discount-line{display:flex;justify-content:space-between;font-size:.82rem;color:var(--g);margin-bottom:.4rem}
@media(max-width:900px){.layout{grid-template-columns:1fr;height:auto;overflow:visible}.sidebar{display:none}.cpanel{display:none!important}.fab{display:flex!important}.menu{padding:1rem 1rem 5.5rem}.astats{grid-template-columns:1fr 1fr}.ord-grid{grid-template-columns:1fr}}
@media(max-width:580px){.nav{padding:0 1rem}.sb{width:140px}.adm-inner{padding:1rem}.fr{grid-template-columns:1fr}.modal{padding:1.4rem 1.1rem}}
`;

// ── OPTION POPUP ──────────────────────────────────────────────────────────────
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

// ── CUSTOMER VIEW ─────────────────────────────────────────────────────────────
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
  const addItem = (item,choice) => { const key=cartKey(item,choice.val); setCart(prev=>{const ex=prev.find(c=>c.key===key); return ex?prev.map(c=>c.key===key?{...c,qty:c.qty+1}:c):[...prev,{...item,key,variant:choice.val,unitPrice:choice.num,qty:1}];}); };
  const confirmOption = (item,choice) => { addItem(item,choice); setPopupItem(null); };
  const changeQty = (key,d) => setCart(prev=>prev.map(c=>c.key===key?{...c,qty:c.qty+d}:c).filter(c=>c.qty>0));
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
      type:form.type,notes:form.notes||"",items:cart.map(c=>({name:cleanName(c.name),variant:c.variant,qty:c.qty,unitPrice:c.unitPrice})),
      total,status:"New",placedAt:new Date()};
    await insertOrder(order);
    await upsertCustomer({phone:form.phone,name:form.name,...(form.type==="Delivery"?form.addr:{})});
    onOrderPlaced(order); setOrderPlaced(true); setCart([]);
  };
  const reset = () => { setOrderPlaced(false);setShowCheckout(false);setForm({phone:"",name:"",type:"Delivery",addr:{house:"",apartment:"",street:"",place:"",landmark:""},notes:""});setAutoFilled(false); };

  const CartBody = () => (<>
    <div className="chead"><h2>Your Order</h2><p>{totalItems===0?"No items yet":`${totalItems} item${totalItems>1?"s":""}`}</p></div>
    <div className="cbody">{cart.length===0?<div className="cempty"><div className="cempty-icon">🛒</div><p>Add items from the menu</p></div>
      :cart.map(item=>(<div key={item.key} className="ci"><div className="ci-i"><div className="ci-n">{cleanName(item.name)}</div>{item.variant&&<div className="ci-v">{item.variant}</div>}<div className="ci-p">₹{item.unitPrice} × {item.qty} = ₹{(item.unitPrice*item.qty).toFixed(0)}</div></div>
      <div className="qc"><button className="qb" onClick={()=>changeQty(item.key,-1)}>−</button><span className="qn">{item.qty}</span><button className="qb" onClick={()=>changeQty(item.key,1)}>+</button></div></div>))}</div>
    {cart.length>0&&<div className="cfoot">
      <div style={{marginBottom:".6rem"}}><input className="fi" style={{fontSize:".78rem",padding:".45rem .7rem"}} placeholder="Special instructions for the kitchen…" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
      <div className="ctotal" style={{fontSize:".82rem",fontWeight:500}}><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
      {discountPct>0&&<div className="discount-line"><span>Discount ({discountPct}%)</span><span>-₹{discountAmt.toFixed(0)}</span></div>}
      <div className="ctotal" style={{fontSize:".78rem",color:"var(--m)",fontWeight:400}}><span>GST (5%)</span><span>₹{gstAmt.toFixed(0)}</span></div>
      <div className="ctotal" style={{borderTop:"1px solid var(--b)",paddingTop:".5rem"}}><span>Total</span><span>₹{total.toFixed(0)}</span></div>
      <button className="chkbtn" onClick={()=>{setDrawerOpen(false);setShowCheckout(true);}}>Checkout</button>
    </div>}
  </>);

  return (<>
    <nav className="nav"><div className="nav-logo"><img src={LOGO_SRC} alt="Grillin'"/></div><div className="nav-right"><div className="sb"><span style={{color:"var(--m)",fontSize:".9rem"}}>🔍</span><input placeholder="Search menu…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div></nav>
    {settings.offerEnabled&&discountPct>0&&<div style={{background:"linear-gradient(90deg,#c0392b,#e74c3c)",padding:".6rem 1rem",textAlign:"center",fontSize:".85rem",fontWeight:600,color:"white",letterSpacing:".02em"}}>🎉 Order From Our Website — Get <span style={{fontSize:"1.05rem",textDecoration:"underline"}}>{discountPct}% Off</span> Your Order!</div>}
    {discountPct>0&&<div style={{background:"linear-gradient(135deg,#c0392b,#a93226)",padding:".65rem 1.25rem",textAlign:"center"}}><div style={{fontSize:".95rem",fontWeight:700,color:"white",marginBottom:".1rem"}}>Order From Our Website</div><div style={{fontSize:".82rem",color:"rgba(255,255,255,.85)"}}>Get <strong>{discountPct}% Off</strong> Your Order</div></div>}
    <div className="layout">
      <div className="sidebar"><div className="slbl">Categories</div><button className={`cbtn ${activeCat==="All"&&!search?"active":""}`} onClick={()=>{setActiveCat("All");setSearch("");}}>All Items</button>
        {cats.map(cat=><button key={cat} className={`cbtn ${activeCat===cat&&!search?"active":""}`} onClick={()=>{setActiveCat(cat);setSearch("");}}>{cat}</button>)}</div>
      <div className="menu">
        {search&&<div className="snote">{filtered.length} result{filtered.length!==1?"s":""} for &quot;{search}&quot;</div>}
        {Object.entries(grouped).map(([cat,items])=>(<div key={cat}><div className="ch">{cat}</div><div className="mlist">
          {items.map(item=>{const qty=itemQty(item);const tag=tagLabel(item);return(
            <div key={item.id} className={`mrow ${!item.available?"unavail":item.outOfStock?"oos":""}`} onClick={()=>handleClick(item)}>
              <div className="ri"><div className="rn">{cleanName(item.name)}</div>{item.description&&<div className="rd">{item.description}</div>}</div>
              <div className="rr">{tag&&!item.outOfStock&&<span className="rtag">{tag}</span>}{item.outOfStock?<span className="oos-badge">Out of Stock</span>:<>{qty>0&&<span className="rq">×{qty}</span>}<span className="rp">{displayPrice(item)}</span>{item.available&&<button className="radd" onClick={e=>{e.stopPropagation();handleClick(item);}}>+</button>}</>}</div>
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
    {cart.length>0&&<button className="fab" style={{display:"flex"}} onClick={()=>setDrawerOpen(true)}>🛒 Order <span className="fabbadge">{totalItems}</span> · ₹{total.toFixed(0)}</button>}
    <div className={`dov ${drawerOpen?"open":""}`} onClick={()=>setDrawerOpen(false)}/><div className={`drawer ${drawerOpen?"open":""}`}><div className="dhandle"/><button className="dclose" onClick={()=>setDrawerOpen(false)}>✕</button><div style={{display:"flex",flexDirection:"column",overflow:"hidden",flex:1}}><CartBody/></div></div>
    {popupItem&&<OptionPopup item={popupItem} onConfirm={confirmOption} onClose={()=>setPopupItem(null)}/>}
    {showCheckout&&!orderPlaced&&(<div className="mov"><div className="modal" style={{maxHeight:"90vh",overflowY:"auto"}}>
      <h2>Complete Your Order</h2>
      <div className="fg"><label className="fl">Mobile Number *</label><input className="fi" value={form.phone} onChange={e=>handlePhoneChange(e.target.value)} placeholder="Enter mobile number"/></div>
      <div className="fg"><label className="fl">Your Name *</label><input className="fi" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></div>
      <div className="fg"><label className="fl">Order Type</label><div style={{display:"flex",gap:".5rem"}}>{["Delivery","Pickup"].map(t=>(<div key={t} onClick={()=>setForm({...form,type:t})} style={{flex:1,padding:".6rem",borderRadius:8,border:`2px solid ${form.type===t?"var(--a)":"var(--b)"}`,background:form.type===t?"rgba(192,57,43,.1)":"var(--s2)",cursor:"pointer",textAlign:"center",fontSize:".85rem",fontWeight:form.type===t?600:400}}>{t==="Delivery"?"🛵 Delivery":"🏃 Pickup"}</div>))}</div></div>
      {form.type==="Delivery"&&<div className="addr-block"><div className="addr-block-title">🏠 Delivery Address *{autoFilled&&<span className="autofill-tag">✓ Auto-filled from previous order</span>}</div>
        <div className="fg"><label className="fl">House / Flat No. *</label><input className="fi" value={form.addr.house} onChange={e=>setAddr("house",e.target.value)}/></div>
        <div className="fg"><label className="fl">Apartment / Building</label><input className="fi" value={form.addr.apartment} onChange={e=>setAddr("apartment",e.target.value)}/></div>
        <div className="fg"><label className="fl">Street *</label><input className="fi" value={form.addr.street} onChange={e=>setAddr("street",e.target.value)}/></div>
        <div className="fg"><label className="fl">Place / Area *</label><input className="fi" value={form.addr.place} onChange={e=>setAddr("place",e.target.value)}/></div>
        <div className="fg" style={{marginBottom:0}}><label className="fl">Address Instructions</label><input className="fi" value={form.addr.landmark} onChange={e=>setAddr("landmark",e.target.value)} placeholder="Gate code, directions, etc."/></div></div>}
      {deliveryShort&&<div className="del-warn">⚠️ Minimum delivery order is <strong>₹{DELIVERY_MIN}</strong> — add ₹{Math.ceil(DELIVERY_MIN-subtotal)} more</div>}
      <div className="osb">{cart.map(i=><div key={i.key} className="osi"><span>{cleanName(i.name)}{i.variant?` (${i.variant})`:""} ×{i.qty}</span><span>₹{(i.unitPrice*i.qty).toFixed(0)}</span></div>)}
        {discountPct>0&&<div className="osi" style={{color:"var(--g)"}}><span>Discount ({discountPct}%)</span><span>-₹{discountAmt.toFixed(0)}</span></div>}
        <div className="osi"><span>GST (5%)</span><span>₹{gstAmt.toFixed(0)}</span></div>
        <div className="ost"><span>Total</span><span>₹{total.toFixed(0)}</span></div></div>
      <div className="macts"><button className="bg" onClick={()=>setShowCheckout(false)}>Back</button><button className="ba" onClick={placeOrder} disabled={!canPlace}>Place Order</button></div>
    </div></div>)}
    {orderPlaced&&<div className="mov"><div className="modal"><div className="sbox"><div className="sicon">✅</div><h2>Order Placed!</h2><div className="otag">Order #{orderNum}</div><p>Thank you, {form.name}!<br/>Your order has been received and is being prepared.</p><button className="ba" style={{width:"100%"}} onClick={reset}>Place New Order</button></div></div></div>}
  </>);
}
// ── ORDER DASHBOARD ───────────────────────────────────────────────────────────
function OrderDashboard({ orders, onAdvance, onRemove, onClearDone }) {
  const [filter, setFilter] = useState("All");
  const counts = useMemo(()=>STATUS_FLOW.reduce((acc,s)=>({...acc,[s]:orders.filter(o=>o.status===s).length}),{}), [orders]);
  const displayed = useMemo(()=>{const o=filter==="All"?orders:orders.filter(o=>o.status===filter);return [...o].sort((a,b)=>new Date(b.placedAt)-new Date(a.placedAt));},[orders,filter]);

  return (<div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:".9rem",marginBottom:"1.25rem"}}>
      <div className="asc"><div className="asl">Total Orders</div><div className="asv">{orders.length}</div></div>
      <div className="asc"><div className="asl" style={{color:"#c0392b"}}>New</div><div className="asv">{counts["New"]||0}</div></div>
      <div className="asc"><div className="asl" style={{color:"#4a8c5c"}}>Preparing</div><div className="asv">{counts["Preparing"]||0}</div></div>
      <div className="asc"><div className="asl">Done</div><div className="asv">{counts["Done"]||0}</div></div>
    </div>
    <div className="ord-filter">
      {["All",...STATUS_FLOW].map(s=><button key={s} className={`ord-fbtn ${filter===s?"active":""}`} onClick={()=>setFilter(s)}>{s}{s!=="All"&&counts[s]>0?` (${counts[s]})`:""}</button>)}
      {orders.some(o=>o.status==="Done")&&<button className="ord-fbtn" style={{marginLeft:"auto",color:"#e07070",borderColor:"rgba(192,57,43,.3)"}} onClick={onClearDone}>Clear Done</button>}
    </div>
    {displayed.length===0?<div className="ord-empty"><div className="ord-empty-icon">📋</div><p>{filter==="All"?"No orders yet":"No "+filter+" orders"}</p></div>
    :<div className="ord-grid">{displayed.map(order=>{
      const nextStatus=STATUS_FLOW[STATUS_FLOW.indexOf(order.status)+1];
      const btnColor=order.status==="New"?"#c0392b":order.status==="Preparing"?"#4a8c5c":"#555";
      return(<div key={order.id} className={`ord-card status-${order.status}`}>
        <div className="ord-card-head"><div>
          <div style={{display:"flex",alignItems:"center",gap:".5rem",marginBottom:".15rem"}}><div className="ord-num">#{order.num}</div><span className="ord-type">{order.type==="Delivery"?"🛵 Delivery":"🏃 Pickup"}</span></div>
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


// ── ADMIN LOGIN ───────────────────────────────────────────────────────────────
function AdminLogin({ onLogin, password }) {
  const [pwd,setPwd]=useState(""); const [err,setErr]=useState(false);
  const go=()=>pwd===password?onLogin():setErr(true);
  return (<div className="alog"><div className="abox">
    <h2 style={{fontFamily:"'Playfair Display',serif",marginBottom:".5rem"}}>Grillin&apos;</h2>
    <p>Restaurant Access — enter password to continue</p>
    {err&&<div className="aerr">Incorrect password. Try again.</div>}
    <div className="fg"><label className="fl">Password</label><input className="fi" type="password" value={pwd} onChange={e=>{setPwd(e.target.value);setErr(false);}} onKeyDown={e=>e.key==="Enter"&&go()}/></div>
    <button className="ba" style={{width:"100%",marginTop:".5rem"}} onClick={go}>Sign In</button>
  </div></div>);
}

// ── SETTINGS PANEL ────────────────────────────────────────────────────────────
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
    <div style={{marginBottom:"1.25rem"}}><h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.15rem",marginBottom:".75rem"}}>Settings</h2></div>

    <div className="setting-row"><div><div className="setting-label">🔒 Change Admin Password</div><div className="setting-desc">Update the password used to access the admin panel</div></div>
      <button className="abtn" onClick={()=>setShowPwdChange(!showPwdChange)}>{showPwdChange?"Cancel":"Change"}</button></div>
    {pwdOk&&<div style={{background:"rgba(74,140,92,.15)",border:"1px solid rgba(74,140,92,.3)",color:"#6ec98a",borderRadius:8,padding:".5rem .8rem",fontSize:".78rem",marginBottom:".5rem"}}>✓ Password updated successfully</div>}
    {showPwdChange&&<div style={{background:"var(--s)",border:"1px solid var(--b)",borderRadius:10,padding:"1rem",marginBottom:".65rem",marginTop:"-0.3rem"}}>
      {pwdMsg&&<div className="aerr" style={{marginBottom:".5rem"}}>{pwdMsg}</div>}
      <div className="fg"><label className="fl">Current Password</label><input className="fi" type="password" value={oldPwd} onChange={e=>{setOldPwd(e.target.value);setPwdMsg("");}}/></div>
      <div className="fg"><label className="fl">New Password</label><input className="fi" type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)}/></div>
      <button className="ba" onClick={changePassword}>Update Password</button>
    </div>}

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

// ── ADMIN PANEL ───────────────────────────────────────────────────────────────
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
    setDelPwdModal(id); setDelPwd(""); setDelPwdErr(false);
  };
  const confirmDelete = async (id) => {
    setMenuItems(p=>p.filter(i=>i.id!==id)); await deleteMenuItem(id); setDelPwdModal(null);
  };
  const handleDelPwd = () => {
    if (delPwd === adminPassword) { confirmDelete(delPwdModal); }
    else { setDelPwdErr(true); }
  };

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
              <td><strong>{cleanName(item.name)}</strong>{item.description&&<div style={{fontSize:".7rem",color:"var(--m)",marginTop:2}}>{item.description}</div>}</td>
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
    {showAdd&&<div className="mov"><div className="modal" style={{maxHeight:"90vh",overflowY:"auto"}}><h2>Add Menu Item</h2>
      <div className="fg"><label className="fl">Item Name *</label><input className="fi" value={newItem.name} onChange={e=>setNewItem({...newItem,name:e.target.value})} placeholder="e.g. Chicken Tikka"/></div>
      <div className="fr"><div className="fg"><label className="fl">Category *</label><div style={{display:"flex",gap:".4rem"}}><select className="fi" style={{flex:1}} value={newItem.category} onChange={e=>setNewItem({...newItem,category:e.target.value})}><option value="">Select…</option>{cats.map(c=><option key={c}>{c}</option>)}</select><input className="fi" style={{flex:1}} value={newItem.newCat||""} onChange={e=>setNewItem({...newItem,newCat:e.target.value,category:e.target.value})} placeholder="Or new category"/></div></div>
      <div className="fg"><label className="fl">Price *</label><input className="fi" value={newItem.price} onChange={e=>setNewItem({...newItem,price:e.target.value})} placeholder="e.g. 250 or 150/280"/></div></div>
      <div className="fg"><label className="fl">Description</label><input className="fi" value={newItem.description} onChange={e=>setNewItem({...newItem,description:e.target.value})} placeholder="Short description (optional)"/></div>
      <div className="fg"><label className="fl">Variation Type</label><div style={{display:"flex",gap:".4rem",flexWrap:"wrap"}}>
        {[["none","None"],["halfFull","Half / Full"],["dryGravy","Dry / Gravy"],["choices","Choices"],["addon","Add-on"]].map(([val,lbl])=>
          <div key={val} onClick={()=>setNewItem({...newItem,popup:val==="none"?undefined:val})} style={{padding:".38rem .7rem",borderRadius:8,border:`2px solid ${(newItem.popup||"none")===val||(val==="none"&&!newItem.popup)?"var(--a)":"var(--b)"}`,background:(newItem.popup||"none")===val||(val==="none"&&!newItem.popup)?"rgba(192,57,43,.1)":"var(--s2)",cursor:"pointer",fontSize:".78rem"}}>{lbl}</div>
        )}</div></div>
      {(newItem.popup==="choices"||newItem.popup==="addon")&&<div className="fg"><label className="fl">{newItem.popup==="choices"?"Choice Options":"Add-on Options"}</label>
        <div style={{display:"flex",flexDirection:"column",gap:".4rem",marginBottom:".5rem"}}>{(newItem.options||[]).map((o,i)=>
          <div key={i} style={{display:"flex",gap:".4rem",alignItems:"center"}}><input className="fi" style={{flex:2}} value={o.label} onChange={e=>{const opts=[...(newItem.options||[])];opts[i]={...opts[i],label:e.target.value};setNewItem({...newItem,options:opts});}} placeholder="Label"/><input className="fi" style={{flex:1}} value={o.price} onChange={e=>{const opts=[...(newItem.options||[])];opts[i]={...opts[i],price:Number(e.target.value)||0};setNewItem({...newItem,options:opts});}} placeholder="Price"/><button onClick={()=>{const opts=(newItem.options||[]).filter((_,j)=>j!==i);setNewItem({...newItem,options:opts});}} style={{background:"transparent",border:"none",color:"#e07070",cursor:"pointer",fontSize:"1rem"}}>✕</button></div>
        )}</div><button onClick={()=>setNewItem({...newItem,options:[...(newItem.options||[]),{label:"",price:0}]})} style={{background:"var(--s2)",border:"1px dashed var(--b2)",borderRadius:6,padding:".35rem",width:"100%",color:"var(--m)",cursor:"pointer",fontSize:".78rem"}}>+ Add Option</button></div>}
      <div className="macts"><button className="bg" onClick={()=>{setShowAdd(false);setNewItem({name:"",category:"",price:"",description:"",emoji:""});}}>Cancel</button><button className="ba" onClick={()=>{
        if(!newItem.name||!newItem.price)return;
        const item={name:newItem.name,category:newItem.category||newItem.newCat||"Uncategorized",price:newItem.price,description:newItem.description||"",emoji:newItem.emoji||"",id:Date.now(),available:true,outOfStock:false};
        if(newItem.popup){item.popup=newItem.popup;if(newItem.popup==="choices")item.choices=(newItem.options||[]).filter(o=>o.label.trim());if(newItem.popup==="addon")item.addons=(newItem.options||[]).filter(o=>o.label.trim());}
        setMenuItems(p=>[...p,item]);insertMenuItem(item);setShowAdd(false);setNewItem({name:"",category:"",price:"",description:"",emoji:""});
      }} disabled={!newItem.name||!newItem.price}>Add Item</button></div></div></div>}
    {editItem&&<EditItemModal item={editItem} onSave={saveEdit} onClose={()=>setEditItem(null)}/>}
    {delPwdModal&&<div className="mov"><div className="modal"><h2>Confirm Delete</h2>
      <p style={{color:"var(--m)",fontSize:".85rem",marginBottom:"1rem"}}>Enter admin password to delete this item</p>
      {delPwdErr&&<div className="aerr" style={{marginBottom:".5rem"}}>Incorrect password</div>}
      <div className="fg"><label className="fl">Password</label><input className="fi" type="password" value={delPwd} onChange={e=>{setDelPwd(e.target.value);setDelPwdErr(false);}} onKeyDown={e=>e.key==="Enter"&&handleDelPwd()}/></div>
      <div className="macts"><button className="bg" onClick={()=>setDelPwdModal(null)}>Cancel</button><button className="ba" onClick={handleDelPwd}>Delete Item</button></div>
    </div></div>}
  </div>);
}
// ── EDIT ITEM MODAL ───────────────────────────────────────────────────────────
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
        <div key={val} onClick={()=>setPopupType(val)} style={{padding:".38rem .7rem",borderRadius:8,border:`2px solid ${popupType===val?"var(--a)":"var(--b)"}`,background:popupType===val?"rgba(192,57,43,.1)":"var(--s2)",cursor:"pointer",fontSize:".78rem"}}>{lbl}</div>
      )}</div></div>
    {isList&&<div className="fg"><label className="fl">{popupType==="choices"?"Choice Options":"Add-on Options"}</label>
      <div style={{display:"flex",flexDirection:"column",gap:".4rem",marginBottom:".5rem"}}>{choices.map((c,i)=>
        <div key={i} style={{display:"flex",gap:".4rem",alignItems:"center"}}><input className="fi" style={{flex:2}} value={c.label} onChange={e=>updateChoice(i,"label",e.target.value)} placeholder="Label"/><input className="fi" style={{flex:1}} value={c.price} onChange={e=>updateChoice(i,"price",e.target.value)} placeholder="Price"/><button onClick={()=>removeChoice(i)} style={{background:"transparent",border:"none",color:"#e07070",cursor:"pointer"}}>✕</button></div>
      )}</div><button onClick={addChoice} style={{background:"var(--s2)",border:"1px dashed var(--b2)",borderRadius:6,padding:".35rem",width:"100%",color:"var(--m)",cursor:"pointer",fontSize:".78rem"}}>+ Add Option</button></div>}
    <div className="macts"><button className="bg" onClick={onClose}>Cancel</button><button className="ba" onClick={save} disabled={!name.trim()||!price.trim()}>Save Changes</button></div>
  </div></div>);
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function GrillinApp() {
  const [page, setPage] = useState("customer");
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [authed, setAuthed] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [adminPassword, setAdminPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [settings, setSettings] = useState({
    deliveryMinEnabled: true,
    deleteProtection: false,
    offerEnabled: false,
    offerPercent: 10,
  });

  // Load data from Supabase on mount
  useEffect(() => {
    async function loadData() {
      const [menu, ords, dbSettings] = await Promise.all([fetchMenuItems(), fetchOrders(), fetchSettings()]);
      setMenuItems(menu);
      setOrders(ords);
      if (dbSettings.admin_password) setAdminPassword(dbSettings.admin_password);
      setSettings({
        deliveryMinEnabled: dbSettings.delivery_min_enabled !== "false",
        deleteProtection: dbSettings.delete_protection === "true",
        offerEnabled: dbSettings.offer_enabled === "true",
        offerPercent: parseInt(dbSettings.offer_percent) || 10,
      });
      setLoading(false);
    }
    loadData();
  }, []);

  // Pending alert state
  const [alertOrder, setAlertOrder] = useState(null);
  const alertIntervalRef = useCallback(() => {}, []);
  alertIntervalRef.current = alertIntervalRef.current || { id: null };

  // Loud repeating alarm sound
  const playLoudAlarm = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, start, dur, vol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = "square";
        gain.gain.setValueAtTime(vol, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      playTone(800, 0, 0.12, 0.6); playTone(1000, 0.15, 0.12, 0.6);
      playTone(800, 0.3, 0.12, 0.6); playTone(1000, 0.45, 0.12, 0.6);
      playTone(1200, 0.6, 0.3, 0.7);
    } catch(e) { console.log("Audio error:", e); }
  }, []);

  const startAlarm = useCallback((order) => {
    setAlertOrder(order);
    playLoudAlarm();
    if (alertIntervalRef.current.id) clearInterval(alertIntervalRef.current.id);
    const id = setInterval(() => { playLoudAlarm(); }, 2500);
    alertIntervalRef.current.id = id;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("NEW ORDER #" + order.num, { body: order.customer + " — ₹" + parseFloat(order.total).toFixed(0), requireInteraction: true });
    }
  }, [playLoudAlarm, alertIntervalRef]);

  const acknowledgeOrder = useCallback(() => {
    if (alertIntervalRef.current.id) { clearInterval(alertIntervalRef.current.id); alertIntervalRef.current.id = null; }
    setAlertOrder(null);
  }, [alertIntervalRef]);

  useEffect(() => {
    if (page === "admin" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [page]);

  useEffect(() => { return () => { if (alertIntervalRef.current && alertIntervalRef.current.id) clearInterval(alertIntervalRef.current.id); }; }, [alertIntervalRef]);

  // Real-time subscription for orders
  useEffect(() => {
    const channel = subscribeToOrders((payload) => {
      if (payload.eventType === "INSERT") {
        setOrders(prev => {
          if (prev.find(o => o.id === payload.new.id)) return prev;
          const newOrder = { id:payload.new.id, num:payload.new.num, customer:payload.new.customer, phone:payload.new.phone,
            address:payload.new.address, addr:payload.new.addr, type:payload.new.type, notes:payload.new.notes||"",
            items:payload.new.items||[], total:parseFloat(payload.new.total), status:payload.new.status, placedAt:new Date(payload.new.placed_at) };
          startAlarm(newOrder);
          return [newOrder, ...prev];
        });
      } else if (payload.eventType === "UPDATE") {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? {...o, status:payload.new.status} : o));
      } else if (payload.eventType === "DELETE") {
        setOrders(prev => prev.filter(o => o.id !== payload.old.id));
      }
    });
    return () => { channel.unsubscribe(); };
  }, [startAlarm]);

  // Real-time subscription for menu changes
  useEffect(() => {
    const channel = subscribeToMenu((payload) => {
      if (payload.eventType === "UPDATE") {
        const r = payload.new;
        setMenuItems(prev => prev.map(i => i.id === r.id ? {...i, available:r.available, outOfStock:r.out_of_stock, name:r.name, price:r.price, description:r.description||""} : i));
      } else if (payload.eventType === "INSERT") {
        fetchMenuItems().then(setMenuItems);
      } else if (payload.eventType === "DELETE") {
        setMenuItems(prev => prev.filter(i => i.id !== payload.old.id));
      }
    });
    return () => { channel.unsubscribe(); };
  }, []);

  const handleOrderPlaced = (order) => {
    setOrders(prev => {
      if (prev.find(o => o.id === order.id)) return prev;
      return [order, ...prev];
    });
  };

  const AlertOverlay = () => alertOrder ? (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.85)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"#1a1815",border:"2px solid #c0392b",borderRadius:20,padding:"2.5rem",width:400,maxWidth:"95vw",textAlign:"center",animation:"popIn .2s ease"}}>
        <div style={{fontSize:"4rem",marginBottom:".5rem",animation:"pulse 1s infinite"}}>🔔</div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"1.5rem",marginBottom:".3rem"}}>New Order!</h2>
        <div style={{fontSize:"1.2rem",color:"#c0392b",fontWeight:700,marginBottom:".5rem"}}>#{alertOrder.num}</div>
        <div style={{fontSize:".95rem",marginBottom:".2rem"}}>{alertOrder.customer}</div>
        <div style={{fontSize:".85rem",color:"#8a8078",marginBottom:".3rem"}}>{alertOrder.type==="Delivery"?"🛵 Delivery":"🏃 Pickup"}</div>
        <div style={{fontSize:"1.3rem",fontWeight:700,marginBottom:"1.5rem"}}>₹{parseFloat(alertOrder.total).toFixed(0)}</div>
        <button onClick={acknowledgeOrder} style={{width:"100%",padding:".9rem",background:"#c0392b",color:"white",border:"none",borderRadius:10,fontSize:"1rem",fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>✓ Accept Order</button>
      </div>
    </div>
  ) : null;

  if (loading) return <><style>{S}</style><div className="loading-screen">Loading menu...</div></>;
  if (page === "admin-login") return <><style>{S}</style><AdminLogin onLogin={()=>{setAuthed(true);setPage("admin");}} password={adminPassword}/></>;
  if (page === "admin") return (<><style>{S}</style><AdminPanel menuItems={menuItems} setMenuItems={setMenuItems} orders={orders} setOrders={setOrders} onLogout={()=>setPage("customer")} settings={settings} setSettings={setSettings} adminPassword={adminPassword} setAdminPassword={setAdminPassword}/>
    <AlertOverlay/>
    <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}`}</style>
  </>);

  return (<><style>{S}</style><CustomerView menuItems={menuItems} search={search} setSearch={setSearch} onOrderPlaced={handleOrderPlaced} orders={orders} onAccessClick={()=>setPage(authed?"admin":"admin-login")} settings={settings}/></>);
}
