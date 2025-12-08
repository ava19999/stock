import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, Order, StockHistory, ChatSession, Message } from '../types';

// --- INVENTORY SERVICES ---

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const { data, error } = await supabase.from('inventory').select('*');
  if (error) {
    console.error('Error fetching inventory:', error);
    return [];
  }
  // Mapping snake_case (Supabase) ke camelCase (App)
  return data.map((item: any) => ({
    id: item.id, // UUID dari supabase
    partNumber: item.part_number,
    name: item.name,
    description: item.description,
    price: item.price,
    costPrice: item.cost_price,
    quantity: item.quantity,
    initialStock: item.initial_stock,
    qtyIn: item.qty_in,
    qtyOut: item.qty_out,
    shelf: item.shelf,
    imageUrl: item.image_url,
    ecommerce: item.ecommerce,
    lastUpdated: item.last_updated
  }));
};

export const addInventory = async (item: InventoryFormData): Promise<boolean> => {
  const { error } = await supabase.from('inventory').insert([{
    part_number: item.partNumber,
    name: item.name,
    description: item.description,
    price: item.price,
    cost_price: item.costPrice,
    quantity: item.quantity,
    initial_stock: item.initialStock,
    qty_in: item.qtyIn,
    qty_out: item.qtyOut,
    shelf: item.shelf,
    image_url: item.imageUrl,
    ecommerce: item.ecommerce,
    last_updated: Date.now()
  }]);

  if (error) {
    console.error('Error adding inventory:', error);
    return false;
  }
  return true;
};

export const updateInventory = async (item: InventoryItem): Promise<boolean> => {
  // Kita cari berdasarkan part_number atau ID
  const { error } = await supabase.from('inventory').update({
    name: item.name,
    description: item.description,
    price: item.price,
    cost_price: item.costPrice,
    quantity: item.quantity,
    initial_stock: item.initialStock,
    qty_in: item.qtyIn,
    qty_out: item.qtyOut,
    shelf: item.shelf,
    image_url: item.imageUrl,
    ecommerce: item.ecommerce,
    last_updated: Date.now()
  }).eq('part_number', item.partNumber);

  if (error) {
    console.error('Error updating inventory:', error);
    return false;
  }
  return true;
};

export const deleteInventory = async (partNumber: string): Promise<boolean> => {
  const { error } = await supabase.from('inventory').delete().eq('part_number', partNumber);
  if (error) {
    console.error('Error deleting inventory:', error);
    return false;
  }
  return true;
};

// --- ORDER SERVICES ---

export const fetchOrders = async (): Promise<Order[]> => {
  const { data, error } = await supabase.from('orders').select('*').order('timestamp', { ascending: false });
  if (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
  return data.map((o: any) => ({
    id: o.id,
    customerName: o.customer_name,
    items: o.items, // JSONB otomatis jadi object/array
    totalAmount: o.total_amount,
    status: o.status,
    timestamp: o.timestamp
  }));
};

export const saveOrder = async (order: Order): Promise<boolean> => {
  const { error } = await supabase.from('orders').insert([{
    id: order.id,
    customer_name: order.customerName,
    items: order.items,
    total_amount: order.totalAmount,
    status: order.status,
    timestamp: order.timestamp
  }]);
  if (error) {
    console.error('Error saving order:', error);
    return false;
  }
  return true;
};

export const updateOrderStatusService = async (orderId: string, status: string): Promise<boolean> => {
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (error) return false;
  return true;
};

// --- HISTORY SERVICES ---

export const fetchHistory = async (): Promise<StockHistory[]> => {
  const { data, error } = await supabase.from('stock_history').select('*').order('timestamp', { ascending: false });
  if (error) return [];
  return data.map((h: any) => ({
    id: h.id,
    itemId: h.item_id,
    partNumber: h.part_number,
    name: h.name,
    type: h.type,
    quantity: h.quantity,
    previousStock: h.previous_stock,
    currentStock: h.current_stock,
    timestamp: h.timestamp,
    reason: h.reason
  }));
};

export const addHistoryLog = async (history: StockHistory): Promise<boolean> => {
  const { error } = await supabase.from('stock_history').insert([{
    id: history.id,
    item_id: history.itemId,
    part_number: history.partNumber,
    name: history.name,
    type: history.type,
    quantity: history.quantity,
    previous_stock: history.previousStock,
    current_stock: history.currentStock,
    timestamp: history.timestamp,
    reason: history.reason
  }]);
  if (error) return false;
  return true;
};

// --- CHAT SERVICES ---

export const fetchChatSessions = async (): Promise<ChatSession[]> => {
  const { data, error } = await supabase.from('chat_sessions').select('*');
  if (error) return [];
  return data.map((c: any) => ({
    customerId: c.customer_id,
    customerName: c.customer_name,
    messages: c.messages,
    lastMessage: c.last_message,
    lastTimestamp: c.last_timestamp,
    unreadAdminCount: c.unread_admin_count,
    unreadUserCount: c.unread_user_count
  }));
};

export const saveChatSession = async (session: ChatSession): Promise<boolean> => {
  // Upsert (Insert atau Update jika ada)
  const { error } = await supabase.from('chat_sessions').upsert([{
    customer_id: session.customerId,
    customer_name: session.customerName,
    messages: session.messages,
    last_message: session.lastMessage,
    last_timestamp: session.lastTimestamp,
    unread_admin_count: session.unreadAdminCount,
    unread_user_count: session.unreadUserCount
  }]);
  if (error) {
    console.error('Error saving chat:', error);
    return false;
  }
  return true;
};