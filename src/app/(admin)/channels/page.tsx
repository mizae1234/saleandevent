import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, MapPin, Plus } from "lucide-react";
import Link from "next/link";

import { EventFilters } from "./EventFilters";
import { Prisma } from "@prisma/client";

// Fetch events directly in Server Component
async function getEvents(searchParams: Promise<{ [key: string]: string | string[] | undefined }>) {
    const params = await searchParams;
    const q = typeof params.q === 'string' ? params.q : undefined;
    const startDate = typeof params.startDate === 'string' ? params.startDate : undefined;
    const endDate = typeof params.endDate === 'string' ? params.endDate : undefined;

    const where: Prisma.SalesChannelWhereInput = {
        AND: []
    };

    if (q) {
        (where.AND as Prisma.SalesChannelWhereInput[]).push({
            OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { code: { contains: q, mode: 'insensitive' } },
            ]
        });
    }

    if (startDate) {
        (where.AND as Prisma.SalesChannelWhereInput[]).push({
            endDate: {
                gte: new Date(startDate)
            }
        });
    }

    if (endDate) {
        (where.AND as Prisma.SalesChannelWhereInput[]).push({
            startDate: {
                lte: new Date(endDate)
            }
        });
    }

    const events = await db.salesChannel.findMany({
        where,
        orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
    });
    return events;
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const events = await getEvents(searchParams);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Events</h2>
                    <p className="text-slate-500">จัดการข้อมูล Event และการออกบูธ</p>
                </div>
                <Link href="/channels/create">
                    <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                        <Plus className="mr-2 h-4 w-4" />
                        สร้าง Event ใหม่
                    </Button>
                </Link>
            </div>

            <EventFilters />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                    <div key={event.id} className="group relative rounded-xl bg-white p-6 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300">
                        <div className="flex items-center justify-between mb-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize
                ${event.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    event.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                        'bg-blue-100 text-blue-800'}`}>
                                {event.status}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{event.code}</span>
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900 mb-2 truncate">{event.name}</h3>

                        <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center">
                                <MapPin className="mr-2 h-4 w-4 text-slate-400" />
                                <span className="truncate">{event.location}</span>
                            </div>
                            <div className="flex items-center">
                                <Calendar className="mr-2 h-4 w-4 text-slate-400" />
                                <span>
                                    {format(new Date(event.startDate!), "d MMM")} - {format(new Date(event.endDate!), "d MMM yyyy")}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 border-t pt-4 flex justify-end">
                            <Link href={`/channels/${event.id}`} className="text-sm font-medium text-teal-600 hover:text-teal-800">
                                View Details &rarr;
                            </Link>
                        </div>
                    </div>
                ))}

                {events.length === 0 && (
                    <div className="col-span-full py-16 text-center rounded-xl bg-slate-50/50">
                        <Calendar className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-2 text-sm font-semibold text-slate-900">No events</h3>
                        <p className="mt-1 text-sm text-slate-500">เริ่มสร้าง Event แรกของคุณได้เลย</p>
                    </div>
                )}
            </div>
        </div>
    );
}
