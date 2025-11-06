/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { onMounted, onWillUpdateProps, onWillUnmount, useState } from "@odoo/owl";
import { ProductInfoPopup } from "@point_of_sale/app/screens/product_screen/product_info_popup/product_info_popup";
import { cache, buildCtx, keyWhere, readLSWhere } from "./cache_indexeddb";

/* ============ helpers ============ */
function storageBase(pos){
  const user = pos?.env?.services?.user;
  const db   = (user && user.context && user.context.db) || "";
  const cmp  = (pos && pos.config && pos.config.company_id && pos.config.company_id[0]) || "0";
  const cfg  = (pos && pos.config && pos.config.id) || "0";
  return `POS_OFFLINE_INFO/v17/${db}/${cmp}/${cfg}`;
}
function lsGet(k){ try { return JSON.parse(localStorage.getItem(k) || "null") || {}; } catch { return {}; } }
function locIdOf(r){ return (r && (r.location_id || (r.location && r.location.id) || r.id)) || null; }
function prettyName(row){
  const base = (row && (row.path || row.display_name || row.complete_name || "")) || "";
  const parts = String(base).split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : (base || ("Ubicación " + (row && (row.location_id || ""))));
}

/* reservas PERSISTIDAS + LEGACY: merge suma por producto/ubicación */
function getPersistedReservationsByLoc(pos){
  const base = storageBase(pos);
  const A = lsGet(base + "/reservations_persisted"); // nueva
  const B = lsGet(base + "/reservations");           // legacy (por si algo la usa)
  const out = {};
  const merge = (src)=>{
    for (const [pid, byLoc] of Object.entries(src||{})){
      out[pid] = out[pid] || {};
      for (const [lid, q] of Object.entries(byLoc||{})){
        out[pid][lid] = (Number(out[pid][lid]) || 0) + Number(q || 0);
      }
    }
  };
  merge(A); merge(B);
  return out;
}

/* reservas en sesión (líneas abiertas) por producto/ubicación */
function getSessionReservationsByLoc(pos){
  const byPid = {};
  const orders = (pos && (pos.get_order_list?.() || pos.get_orders?.())) || [];
  const defaultLoc = (pos && pos.config && pos.config.stock_location_id && pos.config.stock_location_id[0]) || null;

  for (const o of orders){
    const lines = o.get_orderlines?.() || [];
    for (const l of lines){
      const p   = l.get_product ? l.get_product() : l.product;
      const qty = (l.get_quantity ? l.get_quantity() : l.qty) || 0;
      if (!p || !p.id || !qty) continue;

      const chosen = (l.getPosSourceLocationId && l.getPosSourceLocationId()) || defaultLoc;
      if (!chosen) continue;

      const pid = String(p.id), lid = String(chosen);
      if (!byPid[pid]) byPid[pid] = {};
      byPid[pid][lid] = (Number(byPid[pid][lid]) || 0) + Number(qty);
    }
  }
  return byPid;
}

/* aplica overlay (resta) por ubicación */
function applySessionDeltasPerLocation(pos, product, rows){
  if (!product || !Array.isArray(rows) || rows.length === 0) return rows || [];

  const pid  = String(product.id);
  const sess = getSessionReservationsByLoc(pos)[pid]   || {};
  const pers = getPersistedReservationsByLoc(pos)[pid] || {};

  const deltas = {};
  for (const k in sess) deltas[k] = (deltas[k] || 0) + Number(sess[k] || 0);
  for (const k in pers) deltas[k] = (deltas[k] || 0) + Number(pers[k] || 0);

  try { console.log("[pos_offline_info] overlay deltas pid=", pid, deltas); } catch {}

  return rows.map((r) => {
    const lid  = String(locIdOf(r) || "");
    const base =
      Number(
        (r && r.available_quantity) ??
        (r && r.on_hand) ??
        (r && r.qty) ??
        (r && r.quantity_available) ??
        (r && r.free_qty) ??
        0
      );
    const newQty = Math.max(0, base - (Number(deltas[lid] || 0)));

    const fbaseRaw =
      (r && (r.forecasted_quantity ?? r.forecasted));
    const fbase = Number( (fbaseRaw != null ? fbaseRaw : base) );
    const fqty  = Math.max(0, fbase - (Number(deltas[lid] || 0)));

    return {
      ...r,
      qty: newQty,
      available_quantity: newQty,
      on_hand: newQty,
      forecasted_quantity: fqty,
      forecasted: fqty,
    };
  });
}

