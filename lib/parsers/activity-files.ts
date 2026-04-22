import type { Sport } from "@prisma/client";

export type ParsedActivity = {
  sport: Sport;
  startTime: Date;
  durationSeconds: number;
  distanceMeters?: number;
  elevationGainM?: number;
  name?: string;
};

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function parseGpx(xml: string): ParsedActivity {
  const typeMatch = xml.match(/<type>([^<]+)<\/type>/i);
  const sport = mapSport(typeMatch?.[1]);
  const points: { t: Date; lat: number; lon: number; ele: number }[] = [];
  const ptRegex =
    /<trkpt[^>]*lat="([-\d.]+)"[^>]*lon="([-\d.]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
  let m: RegExpExecArray | null;
  while ((m = ptRegex.exec(xml))) {
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    const inner = m[3];
    const tMatch = inner.match(/<time>([^<]+)<\/time>/i);
    const eMatch = inner.match(/<ele>([-\d.]+)<\/ele>/i);
    if (tMatch) {
      points.push({
        t: new Date(tMatch[1]),
        lat,
        lon,
        ele: eMatch ? parseFloat(eMatch[1]) : 0,
      });
    }
  }
  if (!points.length) {
    return { sport, startTime: new Date(), durationSeconds: 0 };
  }
  const startTime = points[0].t;
  const endTime = points[points.length - 1].t;
  let dist = 0;
  let elev = 0;
  for (let i = 1; i < points.length; i++) {
    dist += haversineMeters(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
    const dEle = points[i].ele - points[i - 1].ele;
    if (dEle > 0) elev += dEle;
  }
  const nameMatch = xml.match(/<name>([^<]+)<\/name>/i);
  return {
    sport,
    startTime,
    durationSeconds: Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 1000)),
    distanceMeters: Math.round(dist),
    elevationGainM: Math.round(elev),
    name: nameMatch?.[1],
  };
}

export function parseTcx(xml: string): ParsedActivity {
  const sportMatch = xml.match(/<Activity[^>]*Sport="([^"]+)"/i);
  const sport = mapSport(sportMatch?.[1]);
  const startMatch = xml.match(/<Id>([^<]+)<\/Id>/i);
  const startTime = startMatch ? new Date(startMatch[1]) : new Date();
  const durationMatch = xml.match(/<TotalTimeSeconds>([-\d.]+)<\/TotalTimeSeconds>/gi);
  const distanceMatch = xml.match(/<DistanceMeters>([-\d.]+)<\/DistanceMeters>/gi);
  const sumTag = (list: RegExpMatchArray | null) =>
    list
      ? list
          .map((t) => parseFloat(t.replace(/<[^>]+>/g, "")))
          .reduce((a, b) => a + b, 0)
      : 0;
  const duration = durationMatch ? Math.round(sumTag(durationMatch)) : 0;
  const distance = distanceMatch ? Math.round(sumTag(distanceMatch) / distanceMatch.length) : undefined;
  return {
    sport,
    startTime,
    durationSeconds: duration,
    distanceMeters: distance,
  };
}

export function parseFitHeader(buf: Uint8Array): ParsedActivity {
  // Bare-minimum fallback: we can't decode every FIT record without the SDK,
  // but we can assume it's a recent activity and tell the user to confirm.
  return {
    sport: "CUSTOM",
    startTime: new Date(),
    durationSeconds: 0,
    name: `FIT upload (${buf.byteLength} bytes)`,
  };
}

function mapSport(raw: string | undefined): Sport {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("run")) return "RUN";
  if (v.includes("bik") || v.includes("ride") || v.includes("cycl")) return "BIKE";
  if (v.includes("swim")) return "SWIM";
  if (v.includes("tri")) return "TRI";
  if (v.includes("strength") || v.includes("weight")) return "STRENGTH";
  return "CUSTOM";
}
