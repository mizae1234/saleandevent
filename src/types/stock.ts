export interface AllocationRow {
    barcode: string;
    code?: string;   // original product code from Excel (e.g. "SR04-1")
    color?: string;  // original color from Excel (e.g. "แดง")
    size: string | null;
    packedQuantity: number;
    price: number;
}

export interface ReceivingItemInput {
    barcode: string;
    allocatedQty: number;
    receivedQty: number;
    remarks?: string;
}

export interface TransferItemInput {
    barcode: string;
    quantity: number;
}

export interface TransferReceivingInput {
    barcode: string;
    sentQuantity: number;
    receivedQuantity: number;
}