/* ============ PATCH ============ */
const _setup = ProductInfoPopup.prototype.setup;

if (!ProductInfoPopup.prototype.__pos_where_owner__){
  ProductInfoPopup.prototype.__pos_where_owner__ = "pos_offline_info";
}

patch(ProductInfoPopup.prototype, {
  setup(){
    _setup && _setup.apply(this, arguments);
    const pos = this.env.services.pos;

    this.whereState = this.whereState || useState({ rows: [], productId: null, rev: 0 });

    const readCacheRows = async (productId) => {
      const ctx = buildCtx(pos);
      let rows = await cache.getJSON("where", keyWhere(ctx, productId));
      if (!Array.isArray(rows) || rows.length === 0){
        const ls = readLSWhere(pos, productId);
        if (Array.isArray(ls) && ls.length) rows = ls;
      }
      return Array.isArray(rows) ? rows : [];
    };

    const recomputeFromCache = async (product) => {
      if (!product) return;
      const rows0  = await readCacheRows(product.id);
      const rowsAdj = applySessionDeltasPerLocation(pos, product, rows0);

      const before = JSON.stringify(this.whereState.rows || []);
      const after  = JSON.stringify(rowsAdj || []);
      this.whereState.rows = rowsAdj;
      if (before !== after){
        this.whereState.rev = (Number(this.whereState.rev) || 0) + 1;
      }
      this.whereState.productId = product.id;
    };

    const refreshWhereBlockingIfEmpty = async (product) => {
      if (!navigator.onLine) return;
      const ctx = buildCtx(pos);
      const cached = await cache.getJSON("where", keyWhere(ctx, product.id));
      const hadCache = Array.isArray(cached) && cached.length > 0;

      const doFetch = async () => {
        try {
          const rows = await this.env.services.orm.call(
            "product.product", "pos_where", [product.id, pos.config.id], {}
          );
          await cache.setJSON("where", keyWhere(ctx, product.id), Array.isArray(rows) ? rows : []);
          window.__pos_rpc_down__ = false;
          if (this.whereState.productId === product.id) await recomputeFromCache(product);
        } catch (e) {
          window.__pos_rpc_down__ = true;
          console.debug("[pos_offline_info] where refresh failed; using cache", e);
        }
      };

      if (hadCache){ doFetch(); return; }
      await doFetch();
    };

    this.prettyName = prettyName;
    this.fmtQty = (q) => {
      const n = Number(q);
      try { return pos && pos.formatFloat ? pos.formatFloat(n) : (Number.isFinite(n) ? n.toFixed(2) : "0.00"); }
      catch { return Number.isFinite(n) ? n.toFixed(2) : "0.00"; }
    };

    if (pos?.on && !this.__pos_offline_overlay_bus__){
      const cb = async () => {
        try { if (this.props?.product) await recomputeFromCache(this.props.product); }
        catch (e) { console.debug("overlay bus cb:", e); }
      };
      pos.on("pos_offline_reservations_changed", this, cb);
      this.__pos_offline_overlay_bus__ = () => { try { pos.off("pos_offline_reservations_changed", this, cb); } catch {} };
    }

    onMounted(async () => {
      if (this.props?.product) {
        await recomputeFromCache(this.props.product);
        await refreshWhereBlockingIfEmpty(this.props.product);
      }
      // timer por si cambian líneas abiertas sin evento
      this.__where_refresh_timer__ = setInterval(() => {
        try { if (this.props?.product) recomputeFromCache(this.props.product); } catch {}
      }, 1000);
    });

    onWillUpdateProps(async (next) => {
      if (next?.product && next.product.id !== this.whereState.productId){
        await recomputeFromCache(next.product);
        await refreshWhereBlockingIfEmpty(next.product);
      }
    });

    onWillUnmount(() => {
      if (this.__where_refresh_timer__){
        clearInterval(this.__where_refresh_timer__);
        this.__where_refresh_timer__ = null;
      }
      if (this.__pos_offline_overlay_bus__){
        this.__pos_offline_overlay_bus__();
        this.__pos_offline_overlay_bus__ = null;
      }
    });
  },
});
