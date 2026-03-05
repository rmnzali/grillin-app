import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── MENU ITEMS ────────────────────────────────────────────────────────────────

export async function fetchMenuItems() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { console.error('fetchMenuItems error:', error); return []; }
  return data.map(dbToMenuItem);
}

export async function updateMenuItem(item) {
  const row = menuItemToDb(item);
  const { error } = await supabase
    .from('menu_items')
    .update(row)
    .eq('id', item.id);
  if (error) console.error('updateMenuItem error:', error);
}

export async function insertMenuItem(item) {
  const row = menuItemToDb(item);
  const { data, error } = await supabase
    .from('menu_items')
    .insert(row)
    .select();
  if (error) console.error('insertMenuItem error:', error);
  return data?.[0] ? dbToMenuItem(data[0]) : null;
}

export async function deleteMenuItem(id) {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id);
  if (error) console.error('deleteMenuItem error:', error);
}

export async function bulkInsertMenuItems(items) {
  const rows = items.map(menuItemToDb);
  const { error } = await supabase
    .from('menu_items')
    .insert(rows);
  if (error) console.error('bulkInsertMenuItems error:', error);
}

// ── ORDERS ────────────────────────────────────────────────────────────────────

export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('placed_at', { ascending: false });
  if (error) { console.error('fetchOrders error:', error); return []; }
  return data.map(dbToOrder);
}

export async function insertOrder(order) {
  const row = orderToDb(order);
  const { error } = await supabase
    .from('orders')
    .insert(row);
  if (error) console.error('insertOrder error:', error);
}

export async function updateOrderStatus(id, status) {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('updateOrderStatus error:', error);
}

export async function cancelOrder(id, reason, contactedCustomer) {
  const notes = reason + (contactedCustomer ? " [Customer contacted]" : "");
  const { error } = await supabase
    .from('orders')
    .update({ status: 'Cancelled', notes, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('cancelOrder error:', error);
}

export async function deleteOrder(id) {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);
  if (error) console.error('deleteOrder error:', error);
}

export async function deleteDoneOrders() {
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('status', 'Done');
  if (error) console.error('deleteDoneOrders error:', error);
}

// Delete orders older than N days
export async function deleteOldOrders(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('status', 'Done')
    .lt('placed_at', cutoff.toISOString());
  if (error) console.error('deleteOldOrders error:', error);
}

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────

export async function findCustomerByPhone(phone) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();
  if (error) { console.error('findCustomer error:', error); return null; }
  return data;
}

export async function upsertCustomer(customer) {
  const { error } = await supabase
    .from('customers')
    .upsert({
      phone: customer.phone,
      name: customer.name,
      house: customer.house || '',
      apartment: customer.apartment || '',
      street: customer.street || '',
      place: customer.place || '',
      landmark: customer.landmark || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'phone' });
  if (error) console.error('upsertCustomer error:', error);
}

// ── REAL-TIME SUBSCRIPTIONS ───────────────────────────────────────────────────

export function subscribeToOrders(callback) {
  const channel = supabase
    .channel('orders-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
      callback(payload);
    })
    .subscribe();
  return channel;
}

export function subscribeToMenu(callback) {
  const channel = supabase
    .channel('menu-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, (payload) => {
      callback(payload);
    })
    .subscribe();
  return channel;
}

// ── DATA MAPPERS ──────────────────────────────────────────────────────────────

function dbToMenuItem(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    price: row.price,
    description: row.description || '',
    emoji: row.emoji || '🍽',
    popup: row.popup || undefined,
    choices: row.choices || undefined,
    addons: row.addons || undefined,
    available: row.available !== false,
    outOfStock: row.out_of_stock === true,
    sortOrder: row.sort_order || 0,
  };
}

function menuItemToDb(item) {
  return {
    id: item.id,
    category: item.category,
    name: item.name,
    price: String(item.price),
    description: item.description || '',
    emoji: item.emoji || '🍽',
    popup: item.popup || null,
    choices: item.choices || null,
    addons: item.addons || null,
    available: item.available !== false,
    out_of_stock: item.outOfStock === true,
    sort_order: item.sortOrder || item.sort_order || item.id,
    updated_at: new Date().toISOString(),
  };
}

function dbToOrder(row) {
  return {
    id: row.id,
    num: row.num,
    customer: row.customer,
    phone: row.phone,
    address: row.address,
    addr: row.addr,
    type: row.type,
    notes: row.notes || '',
    items: row.items || [],
    total: parseFloat(row.total),
    status: row.status,
    placedAt: new Date(row.placed_at),
  };
}

function orderToDb(order) {
  return {
    id: order.id,
    num: order.num,
    customer: order.customer,
    phone: order.phone,
    address: order.address || null,
    addr: order.addr || null,
    type: order.type,
    notes: order.notes || '',
    items: order.items,
    total: order.total,
    status: order.status || 'New',
    placed_at: order.placedAt instanceof Date ? order.placedAt.toISOString() : new Date().toISOString(),
  };
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────

export async function fetchSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*');
  if (error) { console.error('fetchSettings error:', error); return {}; }
  const result = {};
  (data || []).forEach(row => { result[row.key] = row.value; });
  return result;
}

export async function updateSetting(key, value) {
  // Upsert so new settings keys get created automatically
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) console.error('updateSetting error:', error);
}
