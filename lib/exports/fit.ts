/**
 * Minimal FIT workout-file encoder.
 *
 * Produces a valid FIT file containing:
 *   - file_id (type = workout)
 *   - workout (sport, wkt_name, num_valid_steps)
 *   - one workout_step per flattened step
 *
 * Accepted by Garmin Connect and TrainingPeaks' workout importer.
 * Not a full FIT SDK; deliberately kept small + dependency-free.
 */

import { flattenSteps, type AthleteCtx, type ExportWorkout } from "./types";
import type { WorkoutStep } from "@/lib/ai/schemas";

const FIT_EPOCH = 631065600; // 1989-12-31 00:00:00 UTC

// ----- small byte-writer helper -----
function makeWriter() {
  let parts: Uint8Array[] = [];
  let size = 0;
  return {
    u8(v: number) {
      const b = new Uint8Array(1);
      b[0] = v & 0xff;
      parts.push(b);
      size += 1;
    },
    u16(v: number) {
      const b = new Uint8Array(2);
      new DataView(b.buffer).setUint16(0, v & 0xffff, true);
      parts.push(b);
      size += 2;
    },
    u32(v: number) {
      const b = new Uint8Array(4);
      new DataView(b.buffer).setUint32(0, v >>> 0, true);
      parts.push(b);
      size += 4;
    },
    i32(v: number) {
      const b = new Uint8Array(4);
      new DataView(b.buffer).setInt32(0, v | 0, true);
      parts.push(b);
      size += 4;
    },
    str(s: string, fixedLen: number) {
      const b = new Uint8Array(fixedLen);
      const enc = new TextEncoder().encode(s);
      b.set(enc.slice(0, fixedLen - 1));
      parts.push(b);
      size += fixedLen;
    },
    raw(arr: Uint8Array) {
      parts.push(arr);
      size += arr.byteLength;
    },
    length() {
      return size;
    },
    bytes() {
      const out = new Uint8Array(size);
      let off = 0;
      for (const p of parts) {
        out.set(p, off);
        off += p.byteLength;
      }
      return out;
    },
  };
}

// CRC used by FIT (polynomial per SDK)
const CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401, 0xa001, 0x6c00, 0x7800, 0xb401,
  0x5000, 0x9c01, 0x8801, 0x4400,
];

function crc16(data: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    const b = data[i];
    let tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[b & 0xf];
    tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[(b >> 4) & 0xf];
  }
  return crc & 0xffff;
}

// ----- FIT field types -----
const BASE = {
  enum: 0x00,
  uint8: 0x02,
  uint16: 0x84,
  uint32: 0x86,
  sint32: 0x85,
  string: 0x07,
};

// ----- message numbers -----
const MSG = {
  file_id: 0,
  workout: 26,
  workout_step: 27,
};

// workout_step field defs we use
const WS_FIELDS = {
  message_index: { num: 254, type: BASE.uint16, size: 2 },
  wkt_step_name: { num: 0, type: BASE.string, size: 16 },
  duration_type: { num: 1, type: BASE.enum, size: 1 },
  duration_value: { num: 2, type: BASE.uint32, size: 4 },
  target_type: { num: 3, type: BASE.enum, size: 1 },
  target_value: { num: 4, type: BASE.uint32, size: 4 },
  custom_target_value_low: { num: 5, type: BASE.uint32, size: 4 },
  custom_target_value_high: { num: 6, type: BASE.uint32, size: 4 },
  intensity: { num: 7, type: BASE.enum, size: 1 },
  notes: { num: 8, type: BASE.string, size: 40 },
};

// workout fields we use
const WKT_FIELDS = {
  wkt_name: { num: 8, type: BASE.string, size: 16 },
  sport: { num: 4, type: BASE.enum, size: 1 },
  num_valid_steps: { num: 6, type: BASE.uint16, size: 2 },
};

// file_id fields
const FID_FIELDS = {
  type: { num: 0, type: BASE.enum, size: 1 },
  manufacturer: { num: 1, type: BASE.uint16, size: 2 },
  product: { num: 2, type: BASE.uint16, size: 2 },
  serial_number: { num: 3, type: BASE.uint32, size: 4 },
  time_created: { num: 4, type: BASE.uint32, size: 4 },
};

