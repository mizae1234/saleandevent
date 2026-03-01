export interface SaleItemInput {
    barcode: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    isFreebie?: boolean;
}

export interface AdjustmentInput {
    description: string;
    amount: number;
}

export interface CreateSaleInput {
    channelId?: string;
    items: SaleItemInput[];
    adjustments?: AdjustmentInput[];
    discount?: number;
}
