// FILE: src/services/supabaseService.ts
import { supabase } from '../lib/supabase';
import { InventoryItem, InventoryFormData, Order, StockHistory, ChatSession } from '../types';

// --- INVENTORY SERVICES ---

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  try {
    // Ambil data dengan range besar
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .range(0, 9999);

    if (error) {
      console.error('Error fetching inventory:', error.message);
      return [];
    }

    // PENGECEKAN KEAMANAN (PENTING):
    // Jika data null/kosong, kembalikan array kosong agar tidak blank putih
    if (!data || !Array.isArray(data)) {
        return [];
    }
    
    // Mapping data
    return data.map((item: any) => ({
      id: item.id,
      partNumber: item.part_number,
      name: item.name,
      description: item.description,
      price: Number(item.price) || 0,
      costPrice: Number(item.cost_price) || 0,
      quantity: Number(item.quantity) || 0,
      initialStock: Number(item.initial_stock) || 0,
      qtyIn: Number(item.qty_in) || 0,
      qtyOut: Number(item.qty_out) || 0,
      shelf: item.shelf,
      imageUrl: item.image_url,
      ecommerce: item.ecommerce,
      lastUpdated: item.last_updated
    }));
  } catch (err) {
    console.error("Unexpected error in fetchInventory:", err);
    return [];
  }
};

export const addInventory = async (item: InventoryFormData): Promise<boolean> => {
  try {
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
      console.error('Error adding inventory:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const updateInventory = async (item: InventoryItem): Promise<boolean> => {
  try {
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
      console.error('Error updating inventory:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const deleteInventory = async (partNumber: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('inventory').delete().eq('part_number', partNumber);
    if (error) {
      console.error('Error deleting inventory:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

// --- ORDER SERVICES ---

export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(0, 4999);

    if (error) {
      console.error('Error fetching orders:', error.message);
      return [];
    }
    
    if (!data) return [];

    return data.map((o: any) => ({
      id: o.id,
      customerName: o.customer_name,
      items: o.items,
      totalAmount: o.total_amount,
      status: o.status,
      timestamp: o.timestamp
    }));
  } catch (e) {
    return [];
  }
};

export const saveOrder = async (order: Order): Promise<boolean> => {
  try {
    const { error } = await supabase.from('orders').insert([{
      id: order.id,
      customer_name: order.customerName,
      items: order.items,
      total_amount: order.totalAmount,
      status: order.status,
      timestamp: order.timestamp
    }]);
    if (error) {
      console.error('Error saving order:', error.message);
      return false;
    }
    return true;
  } catch (e) { return false; }
};

export const updateOrderStatusService = async (orderId: string, status: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    return !error;
  } catch { return false; }
};

// --- HISTORY SERVICES ---

export const fetchHistory = async (): Promise<StockHistory[]> => {
  try {
    const { data, error } = await supabase
      .from('stock_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(0, 4999);

    if (error || !data) return [];
    
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
  } catch { return []; }
};

export const addHistoryLog = async (history: StockHistory): Promise<boolean> => {
  try {
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
    return !error;
  } catch { return false; }
};

// --- CHAT SERVICES ---

export const fetchChatSessions = async (): Promise<ChatSession[]> => {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .range(0, 1999);

    if (error || !data) return [];
    
    return data.map((c: any) => ({
      customerId: c.customer_id,
      customerName: c.customer_name,
      messages: c.messages,
      lastMessage: c.last_message,
      lastTimestamp: c.last_timestamp,
      unreadAdminCount: c.unread_admin_count,
      unreadUserCount: c.unread_user_count
    }));
  } catch { return []; }
};

export const saveChatSession = async (session: ChatSession): Promise<boolean> => {
  try {
    const { error } = await supabase.from('chat_sessions').upsert([{
      customer_id: session.customerId,
      customer_name: session.customerName,
      messages: session.messages,
      last_message: session.lastMessage,
      last_timestamp: session.lastTimestamp,
      unread_admin_count: session.unreadAdminCount,
      unread_user_count: session.unreadUserCount
    }]);
    return !error;
  } catch { return false; }
};