const SPORT_ENUM: Record<string, number> = {
  RUN: 1,
  BIKE: 2,
  SWIM: 5,
  TRI: 3,
  DUATHLON: 3,
  ULTRA: 1,
  STRENGTH: 10,
  MOBILITY: 10,
  CUSTOM: 0,
};

// Intensity enum: 0 active, 1 rest, 2 warmup, 3 cooldown, 4 recovery
const INTENSITY: Record<string, number> = {
  warmup: 2,
  cooldown: 3,
  recovery: 4,
  interval: 0,
  main: 0,
  repeat: 0,
};

// duration_type: 0 time, 1 distance, 2 hr_less_than, 5 open
// target_type: 0 speed, 1 heart_rate, 2 open, 4 power, 6 power_lap
const DUR = { time: 0, distance: 1, open: 5 };
const TGT = { speed: 0, hr: 1, open: 2, power: 4 };

type FieldDef = { num: number; type: number; size: number };

function writeDefinition(
  w: ReturnType<typeof makeWriter>,
  localMsg: number,
  globalMsg: number,
  fields: FieldDef[]
) {
  w.u8(0x40 | localMsg); // definition message header
  w.u8(0); // reserved
  w.u8(0); // little endian
  w.u16(globalMsg);
  w.u8(fields.length);
  for (const f of fields) {
    w.u8(f.num);
    w.u8(f.size);
    w.u8(f.type);
  }
}

function writeStrField(w: ReturnType<typeof makeWriter>, s: string, size: number) {
  w.str(s, size);
}

function targetToFit(
  target: WorkoutStep["target"] | undefined,
  ctx: AthleteCtx
): { targetType: number; value: number; low: number; high: number } {
  // FIT target values encoded with an offset for custom ranges:
  //  power: add 1000 to watts; 0 means use target_value as zone (1-8)
  //  hr: add 100 to bpm; 0 means use target_value as zone (1-5)
  //  speed: m/s * 1000 (mm/s); 0 means target_value as zone
  //  open: both 0
  if (!target) return { targetType: TGT.open, value: 0, low: 0, high: 0 };
  if (target.type === "percent_ftp" && ctx.ftpWatts) {
    const low = Math.round(((target.low ?? target.value ?? 65) / 100) * ctx.ftpWatts) + 1000;
    const high = Math.round(((target.high ?? target.value ?? 75) / 100) * ctx.ftpWatts) + 1000;
    return { targetType: TGT.power, value: 0, low, high };
  }
  if (target.type === "watts") {
    const low = Math.round(target.low ?? target.value ?? 150) + 1000;
    const high = Math.round(target.high ?? target.value ?? 170) + 1000;
    return { targetType: TGT.power, value: 0, low, high };
  }
  if (target.type === "bpm") {
    const low = Math.round(target.low ?? target.value ?? 140) + 100;
    const high = Math.round(target.high ?? target.value ?? 150) + 100;
    return { targetType: TGT.hr, value: 0, low, high };
  }
  if (target.type === "percent_lthr" && ctx.lthrBpm) {
    const low = Math.round(((target.low ?? target.value ?? 80) / 100) * ctx.lthrBpm) + 100;
    const high = Math.round(((target.high ?? target.value ?? 85) / 100) * ctx.lthrBpm) + 100;
    return { targetType: TGT.hr, value: 0, low, high };
  }
  if (target.type === "hr_zone") {
    const zone = Math.max(1, Math.min(5, Math.round(target.value ?? target.low ?? 2)));
    return { targetType: TGT.hr, value: zone, low: 0, high: 0 };
  }
  if (target.type === "pace_per_km" && ctx.thresholdRunPaceSecPerKm) {
    const lowSec = target.low ?? target.value ?? ctx.thresholdRunPaceSecPerKm * 1.1;
    const highSec = target.high ?? target.value ?? ctx.thresholdRunPaceSecPerKm * 0.95;
    const lowMs = Math.round((1000 / lowSec) * 1000);
    const highMs = Math.round((1000 / highSec) * 1000);
    return { targetType: TGT.speed, value: 0, low: lowMs, high: highMs };
  }
  return { targetType: TGT.open, value: 0, low: 0, high: 0 };
}

