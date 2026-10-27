export type OrderItemLike = {
  resellerPrice?: number;
  sellingPrice?: number;
  quantity?: number;
};

export function getOrderProfit(
  data: any,
  productMap?: Record<string, number>
): number {
  if (typeof data.profit === 'number' && Number.isFinite(data.profit)) {
    return data.profit;
  }

  if (Array.isArray(data.items) && data.items.length > 0) {
    return (data.items as OrderItemLike[]).reduce((sum, item) => {
      const resP = Number(item.resellerPrice) || 0;
      const sellP = Number(item.sellingPrice) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + (sellP - resP) * qty;
    }, 0);
  }

  const quantity = Number(data.quantity) || 1;
  const sellingPrice = Number(data.sellingPrice) || 0;
  const resellerPrice =
    Number(data.resellerPrice) ||
    (productMap && data.productId ? productMap[data.productId] || 0 : 0);

  const profit = (sellingPrice - resellerPrice) * quantity;
  return Number.isFinite(profit) ? Math.max(0, profit) : 0;
}
