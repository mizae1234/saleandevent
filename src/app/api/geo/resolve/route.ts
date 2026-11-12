import { NextRequest, NextResponse } from "next/server";
import { parseGoogleMapsCoords } from "@/lib/geo";

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();
        if (!url || typeof url !== "string") {
            return NextResponse.json({ error: "กรุณาระบุลิงก์ Google Maps" }, { status: 400 });
        }

        // First try direct parsing
        const direct = parseGoogleMapsCoords(url);
        if (direct) {
            return NextResponse.json({ lat: direct.lat, lng: direct.lng });
        }

        // Extract URL if user pasted text + URL from mobile share sheet
        const urlMatch = url.match(/https?:\/\/[^\s]+/i);
        const targetUrl = urlMatch ? urlMatch[0] : url.trim();

        if (!/^https?:\/\//i.test(targetUrl)) {
            return NextResponse.json({ error: "รูปแบบลิงก์ไม่ถูกต้อง" }, { status: 400 });
        }

        // Follow redirect to get full Google Maps URL
        const response = await fetch(targetUrl, {
            method: "GET",
            redirect: "follow",
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
        });

        const finalUrl = response.url;
        const fromFinalUrl = parseGoogleMapsCoords(finalUrl);
        if (fromFinalUrl) {
            return NextResponse.json({ lat: fromFinalUrl.lat, lng: fromFinalUrl.lng, resolvedUrl: finalUrl });
        }

        // Also check response body for meta/canonical coordinates if needed
        const html = await response.text();
        const fromHtml =
            parseGoogleMapsCoords(html) ||
            (() => {
                const centerMatch = html.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/i);
                if (centerMatch) {
                    return { lat: parseFloat(centerMatch[1]), lng: parseFloat(centerMatch[2]) };
                }
                return null;
            })();

        if (fromHtml) {
            return NextResponse.json({ lat: fromHtml.lat, lng: fromHtml.lng });
        }

        return NextResponse.json(
            { error: "ไม่พบพิกัดในลิงก์นี้ กรุณาคัดลอกตัวเลขพิกัด เช่น 13.7563, 100.5018 มาวาง" },
            { status: 422 }
        );
    } catch (error) {
        console.error("Failed to resolve Google Maps short URL:", error);
        return NextResponse.json(
            { error: "ไม่สามารถดึงพิกัดจากลิงก์สั้นได้ กรุณาคัดลอกตัวเลขพิกัด หรือ URL เต็มมาวาง" },
            { status: 500 }
        );
    }
}