export function workoutToFit(w: ExportWorkout, ctx: AthleteCtx): Uint8Array {
  const dataWriter = makeWriter();

  // file_id definition
  const fidFields: FieldDef[] = [
    FID_FIELDS.type,
    FID_FIELDS.manufacturer,
    FID_FIELDS.product,
    FID_FIELDS.serial_number,
    FID_FIELDS.time_created,
  ];
  writeDefinition(dataWriter, 0, MSG.file_id, fidFields);
  dataWriter.u8(0x00); // data message local 0
  dataWriter.u8(5); // type = workout
  dataWriter.u16(255); // manufacturer development
  dataWriter.u16(0); // product
  dataWriter.u32(1);
  const tc = Math.max(0, Math.floor(Date.now() / 1000) - FIT_EPOCH);
  dataWriter.u32(tc);

  // workout definition
  const wktFields: FieldDef[] = [WKT_FIELDS.wkt_name, WKT_FIELDS.sport, WKT_FIELDS.num_valid_steps];
  writeDefinition(dataWriter, 1, MSG.workout, wktFields);

  // workout data
  const steps = flattenSteps(w.steps).filter((s) => s.kind !== "repeat");
  dataWriter.u8(0x01);
  writeStrField(dataWriter, w.title.slice(0, 15), WKT_FIELDS.wkt_name.size);
  dataWriter.u8(SPORT_ENUM[w.sport] ?? 0);
  dataWriter.u16(Math.max(1, steps.length));

  // workout_step definition
  const wsFields: FieldDef[] = [
    WS_FIELDS.message_index,
    WS_FIELDS.wkt_step_name,
    WS_FIELDS.duration_type,
    WS_FIELDS.duration_value,
    WS_FIELDS.target_type,
    WS_FIELDS.target_value,
    WS_FIELDS.custom_target_value_low,
    WS_FIELDS.custom_target_value_high,
    WS_FIELDS.intensity,
    WS_FIELDS.notes,
  ];
  writeDefinition(dataWriter, 2, MSG.workout_step, wsFields);

  const effective = steps.length
    ? steps
    : ([
        {
          kind: "main",
          label: w.title,
          durationSeconds: w.durationSeconds,
        },
      ] as WorkoutStep[]);

  effective.forEach((s, i) => {
    dataWriter.u8(0x02);
    dataWriter.u16(i);
    writeStrField(dataWriter, (s.label ?? "").slice(0, 15), WS_FIELDS.wkt_step_name.size);

    if (s.durationSeconds) {
      dataWriter.u8(DUR.time);
      dataWriter.u32(Math.max(1, s.durationSeconds) * 1000); // ms
    } else if (s.distanceMeters) {
      dataWriter.u8(DUR.distance);
      dataWriter.u32(Math.max(1, s.distanceMeters) * 100); // cm
    } else {
      dataWriter.u8(DUR.open);
      dataWriter.u32(0);
    }

    const tgt = targetToFit(s.target, ctx);
    dataWriter.u8(tgt.targetType);
    dataWriter.u32(tgt.value);
    dataWriter.u32(tgt.low);
    dataWriter.u32(tgt.high);

    dataWriter.u8(INTENSITY[s.kind] ?? 0);
    writeStrField(dataWriter, (s.target?.note ?? "").slice(0, 39), WS_FIELDS.notes.size);
  });

  // body done; assemble header + CRC
  const body = dataWriter.bytes();

  const header = new Uint8Array(14);
  header[0] = 14; // header size
  header[1] = 0x10; // protocol version 1.0
  // profile version 21.x -> 2100 in little-endian
  new DataView(header.buffer).setUint16(2, 2100, true);
  new DataView(header.buffer).setUint32(4, body.length, true);
  header[8] = 0x2e; // '.'
  header[9] = 0x46; // 'F'
  header[10] = 0x49; // 'I'
  header[11] = 0x54; // 'T'
  const hdrCrc = crc16(header.slice(0, 12));
  new DataView(header.buffer).setUint16(12, hdrCrc, true);

  const full = new Uint8Array(header.length + body.length + 2);
  full.set(header, 0);
  full.set(body, header.length);
  const fileCrc = crc16(full.slice(0, header.length + body.length));
  new DataView(full.buffer).setUint16(header.length + body.length, fileCrc, true);

  return full;
}
