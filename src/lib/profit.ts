
export type OrderItemLike = {
  resellerPrice?: number;
  sellingPrice?: number;
  quantity?: number;
  productId?: string;
};

export type OrderLike = {
  profit?: number;
  items?: OrderItemLike[];
  quantity?: number;
  sellingPrice?: number;
  resellerPrice?: number;
  productId?: string;
};

function toValidNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Calculates reseller profit for an order.
 *
 * Priority:
 * 1. Use an explicitly saved, finite order profit.
 * 2. Calculate profit from order items.
 * 3. Calculate profit from the single-product order fields.
 *
 * productPrices maps product IDs to their reseller prices.
 */
export function getOrderProfit(
  order: OrderLike,
  productPrices: Record<string, number> = {},
): number {
  if (
    typeof order.profit === 'number' &&
    Number.isFinite(order.profit)
  ) {
    return order.profit;
  }

  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.reduce((sum, item) => {
      const sellingPrice = toValidNumber(item.sellingPrice);
      const resellerPrice = toValidNumber(item.resellerPrice);
      const quantity = Math.max(1, toValidNumber(item.quantity) || 1);

      return sum + (sellingPrice - resellerPrice) * quantity;
    }, 0);
  }

  const quantity = Math.max(1, toValidNumber(order.quantity) || 1);
  const sellingPrice = toValidNumber(order.sellingPrice);

  const savedResellerPrice = toValidNumber(order.resellerPrice);
  const productResellerPrice =
    order.productId && Number.isFinite(productPrices[order.productId])
      ? toValidNumber(productPrices[order.productId])
      : 0;

  const resellerPrice = savedResellerPrice || productResellerPrice;

  const profit = (sellingPrice - resellerPrice) * quantity;

  return Number.isFinite(profit) ? profit : 0;
}
