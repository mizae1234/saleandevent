'use server';

import { db } from '@/lib/db';

export async function getStockRequestsByChannel(channelId: string) {
    return db.stockRequest.findMany({
        where: { channelId },
        include: {
            allocations: { include: { product: true } },
            shipment: true,
            receiving: { include: { items: true } },
            items: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function getStockRequest(requestId: string) {
    return db.stockRequest.findUnique({
        where: { id: requestId },
        include: {
            channel: true,
            allocations: {
                include: { product: true },
                orderBy: { createdAt: 'asc' },
            },
            shipment: true,
            receiving: {
                include: {
                    items: { include: { product: true } },
                },
            },
            items: { include: { product: true } },
        },
    });
}

export async function getPendingStockRequests() {
    return db.stockRequest.findMany({
        where: { status: 'submitted' },
        include: {
            channel: true,
        },
        orderBy: { createdAt: 'asc' },
    });
}

export async function getApprovedStockRequests() {
    return db.stockRequest.findMany({
        where: { status: { in: ['approved', 'allocated'] } },
        include: {
            channel: true,
            allocations: true,
        },
        orderBy: { createdAt: 'asc' },
    });
}

export async function getPackedStockRequests() {
    return db.stockRequest.findMany({
        where: { status: 'packed' },
        include: {
            channel: true,
            allocations: true,
            shipment: true,
        },
        orderBy: { createdAt: 'asc' },
    });
}

export async function getShippedStockRequests() {
    return db.stockRequest.findMany({
        where: { status: 'shipped' },
        include: {
            channel: true,
            allocations: { include: { product: true } },
            shipment: true,
        },
        orderBy: { createdAt: 'asc' },
    });
}
