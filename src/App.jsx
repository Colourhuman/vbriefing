import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutGrid,
  FileText,
  Map as MapIcon,
  GitFork,
  List,
  Languages,
  Upload,
  Bell,
  Grid3X3,
  Phone,
  MessageSquare,
  MapPin,
  Flag,
  ChevronDown,
  ChevronRight,
  X,
  CheckCircle2,
  Loader2,
  Copy,
  RefreshCw,
} from "lucide-react";

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "briefing", label: "Briefing", icon: FileText },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "clearances", label: "Clearances", icon: GitFork },
  { id: "navlog", label: "NavLog", icon: List },
];

const SIMBRIEF_STORAGE_KEY = "virtual-lido-simbrief-user";
const SIMBRIEF_OFP_STORAGE_KEY = "virtual-lido-simbrief-ofp-v3";
const SIMBRIEF_FUEL_ORDER_KEY = "virtual-lido-fuel-ordered-v3";

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Browser storage can be disabled; app still works without it.
  }
}

function getPath(object, path, fallback = "") {
  const parts = String(path).split(".");
  let value = object;
  for (const part of parts) {
    if (value == null) return fallback;
    value = value[part];
  }
  return value === undefined || value === null || value === "" ? fallback : value;
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "") ?? "";
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [value];
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatNumber(value, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

function formatDuration(value) {
  if (value === undefined || value === null || value === "") return "--:--";
  if (typeof value === "string" && /^\d{1,3}:\d{2}(?::\d{2})?$/.test(value.trim())) {
    const p = value.trim().split(":");
    return p.length === 3 ? `${p[0]}:${p[1]}` : value.trim();
  }
  const seconds = toNumber(value, NaN);
  if (!Number.isFinite(seconds)) return "--:--";
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatTime(value) {
  if (value === undefined || value === null || value === "") return "--:--";
  const raw = String(value).trim();

  if (/^\d{4}$/.test(raw)) return `${raw.slice(0, 2)}:${raw.slice(2, 4)}`;
  if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(raw)) return raw.slice(0, 5);

  const n = Number(value);
  if (Number.isFinite(n) && n > 0) {
    const d = new Date(n > 1e12 ? n : n * 1000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(11, 16);
  }

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(11, 16);
  return "--:--";
}

function parseCoordinate(value) {
  if (value === undefined || value === null || value === "") return null;
  const direct = Number(value);
  if (Number.isFinite(direct)) return direct;
  const raw = String(value).trim().toUpperCase();

  const dmLat = raw.match(/^([NS])(\d{2})(\d{2}(?:\.\d+)?)$/);
  if (dmLat) {
    const v = Number(dmLat[2]) + Number(dmLat[3]) / 60;
    return dmLat[1] === "S" ? -v : v;
  }

  const dmLon = raw.match(/^([EW])(\d{3})(\d{2}(?:\.\d+)?)$/);
  if (dmLon) {
    const v = Number(dmLon[2]) + Number(dmLon[3]) / 60;
    return dmLon[1] === "W" ? -v : v;
  }

  const decimalHemisphere = raw.match(/^([+-]?\d+(?:\.\d+)?)[, ]*([NS])$/);
  if (decimalHemisphere) {
    const v = Number(decimalHemisphere[1]);
    return decimalHemisphere[2] === "S" ? -Math.abs(v) : Math.abs(v);
  }

  return null;
}

function getLat(point) {
  return parseCoordinate(
    firstValue(point?.pos_lat, point?.lat, point?.latitude, point?.position?.lat, point?.coordinates?.lat)
  );
}

function getLon(point) {
  return parseCoordinate(
    firstValue(
      point?.pos_long,
      point?.pos_lon,
      point?.lon,
      point?.lng,
      point?.longitude,
      point?.position?.lon,
      point?.position?.long,
      point?.coordinates?.lon
    )
  );
}

function getIdent(point, fallback = "FIX") {
  return firstValue(point?.ident, point?.fix_ident, point?.name, point?.icao_code, point?.icao, fallback);
}

function airportFromOFP(point = {}) {
  return {
    icao: firstValue(point.icao_code, point.icao, point.ident, point.id),
    iata: firstValue(point.iata_code, point.iata),
    name: firstValue(point.icao_name, point.name, point.airport_name, "UNKNOWN AIRPORT"),
    runway: firstValue(point.plan_rwy, point.runway, point.rwy),
    lat: getLat(point),
    lon: getLon(point),
    elevation: firstValue(point.elevation, point.elev),
  };
}

function recursiveObjectValues(value) {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(recursiveObjectValues);
  return [value, ...Object.values(value).flatMap(recursiveObjectValues)];
}

function normalizeNavlog(ofp) {
  const raw = firstValue(ofp?.navlog?.fix, ofp?.navlog?.fixes, ofp?.navlog?.waypoint, ofp?.navlog?.waypoints, ofp?.navlog);

  const expand = (value) => {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    const hasFixFields = ["ident", "fix_ident", "name", "pos_lat", "pos_long", "lat", "lon", "latitude", "longitude"].some((key) => value[key] !== undefined);
    if (hasFixFields) return [value];
    const values = Object.values(value).filter((item) => item && typeof item === "object");
    return values.length ? values.flatMap(expand) : [value];
  };

  return expand(raw)
    .filter((fix) => fix && typeof fix === "object")
    .map((fix, index) => ({
      ...fix,
      ident: getIdent(fix, `FIX${index + 1}`),
      lat: getLat(fix),
      lon: getLon(fix),
    }))
    .filter((fix) => fix.ident || Number.isFinite(fix.lat) || Number.isFinite(fix.lon));
}

function collectAlternateObjects(ofp) {
  const result = [];
  const seen = new Set();

  const add = (candidate, role = "Alternate") => {
    if (!candidate || typeof candidate !== "object") return;
    const apt = airportFromOFP(candidate);
    if (!apt.icao) return;
    const icao = String(apt.icao).toUpperCase();
    const origin = String(firstValue(ofp?.origin?.icao_code, ofp?.origin?.icao, ofp?.orig) || "").toUpperCase();
    const destination = String(firstValue(ofp?.destination?.icao_code, ofp?.destination?.icao, ofp?.dest) || "").toUpperCase();
    if (icao === origin || icao === destination) return;
    if (seen.has(icao)) return;
    seen.add(icao);
    result.push({ ...apt, icao, role, altRole: role, metar: firstValue(candidate.metar, candidate.notam_metar, candidate.altn_metar, ""), taf: firstValue(candidate.taf, candidate.altn_taf, "") });
  };

  const directCandidates = [
    ofp?.alternate,
    ofp?.alternates,
    ofp?.altn,
    ofp?.alternate_airports,
    ofp?.alternate_airport,
  ];

  directCandidates.forEach((value) => {
    toArray(value).forEach((item) => {
      if (typeof item === "string" && /^[A-Z]{4}$/i.test(item.trim())) add({ icao_code: item.trim().toUpperCase(), name: item.trim().toUpperCase() });
      else add(item);
    });
  });

  const keys = Object.keys(ofp || {});
  keys
    .filter((key) => /^(altn_\d+|alternate_?\d+|altn\d+)/i.test(key))
    .forEach((key) => {
      const value = ofp[key];
      if (value && typeof value === "object") add(value);
      if (typeof value === "string" && /^[A-Z]{4}$/i.test(value.trim())) {
        add({ icao_code: value.trim().toUpperCase(), name: value.trim().toUpperCase() });
      }
    });

  for (let i = 1; i <= 4; i += 1) {
    const id = firstValue(ofp?.[`altn_${i}_id`], ofp?.[`alternate_${i}_id`], ofp?.[`altn${i}`]);
    if (id) add({ icao_code: id, name: id, plan_rwy: firstValue(ofp?.[`altn_${i}_rwy`], "") });
  }

  // JSON v2 can carry alternate data nested inside the OFP. Walk every object and
  // also detect canonical altn_1_id .. altn_4_id fields wherever they occur.
  recursiveObjectValues(ofp).forEach((node) => {
    if (!node || typeof node !== "object") return;
    const keysInNode = Object.keys(node).join(" ").toLowerCase();
    if (keysInNode.includes("altn") || keysInNode.includes("alternate")) {
      const icao = firstValue(node.icao_code, node.icao, node.ident, node.id, node.airport);
      if (icao && /^[A-Z]{4}$/i.test(String(icao))) add(node);
    }
    for (let i = 1; i <= 4; i += 1) {
      const id = firstValue(node[`altn_${i}_id`], node[`alternate_${i}_id`], node[`altn${i}`]);
      if (id && /^[A-Z]{4}$/i.test(String(id))) {
        add({
          icao_code: String(id).trim().toUpperCase(),
          iata_code: firstValue(node[`altn_${i}_iata`], ""),
          name: firstValue(node[`altn_${i}_name`], String(id).trim().toUpperCase()),
          plan_rwy: firstValue(node[`altn_${i}_rwy`], ""),
          pos_lat: firstValue(node[`altn_${i}_lat`], ""),
          pos_long: firstValue(node[`altn_${i}_lon`], ""),
        });
      }
    }
  });

  return result;
}

function normalizeNotams(ofp) {
  const texts = [];
  const seen = new Set();

  const addText = (value) => {
    if (value === undefined || value === null) return;
    const text = String(value).replace(/\s+/g, " ").trim();
    if (!text || text.length < 4 || seen.has(text)) return;
    seen.add(text);
    texts.push(text);
  };

  recursiveObjectValues(ofp?.notams || ofp?.notam || ofp)
    .filter((node) => node && typeof node === "object")
    .forEach((node) => {
      const keys = Object.keys(node).join(" ").toLowerCase();
      if (!keys.includes("notam")) return;
      addText(firstValue(node.notam_text, node.notam_report, node.text, node.body, node.raw, node.message, node.notam));
    });

  // Some payloads expose a flat array under notams/notam.
  [...toArray(ofp?.notams), ...toArray(ofp?.notam)].forEach((item) => {
    if (typeof item === "string") addText(item);
    else if (item && typeof item === "object") {
      addText(firstValue(item.notam_text, item.notam_report, item.text, item.body, item.raw, item.message));
    }
  });

  return texts;
}

function rootOrNested(ofp, nested, keys) {
  const values = [];
  keys.forEach((key) => values.push(nested?.[key], ofp?.[key]));
  return firstValue(...values);
}

function normalizeSimBriefOFP(ofp) {
  const origin = airportFromOFP(ofp?.origin || {});
  const destination = airportFromOFP(ofp?.destination || {});
  const alternates = collectAlternateObjects(ofp);
  const aircraft = ofp?.aircraft || {};
  const general = ofp?.general || {};
  const atc = ofp?.atc || {};
  const fuel = ofp?.fuel || {};
  const weights = ofp?.weights || {};
  const times = ofp?.times || {};
  const weather = ofp?.weather || {};
  const params = ofp?.params || {};
  const navlog = normalizeNavlog(ofp);
  const units = firstValue(params.units, ofp?.units, "kgs");

  const flightNumber = firstValue(
    general.flight_number,
    general.flightnumber,
    ofp?.flight_number,
    ofp?.fltnum,
    atc.flight_number
  );
  const airline = firstValue(general.icao_airline, general.airline, ofp?.icao_airline, ofp?.airline);
  const callsign = firstValue(
    atc.callsign,
    general.callsign,
    ofp?.callsign,
    airline && flightNumber ? `${airline}${flightNumber}` : ""
  );

  const route = firstValue(
    atc.route,
    atc.flightplan_route,
    general.route,
    ofp?.route,
    ofp?.route_navigraph,
    ofp?.route_ifps
  );

  const cruiseAltitude = firstValue(
    general.initial_altitude,
    general.cruise_altitude,
    general.initial_fl,
    atc.initial_alt,
    ofp?.cruise_altitude,
    ofp?.altitude,
    ofp?.fl
  );

  const tripSeconds = firstValue(
    times.est_time_enroute,
    times.sched_time_enroute,
    times.time_enroute,
    ofp?.est_time_enroute,
    ofp?.sched_time_enroute,
    ofp?.time_enroute
  );

  const weatherValue = (keys) => firstValue(...keys.flatMap((key) => [weather?.[key], ofp?.[key]]));

  return {
    raw: ofp,
    params,
    general,
    atc,
    aircraft,
    fuel,
    weights,
    times,
    weather,
    navlog,
    notams: normalizeNotams(ofp),
    origin,
    destination,
    alternate: alternates[0] || null,
    alternates,
    flightNumber,
    airline,
    callsign,
    aircraftIcao: firstValue(aircraft.icaocode, aircraft.icao_code, ofp?.type),
    aircraftName: firstValue(aircraft.name, aircraft.type, ofp?.aircraft?.aircraft_name),
    registration: firstValue(aircraft.reg, aircraft.registration, ofp?.reg),
    fin: firstValue(aircraft.fin, ofp?.fin),
    route,
    cruiseAltitude,
    costIndex: firstValue(general.costindex, general.cost_index, ofp?.costindex, ofp?.cost_index, ""),
    cruiseProfile: firstValue(general.cruise_profile, ofp?.cruise_profile),
    fuelUnits: units,
    tripFuel: firstValue(fuel.enroute_burn, fuel.total_burn, ofp?.enroute_burn),
    alternateFuel: firstValue(fuel.alternate_burn, fuel.altn_burn, ofp?.alternate_burn),
    reserveFuel: firstValue(fuel.reserve, ofp?.reserve),
    taxiFuel: firstValue(fuel.taxi, fuel.taxi_out, ofp?.taxi),
    contingencyFuel: firstValue(fuel.contingency, fuel.cont, ofp?.contingency),
    etopsFuel: firstValue(fuel.etops, ofp?.etopsfuel),
    extraFuel: firstValue(fuel.extra, ofp?.extra),
    minTakeoffFuel: firstValue(fuel.min_takeoff, ofp?.min_takeoff),
    takeoffFuel: firstValue(fuel.plan_takeoff, fuel.takeoff, ofp?.plan_takeoff, ofp?.plan_fob),
    rampFuel: firstValue(fuel.plan_ramp, fuel.ramp, ofp?.plan_ramp, ofp?.ramp_fuel),
    landingFuel: firstValue(fuel.plan_landing, fuel.landing, ofp?.plan_landing),
    zfw: firstValue(weights.est_zfw, weights.plan_zfw, ofp?.est_zfw),
    tow: firstValue(weights.est_tow, weights.plan_tow, ofp?.est_tow),
    ldw: firstValue(weights.est_ldw, weights.plan_ldw, ofp?.est_ldw),
    maxZfw: firstValue(weights.max_zfw, ofp?.max_zfw),
    maxTow: firstValue(weights.max_tow, weights.max_tow_struct, ofp?.max_tow),
    maxLdw: firstValue(weights.max_ldw, ofp?.max_ldw),
    payload: firstValue(weights.payload, ofp?.payload),
    pax: firstValue(weights.pax_count, weights.pax_count_actual, ofp?.pax_count, ofp?.pax),
    oew: firstValue(weights.oew, ofp?.oew),
    dow: firstValue(weights.dow, weights.est_dow, ofp?.dow),
    scheduledOut: firstValue(times.sched_out, ofp?.sched_out),
    estimatedOut: firstValue(times.est_out, ofp?.est_out),
    scheduledOff: firstValue(times.sched_off, ofp?.sched_off),
    estimatedOff: firstValue(times.est_off, ofp?.est_off),
    scheduledOn: firstValue(times.sched_on, ofp?.sched_on),
    estimatedOn: firstValue(times.est_on, ofp?.est_on),
    scheduledIn: firstValue(times.sched_in, ofp?.sched_in),
    estimatedIn: firstValue(times.est_in, ofp?.est_in),
    actualOut: firstValue(times.actual_out, ofp?.actual_out),
    actualOff: firstValue(times.actual_off, ofp?.actual_off),
    actualOn: firstValue(times.actual_on, ofp?.actual_on),
    actualIn: firstValue(times.actual_in, ofp?.actual_in),
    tripTime: formatDuration(tripSeconds),
    blockTime: formatDuration(firstValue(times.est_block, ofp?.est_block, times.sched_block, ofp?.sched_block)),
    originMetar: weatherValue(["orig_metar", "origin_metar"]),
    originTaf: weatherValue(["orig_taf", "origin_taf"]),
    destinationMetar: weatherValue(["dest_metar", "destination_metar"]),
    destinationTaf: weatherValue(["dest_taf", "destination_taf"]),
    alternateMetar: weatherValue(["altn_metar"]),
    alternateTaf: weatherValue(["altn_taf"]),
    pdcText: firstValue(atc.flightplan_text, ofp?.flightplan_text, getPath(ofp, "text.atc")),
    issued: firstValue(ofp?.issued, general.issued),
    airDistance: firstValue(general.air_distance, ofp?.air_distance),
    groundDistance: firstValue(general.gc_distance, general.route_distance, ofp?.gc_distance, ofp?.route_distance),
    avgWindDir: firstValue(general.avg_wind_dir, ofp?.avg_wind_dir),
    avgWindSpeed: firstValue(general.avg_wind_spd, ofp?.avg_wind_spd),
    avgWindComponent: firstValue(general.avg_wind_comp, ofp?.avg_wind_comp),
    avgFuelFlow: firstValue(general.avg_fuel_flow, ofp?.avg_fuel_flow),
  };
}

function fallbackFlight() {
  return {
    origin: { icao: "EDDL", iata: "DUS", name: "DUSSELDORF", runway: "23L", lat: 51.2895, lon: 6.7668 },
    destination: { icao: "EDDF", iata: "FRA", name: "FRANKFURT MAIN", runway: "25R", lat: 50.0379, lon: 8.5622 },
    alternates: [],
    alternate: null,
    flightNumber: "12S5",
    airline: "",
    callsign: "12S5",
    aircraftIcao: "A320",
    aircraftName: "Airbus A320",
    registration: "G-FENX",
    route: "N0378F230 COL6T COL T911 ROLIS ROLI5A",
    cruiseAltitude: "23000",
    costIndex: "30",
    fuelUnits: "kgs",
    tripFuel: "2500",
    alternateFuel: "700",
    reserveFuel: "1200",
    taxiFuel: "300",
    minTakeoffFuel: "5200",
    takeoffFuel: "5500",
    rampFuel: "5800",
    landingFuel: "3300",
    zfw: "58000",
    tow: "63500",
    ldw: "61200",
    maxZfw: "62500",
    maxTow: "73500",
    maxLdw: "64500",
    payload: "15000",
    pax: "160",
    oew: "43000",
    dow: "44500",
    scheduledOut: "",
    estimatedOut: "",
    scheduledOff: "",
    estimatedOff: "",
    scheduledOn: "",
    estimatedOn: "",
    scheduledIn: "",
    estimatedIn: "",
    tripTime: "01:18",
    blockTime: "01:30",
    originMetar: "",
    originTaf: "",
    destinationMetar: "",
    destinationTaf: "",
    alternateMetar: "",
    alternateTaf: "",
    pdcText: "",
    navlog: [],
    notams: [],
    airDistance: "",
    groundDistance: "",
  };
}

function getNavFixValue(fix, ...keys) {
  return firstValue(...keys.map((key) => fix?.[key]));
}

function fixWind(fix) {
  const dir = firstValue(fix?.wind_dir, fix?.wind_direction, fix?.wd, "");
  const speed = firstValue(fix?.wind_spd, fix?.wind_speed, fix?.ws, "");
  if (dir === "" && speed === "") return "-";
  return `${dir || "---"}/${speed || "--"}`;
}

function fixAltitude(fix) {
  const raw = firstValue(fix?.altitude_feet, fix?.altitude, fix?.flight_level, fix?.level);
  if (raw === "") return "-";
  const n = Number(raw);
  if (Number.isFinite(n)) {
    if (n >= 1000) return `FL${Math.round(n / 100)}`;
    return String(Math.round(n));
  }
  return String(raw).toUpperCase();
}

function fixTemperature(fix) {
  const value = firstValue(fix?.oat, fix?.temperature, fix?.temp, fix?.oat_temp);
  return value === "" ? "-" : `${value}°C`;
}

function airportCode(airport) {
  return String(firstValue(airport?.icao, airport?.iata, "")).toUpperCase();
}

function uniqueByCode(list) {
  const seen = new Set();
  return list.filter((item) => {
    const code = airportCode(item);
    if (!code || seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboardPage, setDashboardPage] = useState(0);
  const [weatherAirport, setWeatherAirport] = useState("origin");
  const [selectedAirportCode, setSelectedAirportCode] = useState("");
  const [mapSubTab, setMapSubTab] = useState("WX");
  const [simbriefData, setSimbriefData] = useState(() => {
    const raw = safeStorageGet(SIMBRIEF_OFP_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
  const [simbriefInput, setSimbriefInput] = useState(() => safeStorageGet(SIMBRIEF_STORAGE_KEY));
  const [showSimBriefModal, setShowSimBriefModal] = useState(false);
  const [simbriefLoading, setSimbriefLoading] = useState(false);
  const [simbriefError, setSimbriefError] = useState("");
  const [weatherLive, setWeatherLive] = useState({});
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [fuelOrdered, setFuelOrdered] = useState(() => safeStorageGet(SIMBRIEF_FUEL_ORDER_KEY) === "true");
  const [checklist, setChecklist] = useState({ status: false, fuel: false, navlog: false, journey: false });
  const [copiedClearance, setCopiedClearance] = useState(false);
  const [showRouteLabels, setShowRouteLabels] = useState(true);
  const touchStartX = useRef(null);

  const flight = simbriefData || fallbackFlight();

  const alternates = useMemo(() => uniqueByCode(flight.alternates || (flight.alternate ? [flight.alternate] : [])), [flight.alternates, flight.alternate]);
  const airportsForWeather = useMemo(
    () => [
      { id: "origin", label: airportCode(flight.origin), airport: flight.origin, metar: flight.originMetar, taf: flight.originTaf },
      { id: "destination", label: airportCode(flight.destination), airport: flight.destination, metar: flight.destinationMetar, taf: flight.destinationTaf },
      ...alternates.map((apt, index) => ({ id: `alternate-${index}`, label: airportCode(apt), airport: apt, metar: firstValue(apt.metar, index === 0 ? flight.alternateMetar : ""), taf: firstValue(apt.taf, index === 0 ? flight.alternateTaf : "") })),
    ],
    [flight, alternates]
  );

  const weatherSelection = airportsForWeather.find((entry) => entry.id === weatherAirport) || airportsForWeather[0];
  const importedOrigin = airportCode(flight.origin) || "----";
  const importedDestination = airportCode(flight.destination) || "----";
  const effectiveFlight = firstValue(flight.flightNumber, flight.callsign, "-");
  const effectiveRoute = firstValue(flight.route, "");
  const effectiveAircraft = firstValue(flight.aircraftIcao, flight.aircraftName, "-");
  const originIata = firstValue(flight.origin?.iata, importedOrigin);
  const destinationIata = firstValue(flight.destination?.iata, importedDestination);

  const navFixes = useMemo(() => (flight.navlog || []).map((fix, index) => ({
    ...fix,
    ident: getIdent(fix, `FIX${index + 1}`),
    lat: getLat(fix),
    lon: getLon(fix),
  })), [flight.navlog]);

  const mapAirports = useMemo(
    () => [
      { ...flight.origin, kind: "origin", color: "green", label: importedOrigin },
      { ...flight.destination, kind: "destination", color: "orange", label: importedDestination },
      ...alternates.map((apt) => ({ ...apt, kind: "alternate", color: "purple", label: airportCode(apt) })),
    ].filter((apt) => Number.isFinite(apt.lat) && Number.isFinite(apt.lon)),
    [flight.origin, flight.destination, alternates, importedOrigin, importedDestination]
  );

  const mapPoints = useMemo(() => {
    const route = navFixes.filter((fix) => Number.isFinite(fix.lat) && Number.isFinite(fix.lon));
    const airportPoints = mapAirports.filter((apt) => Number.isFinite(apt.lat) && Number.isFinite(apt.lon));
    return [...route, ...airportPoints];
  }, [navFixes, mapAirports]);

  useEffect(() => {
    if (!selectedAirportCode) setSelectedAirportCode(importedOrigin);
  }, [selectedAirportCode, importedOrigin]);

  useEffect(() => {
    if (!airportsForWeather.some((entry) => entry.id === weatherAirport)) setWeatherAirport("origin");
  }, [airportsForWeather, weatherAirport]);

  useEffect(() => {
    let cancelled = false;
    const missing = (flight.alternates || []).filter((apt) => airportCode(apt) && (!Number.isFinite(apt.lat) || !Number.isFinite(apt.lon)));
    if (!missing.length) return undefined;
    (async () => {
      const resolved = {};
      await Promise.all(missing.map(async (apt) => {
        try {
          const code = airportCode(apt);
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(code + " airport")}`, { headers: { Accept: "application/json" } });
          if (!response.ok) return;
          const data = await response.json();
          const item = data?.[0];
          const lat = Number(item?.lat);
          const lon = Number(item?.lon);
          if (Number.isFinite(lat) && Number.isFinite(lon)) resolved[code] = { lat, lon };
        } catch {
          // Keep the OFP data if geocoding is unavailable.
        }
      }));
      if (cancelled || !Object.keys(resolved).length) return;
      setSimbriefData((current) => {
        if (!current) return current;
        const nextAlternates = (current.alternates || []).map((apt) => resolved[airportCode(apt)] ? { ...apt, ...resolved[airportCode(apt)] } : apt);
        const next = { ...current, alternates: nextAlternates, alternate: nextAlternates[0] || current.alternate };
        safeStorageSet(SIMBRIEF_OFP_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [simbriefData?.alternates]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "ArrowLeft") setDashboardPage(0);
      if (event.key === "ArrowRight") setDashboardPage(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function importSimBrief() {
    const user = simbriefInput.trim();
    if (!user) {
      setSimbriefError("Bitte gib deinen SimBrief Username oder Pilot ID ein.");
      return;
    }

    setSimbriefLoading(true);
    setSimbriefError("");
    try {
      const param = /^\d+$/.test(user)
        ? `userid=${encodeURIComponent(user)}`
        : `username=${encodeURIComponent(user)}`;
      const response = await fetch(`https://www.simbrief.com/api/xml.fetcher.php?${param}&json=v2`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const text = await response.text();
      let payload = null;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error("SimBrief hat keine gültige JSON-v2-Antwort geliefert.");
      }

      if (!response.ok || payload?.error) {
        throw new Error(payload?.error?.message || payload?.message || `SimBrief HTTP ${response.status}`);
      }

      const normalized = normalizeSimBriefOFP(payload);
      normalized._importedAt = new Date().toISOString();
      normalized._simbriefUser = user;
      setSimbriefData(normalized);
      setSimbriefInput(user);
      setSelectedAirportCode(airportCode(normalized.origin));
      setWeatherAirport("origin");
      setFuelOrdered(false);
      safeStorageSet(SIMBRIEF_STORAGE_KEY, user);
      safeStorageSet(SIMBRIEF_OFP_STORAGE_KEY, JSON.stringify(normalized));
      safeStorageSet(SIMBRIEF_FUEL_ORDER_KEY, "false");
      setChecklist({ status: true, fuel: false, navlog: normalized.navlog?.length > 0, journey: false });
      setShowSimBriefModal(false);
      await refreshLiveWeather(normalized);
    } catch (error) {
      setSimbriefError(error?.message || "SimBrief OFP konnte nicht geladen werden.");
    } finally {
      setSimbriefLoading(false);
    }
  }

  async function refreshLiveWeather(plan = flight) {
    const airports = uniqueByCode([
      plan.origin,
      plan.destination,
      ...(plan.alternates || []),
    ]).filter((apt) => airportCode(apt));
    if (!airports.length) return;

    setWeatherLoading(true);
    try {
      const next = {};
      await Promise.all(airports.map(async (apt) => {
        const code = airportCode(apt);
        try {
          const [metarRes, tafRes] = await Promise.all([
            fetch(`https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(code)}`, { cache: "no-store" }),
            fetch(`https://aviationweather.gov/api/data/taf?ids=${encodeURIComponent(code)}`, { cache: "no-store" }),
          ]);
          next[code] = {
            metar: (await metarRes.text()).trim(),
            taf: (await tafRes.text()).trim(),
          };
        } catch {
          next[code] = { metar: "", taf: "" };
        }
      }));
      setWeatherLive(next);
    } finally {
      setWeatherLoading(false);
    }
  }

  function clearImportedPlan() {
    setSimbriefData(null);
    setFuelOrdered(false);
    setWeatherLive({});
    setChecklist({ status: false, fuel: false, navlog: false, journey: false });
    safeStorageSet(SIMBRIEF_OFP_STORAGE_KEY, "");
    safeStorageSet(SIMBRIEF_FUEL_ORDER_KEY, "false");
  }

  async function copyClearance() {
    const text = firstValue(
      flight.pdcText,
      `${effectiveFlight}, cleared ${importedOrigin} to ${importedDestination}, ${flight.route || "as filed"}, maintain ${flight.cruiseAltitude || "filed altitude"}.`
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopiedClearance(true);
      window.setTimeout(() => setCopiedClearance(false), 1600);
    } catch {
      setSimbriefError("Die Clearance konnte nicht kopiert werden.");
    }
  }

  function toggleChecklist(key) {
    setChecklist((current) => ({ ...current, [key]: !current[key] }));
  }

  function orderFuel() {
    setFuelOrdered(true);
    setChecklist((current) => ({ ...current, fuel: true }));
    safeStorageSet(SIMBRIEF_FUEL_ORDER_KEY, "true");
  }

  function handleTouchStart(event) {
    touchStartX.current = event.touches?.[0]?.clientX ?? null;
  }

  function handleTouchEnd(event) {
    if (touchStartX.current == null) return;
    const endX = event.changedTouches?.[0]?.clientX ?? touchStartX.current;
    const delta = touchStartX.current - endX;
    if (Math.abs(delta) > 60) setDashboardPage(delta > 0 ? 1 : 0);
    touchStartX.current = null;
  }

  const currentNav = navigationItems.find((item) => item.id === activeTab) || navigationItems[0];

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#E5E7EB] text-[#25282C]">
      <header className="relative z-50 flex h-[58px] min-h-[58px] items-center border-b border-[#C4C6C8] bg-[#D1D3D4]">
        <div className="flex h-full min-w-0 items-center overflow-hidden">
          <button className="flex h-full w-[50px] shrink-0 items-center justify-center border-r border-[#C4C6C8] text-gray-700 hover:bg-black/5">
            <X size={23} />
          </button>
          <div className="flex h-full items-center whitespace-nowrap text-[12px] font-semibold">
            <HeaderCell>{effectiveFlight}</HeaderCell>
            <HeaderCell>{flight.registration || "-"}</HeaderCell>
            <HeaderCell>{effectiveAircraft}</HeaderCell>
            <HeaderCell>{importedOrigin} ({formatTime(flight.estimatedOut || flight.scheduledOut)}) - {importedDestination} ({formatTime(flight.estimatedIn || flight.scheduledIn)})</HeaderCell>
            <HeaderCell>OFP 1/0/1</HeaderCell>
            <div className="px-2"><span className="rounded-[3px] bg-[#65C529] px-2 py-[3px] text-[10px] font-bold text-[#173D0B]">FINAL</span></div>
          </div>
        </div>
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[18px] font-semibold">{currentNav.label}</div>
        <div className="ml-auto flex h-full shrink-0 items-center">
          <button className="flex h-full w-12 items-center justify-center text-gray-700 hover:bg-black/5"><Languages size={22} strokeWidth={1.8} /></button>
          <button onClick={() => setShowSimBriefModal(true)} title="SimBrief" className="relative flex h-full w-12 items-center justify-center text-gray-700 hover:bg-black/5">
            <Upload size={22} strokeWidth={1.8} />
            {simbriefData && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#65C529]" />}
          </button>
          <button className="flex h-full w-12 items-center justify-center text-gray-700 hover:bg-black/5"><Bell size={22} strokeWidth={1.8} /></button>
          <button className="flex h-full w-12 items-center justify-center text-gray-700 hover:bg-black/5"><Grid3X3 size={22} strokeWidth={2} /></button>
        </div>
      </header>

      {showSimBriefModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-[520px] rounded-xl border border-[#D0D0D0] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-[19px] font-semibold">SimBrief Import</h2>
                <p className="mt-1 text-[12px] text-gray-500">Import your latest generated OFP.</p>
              </div>
              <button onClick={() => setShowSimBriefModal(false)} className="rounded-md p-2 hover:bg-gray-100"><X size={19} /></button>
            </div>
            <div className="space-y-4 p-5">
              <label className="block">
                <span className="mb-2 block text-[12px] font-semibold text-gray-600">SimBrief Username / Pilot ID</span>
                <input value={simbriefInput} onChange={(e) => setSimbriefInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && importSimBrief()} className="h-[46px] w-full rounded-md border border-gray-300 px-3 outline-none focus:border-[#526C9B]" placeholder="Username or Pilot ID" autoFocus />
              </label>
              {simbriefError && <div className="rounded-md bg-red-50 p-3 text-[12px] text-red-700">{simbriefError}</div>}
              {simbriefData && <div className="rounded-md bg-[#F3F5F7] p-3 text-[12px] text-gray-600">Imported: <strong>{airportCode(simbriefData.origin)} → {airportCode(simbriefData.destination)}</strong> · {simbriefData.flightNumber || simbriefData.callsign}</div>}
              <div className="flex gap-3">
                <button onClick={clearImportedPlan} disabled={!simbriefData || simbriefLoading} className="h-[46px] rounded-md border border-gray-300 bg-white px-4 font-semibold hover:bg-gray-50 disabled:opacity-50">Clear OFP</button>
                <button onClick={importSimBrief} disabled={simbriefLoading} className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-md bg-[#0B1E48] font-semibold text-white hover:bg-[#071330] disabled:opacity-60">
                  {simbriefLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                  {simbriefLoading ? "Importing..." : "Import Latest OFP"}
                </button>
              </div>
              <p className="text-[11px] leading-5 text-gray-500">SimBrief data is requested only when you press Import. Live METAR/TAF is refreshed from aviationweather.gov for the imported airports.</p>
            </div>
          </div>
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-hidden bg-[#E5E7EB]">
        {activeTab === "dashboard" && (
          <div className="relative h-full w-full" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div className={`${dashboardPage === 0 ? "block" : "hidden"} h-full overflow-y-auto p-3`}>
              <div className="grid min-h-full grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="flex flex-col gap-4">
                  <FlightInfoCard flight={flight} origin={importedOrigin} destination={importedDestination} effectiveFlight={effectiveFlight} aircraft={effectiveAircraft} />
                  <ChecklistCard checklist={checklist} onToggle={toggleChecklist} fuelOrdered={fuelOrdered} navlogLoaded={navFixes.length > 0} />
                </div>
                <section className="rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3">
                  <h2 className="text-center text-[19px] font-semibold">Route</h2>
                  <div className="mt-2 overflow-hidden rounded-md bg-white">
                    <div className="h-[360px]"><DynamicMap flight={flight} navFixes={navFixes} airports={mapAirports} compact showLabels={showRouteLabels} onToggleLabels={() => setShowRouteLabels((v) => !v)} /></div>
                    <div className="border-t border-gray-200 px-3 py-3"><p className="break-words text-[12px] leading-[1.5]">{importedOrigin} - {effectiveRoute || "NO ROUTE"} - {importedDestination}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <button onClick={() => setActiveTab("map")} className="h-[47px] rounded-md border border-gray-300 bg-[#F8F8F8] font-semibold hover:bg-gray-100">Go to Map</button>
                    <button className="h-[47px] rounded-md border border-gray-300 bg-[#F8F8F8] font-semibold hover:bg-gray-100">Open in mPilot</button>
                  </div>
                </section>
                <DashboardWeatherCard airports={airportsForWeather} selected={weatherAirport} onChange={setWeatherAirport} live={weatherLive} loading={weatherLoading} onRefresh={() => refreshLiveWeather(flight)} />
              </div>
            </div>

            <div className={`${dashboardPage === 1 ? "block" : "hidden"} h-full overflow-y-auto p-3`}>
              <div className="grid min-h-full grid-cols-1 gap-4 lg:grid-cols-3">
                <DashboardNotamCard flight={flight} airports={airportsForWeather} selected={weatherAirport} onChange={setWeatherAirport} live={weatherLive} loading={weatherLoading} />
                <div className="flex flex-col gap-4">
                  <FuelSummaryCard flight={flight} fuelOrdered={fuelOrdered} />
                  <DocumentsCard />
                </div>
                <ContactCard />
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-2 left-0 right-0 z-30 flex items-center justify-center gap-2">
              <button onClick={() => setDashboardPage(0)} className={`pointer-events-auto h-[9px] w-[9px] rounded-full ${dashboardPage === 0 ? "bg-[#6C7074]" : "bg-[#C7C9CB]"}`} />
              <button onClick={() => setDashboardPage(1)} className={`pointer-events-auto h-[9px] w-[9px] rounded-full ${dashboardPage === 1 ? "bg-[#6C7074]" : "bg-[#C7C9CB]"}`} />
            </div>
          </div>
        )}

        {activeTab === "briefing" && (
          <div className="h-full overflow-y-auto bg-[#E5E7EB] px-3 py-3">
            <div className="mx-auto max-w-[1100px] space-y-3 pb-4">
              <section className="overflow-hidden rounded-xl border border-[#D5D5D5] bg-white">
                <div className="flex h-[50px] items-center justify-center bg-[#EEEEEE] text-[20px] font-semibold">{importedOrigin}/{originIata} <span className="mx-3 text-gray-400">···</span><span className="text-gray-500">✈</span><span className="mx-3 text-gray-400">···</span>{importedDestination}/{destinationIata}</div>
                <div className="grid grid-cols-2 gap-y-5 px-5 py-6 sm:grid-cols-5">
                  <BriefingValue label="ATC" value={effectiveFlight} />
                  <BriefingValue label="STD" value={formatTime(flight.scheduledOut)} />
                  <BriefingValue label="STA" value={formatTime(flight.scheduledIn)} />
                  <BriefingValue label="A/C TYPE" value={effectiveAircraft} />
                  <BriefingValue label="REG NO" value={flight.registration || "-"} />
                </div>
              </section>

              <section className="rounded-xl border border-[#D5D5D5] bg-white px-5 py-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
                  <BriefingValue label="CRZ SYS" value={flight.costIndex ? `CI${flight.costIndex}` : firstValue(flight.cruiseProfile, "-")} />
                  <BriefingValue label="GND DIST" value={firstValue(flight.groundDistance, "-")} />
                  <BriefingValue label="AIR DIST" value={firstValue(flight.airDistance, "-")} />
                  <BriefingValue label="TOC WIND" value={flight.avgWindDir ? `${flight.avgWindDir}/${flight.avgWindSpeed || "-"}` : "-"} />
                  <BriefingValue label="AVG W/C" value={flight.avgWindComponent || "-"} />
                  <BriefingValue label="AVG FF" value={flight.avgFuelFlow ? `${formatNumber(flight.avgFuelFlow)} ${flight.fuelUnits}` : "-"} />
                  <BriefingValue label="CRZ ALT" value={formatAltitudeValue(flight.cruiseAltitude)} />
                  <BriefingValue label="ETD" value={formatTime(flight.estimatedOut)} />
                  <BriefingValue label="OFF-BLOCK" value={formatTime(flight.estimatedOut)} />
                  <BriefingValue label="TAKEOFF" value={formatTime(flight.estimatedOff)} />
                  <BriefingValue label="LANDING" value={formatTime(flight.estimatedOn)} />
                  <BriefingValue label="ON-BLOCK" value={formatTime(flight.estimatedIn)} />
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-[#D5D5D5] bg-white">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_1.1fr_1.1fr] bg-[#E9E9E9] px-5 py-3 text-[14px] font-semibold text-gray-600"><span>Weight (kg)</span><span>Planned</span><span>Actual</span><span>Operational Limit</span><span>Structural Limit</span></div>
                <div className="px-5 py-2">
                  <WeightRow name="DOW" planned={flight.dow || flight.oew} />
                  <WeightRow name="LOAD" planned={flight.payload} actual="" />
                  <WeightRow name="ZFW" planned={flight.zfw} structural={flight.maxZfw} />
                  <WeightRow name="TOW" planned={flight.tow} operational={flight.maxTow} structural={flight.maxTow} />
                  <WeightRow name="LW" planned={flight.ldw} operational={flight.maxLdw} structural={flight.maxLdw} />
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-[#D5D5D5] bg-white">
                <div className="flex items-center justify-between bg-[#E9E9E9] px-5 py-3"><h2 className="text-[17px] font-semibold">Fuel</h2><button onClick={() => { setFuelOrdered(false); setChecklist((c) => ({ ...c, fuel: false })); safeStorageSet(SIMBRIEF_FUEL_ORDER_KEY, "false"); }} className="rounded-md border border-gray-300 bg-[#F4F4F4] px-5 py-2 text-[13px] shadow-sm hover:bg-gray-100">Reset</button></div>
                <div className="px-5 py-2">
                  <FuelLine label="Taxi" time={flight.taxiFuel ? "--:--" : "-"} fuel={flight.taxiFuel} />
                  <FuelLine label="Trip" time={flight.tripTime} fuel={flight.tripFuel} />
                  <FuelLine label="MINCONT / Contingency" time={formatFuelTime(flight.contingencyFuel)} fuel={flight.contingencyFuel} />
                  <FuelLine label="Alternate" time={"--:--"} fuel={flight.alternateFuel} />
                  <FuelLine label="Final Reserve" time={"--:--"} fuel={flight.reserveFuel} />
                  <FuelLine label="ETOPS" time={"--:--"} fuel={flight.etopsFuel || 0} />
                  <FuelLine label="Extra" time={"--:--"} fuel={flight.extraFuel || 0} />
                  <div className="my-2 border-t border-gray-300" />
                  <FuelLine label="Takeoff Fuel" time={flight.tripTime !== "--:--" ? flight.blockTime : "--:--"} fuel={flight.takeoffFuel} bold />
                  <FuelLine label="Landing Fuel" time={flight.tripTime} fuel={flight.landingFuel} />
                  <div className="my-2 border-t border-gray-300" />
                  <div className="flex items-center justify-between py-3"><span className="text-[16px] font-semibold">Minimum Block Fuel</span><span className="text-[15px] font-semibold">{flight.minTakeoffFuel || flight.rampFuel || "-"}</span></div>
                </div>
                <div className="flex items-center gap-3 bg-[#5575A5] px-5 py-3 text-white"><span className="text-[16px] font-semibold">Block Fuel</span><div className="ml-auto flex items-center gap-3"><div className="flex h-[46px] items-center rounded-md bg-white px-4 text-gray-800"><span className="min-w-[100px] text-right text-[16px] font-semibold">{flight.rampFuel || flight.takeoffFuel || "-"}</span><span className="ml-3 text-[14px]">kg</span></div><button onClick={orderFuel} className="h-[46px] rounded-md bg-[#0B1E48] px-8 text-[16px] font-semibold text-white shadow-sm hover:bg-[#071330]">{fuelOrdered ? "Ordered" : "Order"}</button></div></div>
              </section>

              <section className="overflow-hidden rounded-xl border border-[#D5D5D5] bg-white">
                <div className="border-b border-gray-200 bg-[#E9E9E9] px-5 py-3 text-[16px] font-semibold">Alternates</div>
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {alternates.length ? alternates.map((apt, index) => <AlternateCard key={airportCode(apt) || index} airport={apt} index={index} weatherLive={weatherLive[airportCode(apt)]} />) : <div className="col-span-full py-6 text-center text-[13px] text-gray-500">No alternates in imported OFP</div>}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === "map" && (
          <div className="flex h-full w-full flex-col md:flex-row">
            <aside className="w-full shrink-0 overflow-y-auto border-b border-[#C4C6C8] bg-[#F4F4F4] md:w-[310px] md:border-b-0 md:border-r">
              <div className="border-b border-[#D0D0D0] px-4 py-3 text-[15px] font-semibold">Airports</div>
              <div className="divide-y divide-[#E0E0E0]">
                <MapAirportButton airport={flight.origin} code={importedOrigin} role="Departure" selected={selectedAirportCode === importedOrigin} onClick={() => setSelectedAirportCode(importedOrigin)} color="green" />
                <MapAirportButton airport={flight.destination} code={importedDestination} role="Arrival" selected={selectedAirportCode === importedDestination} onClick={() => setSelectedAirportCode(importedDestination)} color="orange" />
                {alternates.map((apt, index) => <MapAirportButton key={airportCode(apt) || index} airport={apt} code={airportCode(apt)} role={`Alternate ${index + 1}`} selected={selectedAirportCode === airportCode(apt)} onClick={() => setSelectedAirportCode(airportCode(apt))} color="purple" />)}
              </div>
              <div className="border-t border-[#D0D0D0]">
                <button className="flex w-full items-center justify-between px-4 py-3 font-semibold text-[14px] text-[#25282C] border-b border-[#E0E0E0]"><span>Route</span><ChevronDown size={18} className="text-gray-500" /></button>
                <div className="max-h-[260px] overflow-y-auto px-4 py-3">
                  {navFixes.length ? navFixes.map((fix, index) => <div key={`${fix.ident}-${index}`} className="flex items-center justify-between gap-3 py-1.5 text-[12px]"><span className="font-semibold">{fix.ident}</span><span className="text-gray-500">{fixAltitude(fix)}</span></div>) : <div className="text-[12px] text-gray-500">No detailed navlog in OFP</div>}
                </div>
              </div>
            </aside>
            <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <div className="relative min-h-0 flex-1"><DynamicMap flight={flight} navFixes={navFixes} airports={mapAirports} showLabels /></div>
              <div className="h-[280px] shrink-0 border-t border-[#C4C6C8] bg-[#F4F4F4] shadow-inner">
                <div className="flex h-9 items-end justify-between border-b border-[#D5D5D5] px-4">
                  <div className="flex gap-1"><button onClick={() => setMapSubTab("WX")} className={`px-5 py-2 text-[13px] font-semibold ${mapSubTab === "WX" ? "border-t-2 border-[#526C9B] bg-[#E0E0E0] text-gray-900" : "text-gray-500"}`}>WX</button><button onClick={() => setMapSubTab("NOTAM")} className={`px-5 py-2 text-[13px] font-semibold ${mapSubTab === "NOTAM" ? "border-t-2 border-[#526C9B] bg-[#E0E0E0] text-gray-900" : "text-gray-500"}`}>NOTAM</button></div>
                  <button onClick={() => refreshLiveWeather(flight)} className="mb-1 flex items-center gap-1 rounded border border-[#B0B0B0] bg-white px-3 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"><RefreshCw size={13} /> Refresh</button>
                </div>
                <div className="h-[242px] overflow-y-auto p-4">{selectedAirportCode ? <MapDetail airportCode={selectedAirportCode} flight={flight} alternates={alternates} tab={mapSubTab} weatherLive={weatherLive[selectedAirportCode]} loading={weatherLoading} /> : null}</div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "clearances" && (
          <div className="h-full overflow-y-auto bg-[#E5E7EB] p-3">
            <div className="mx-auto max-w-[1100px] space-y-3">
              <section className="overflow-hidden rounded-xl border border-[#D0D0D0] bg-white">
                <div className="flex items-center justify-between border-b border-[#D0D0D0] bg-[#F1F1F1] px-5 py-4"><div><h2 className="text-[19px] font-semibold">Clearances</h2><p className="mt-1 text-[12px] text-gray-500">{effectiveFlight} · {importedOrigin} → {importedDestination}</p></div><span className="rounded-full bg-[#69C92D] px-3 py-1 text-[11px] font-bold text-[#17500D]">READY</span></div>
                <div className="space-y-3 p-4"><div className="rounded-lg border border-gray-200 bg-[#F5F5F5] p-4 font-mono text-[13px] leading-7 whitespace-pre-wrap">{flight.pdcText || `${effectiveFlight}, cleared ${importedOrigin} to ${importedDestination}\nvia ${flight.route || "as filed"}\nMaintain ${formatAltitudeValue(flight.cruiseAltitude)}\nDeparture frequency —\nSquawk —`}</div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2"><InfoPanel title="Flight Data"><InfoRow label="Aircraft" value={effectiveAircraft} /><InfoRow label="Registration" value={flight.registration || "-"} /><InfoRow label="Cruise" value={formatAltitudeValue(flight.cruiseAltitude)} /><InfoRow label="Cost Index" value={flight.costIndex || "-"} /></InfoPanel><InfoPanel title="Route"><div className="break-words text-[13px] leading-6 text-gray-700">{effectiveRouteText(importedOrigin, flight.route, importedDestination)}</div></InfoPanel></div>
                  <div className="grid grid-cols-2 gap-3"><button onClick={copyClearance} className="flex h-[48px] items-center justify-center gap-2 rounded-md border border-gray-300 bg-white font-semibold hover:bg-gray-50"><Copy size={16} />{copiedClearance ? "Copied" : "Copy Clearance"}</button><button onClick={() => toggleChecklist("status")} className="h-[48px] rounded-md bg-[#0B1E48] font-semibold text-white hover:bg-[#10285C]">{checklist.status ? "Accepted" : "Accept Clearance"}</button></div>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === "navlog" && (
          <div className="h-full overflow-y-auto bg-[#E5E7EB] p-3">
            <div className="mx-auto max-w-[1400px] space-y-3">
              <section className="overflow-hidden rounded-xl border border-[#D0D0D0] bg-white">
                <div className="flex items-center justify-between border-b border-[#D0D0D0] bg-[#F1F1F1] px-5 py-4"><div><h2 className="text-[19px] font-semibold">Navigation Log</h2><p className="mt-1 text-[12px] text-gray-500">{effectiveFlight} · {importedOrigin} → {importedDestination} · {effectiveAircraft}</p></div><div className="text-right text-[12px] text-gray-500">{navFixes.length} fixes</div></div>
                <div className="overflow-x-auto"><table className="w-full min-w-[1350px] text-left text-[11px]"><thead className="bg-[#E9E9E9] text-[10px] font-semibold uppercase text-gray-600"><tr><th className="px-3 py-3">#</th><th className="px-3 py-3">Waypoint</th><th className="px-3 py-3">Stage</th><th className="px-3 py-3">Altitude</th><th className="px-3 py-3">IAS</th><th className="px-3 py-3">TAS</th><th className="px-3 py-3">Mach</th><th className="px-3 py-3">GS</th><th className="px-3 py-3">Wind</th><th className="px-3 py-3">W/C</th><th className="px-3 py-3">OAT</th><th className="px-3 py-3">Dist</th><th className="px-3 py-3">Leg Time</th><th className="px-3 py-3">Total Time</th><th className="px-3 py-3">Fuel Leg</th><th className="px-3 py-3">EFOB</th><th className="px-3 py-3">Airway</th></tr></thead><tbody className="divide-y divide-gray-200">{navFixes.length ? navFixes.map((fix, index) => <NavLogRow key={`${fix.ident}-${index}`} fix={fix} index={index} />) : <tr><td colSpan={17} className="px-5 py-12 text-center text-[13px] text-gray-500">No navigation fixes were returned by SimBrief. Re-import the latest OFP.</td></tr>}</tbody></table></div>
              </section>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4"><InfoPanel title="Route"><div className="break-words text-[12px] leading-6 text-gray-700">{effectiveRouteText(importedOrigin, flight.route, importedDestination)}</div></InfoPanel><InfoPanel title="Trip"><InfoRow label="Ground Distance" value={`${flight.groundDistance || "-"} NM`} /><InfoRow label="Air Distance" value={`${flight.airDistance || "-"} NM`} /><InfoRow label="Trip Time" value={flight.tripTime} /></InfoPanel><InfoPanel title="Times"><InfoRow label="Off-block" value={formatTime(flight.estimatedOut)} /><InfoRow label="Takeoff" value={formatTime(flight.estimatedOff)} /><InfoRow label="Landing" value={formatTime(flight.estimatedOn)} /><InfoRow label="On-block" value={formatTime(flight.estimatedIn)} /></InfoPanel><InfoPanel title="Fuel"><InfoRow label="Trip Fuel" value={flight.tripFuel || "-"} /><InfoRow label="Block Fuel" value={flight.rampFuel || flight.takeoffFuel || "-"} /><InfoRow label="Landing Fuel" value={flight.landingFuel || "-"} /></InfoPanel></div>
            </div>
          </div>
        )}
      </main>

      <nav className="z-40 flex h-[70px] min-h-[70px] border-t border-[#C4C6C8] bg-[#D1D3D4]">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-1 flex-col items-center justify-center gap-1 ${active ? "text-[#354C70]" : "text-[#777B7F]"}`}><Icon size={22} strokeWidth={active ? 2.2 : 1.7} /><span className={`text-[11px] ${active ? "font-semibold" : "font-normal"}`}>{item.label}</span></button>;
        })}
      </nav>
    </div>
  );
}

function HeaderCell({ children }) {
  return <div className="flex h-full items-center border-r border-[#C4C6C8] px-3">{children}</div>;
}

function FlightInfoCard({ flight, origin, destination, effectiveFlight, aircraft }) {
  return <section className="rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3"><div className="grid grid-cols-3 items-center"><span className="text-[13px] text-gray-500">{aircraft}</span><span className="text-center text-[20px] font-bold">{effectiveFlight}</span><span className="text-right text-[13px] text-gray-500">{flight.registration || "-"}</span></div><div className="mt-1 text-center"><span className="rounded-full bg-[#69C92D] px-4 py-1 text-[12px] font-bold text-[#17500D]">On time</span></div><div className="mt-1 text-center text-[13px]">({flight.blockTime || flight.tripTime})</div><div className="my-1 flex items-center justify-center gap-5"><span className="text-[30px] font-bold">{origin}</span><span className="text-[25px] text-gray-500">→</span><span className="text-[30px] font-bold">{destination}</span></div><div className="grid grid-cols-2 border-b border-gray-300 pb-2 text-center"><div className="border-r border-gray-300"><div className="text-[12px] text-gray-500">RWY {flight.origin?.runway || "—"}</div><div className="mt-1 text-[12px]">STD {formatTime(flight.scheduledOut)}</div></div><div><div className="text-[12px] text-gray-500">RWY {flight.destination?.runway || "—"}</div><div className="mt-1 text-[12px]">STA {formatTime(flight.scheduledIn)}</div></div></div><div className="grid grid-cols-2 py-2"><div className="border-r border-gray-300 px-2"><TimeRow label="STD" value={formatTime(flight.scheduledOut)} /><TimeRow label="ETD" value={formatTime(flight.estimatedOut)} /><TimeRow label="Off-block" value={formatTime(flight.estimatedOut)} /></div><div className="px-2"><TimeRow label="STA" value={formatTime(flight.scheduledIn)} /><TimeRow label="ETA" value={formatTime(flight.estimatedIn)} /><TimeRow label="On-block" value={formatTime(flight.estimatedIn)} /></div></div><div className="pb-1 text-center text-[12px] text-gray-500">{flight.estimatedOff ? `Takeoff ${formatTime(flight.estimatedOff)}` : "- CTOT"}</div><button className="mt-2 h-[51px] w-full rounded-md bg-[#0B1E48] text-[16px] font-semibold text-white">Accept Flight</button></section>;
}

function ChecklistCard({ checklist, onToggle, fuelOrdered, navlogLoaded }) {
  const rows = [{ key: "status", label: "Status:", value: checklist.status ? "Accepted" : "Final" }, { key: "fuel", label: "Fuel:", value: fuelOrdered ? "Ordered" : "Not ordered" }, { key: "navlog", label: "NavLog:", value: navlogLoaded ? "Loaded" : "Pending" }, { key: "journey", label: "Journey Log:", value: checklist.journey ? "Ready" : "Pending" }];
  return <section className="rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3"><h2 className="mb-3 text-center text-[19px] font-semibold">Flight Checklist</h2><div className="rounded-md bg-white px-3">{rows.map((row, index) => <button key={row.key} onClick={() => onToggle(row.key)} className={`flex min-h-[51px] w-full items-center gap-3 text-left ${index < rows.length - 1 ? "border-b border-gray-200" : ""}`}><span className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border-2 ${checklist[row.key] ? "border-[#65C529] bg-[#65C529] text-white" : "border-gray-300 bg-white"}`}>{checklist[row.key] && <CheckCircle2 size={14} />}</span><span className="text-[14px] text-gray-500">{row.label}</span><span className="ml-auto text-[14px] font-semibold">{row.value}</span></button>)}</div></section>;
}

function DynamicMap({ flight, navFixes, airports, compact = false, showLabels = true, onToggleLabels }) {
  return <SlippyRouteMap flight={flight} navFixes={navFixes} airports={airports} compact={compact} showLabels={showLabels} onToggleLabels={onToggleLabels} />;
}

function SlippyRouteMap({ flight, navFixes, airports, compact, showLabels, onToggleLabels }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const geoPoints = useMemo(() => {
    const fixes = (navFixes || []).filter((f) => Number.isFinite(f.lat) && Number.isFinite(f.lon));
    const apts = (airports || []).filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lon));
    const all = [...fixes, ...apts];
    if (all.length) return all;
    const origin = flight?.origin;
    const dest = flight?.destination;
    return [origin, dest].filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lon));
  }, [navFixes, airports, flight]);

  const view = useMemo(() => fitMapView(geoPoints, size.width, size.height), [geoPoints, size.width, size.height]);

  const tileList = useMemo(() => {
    if (!view || size.width === 0 || size.height === 0) return [];
    return makeTiles(view.zoom, view.bounds, size.width, size.height);
  }, [view, size.width, size.height]);

  const project = (lat, lon) => {
    if (!view) return null;
    const p = geoToWorld(lat, lon, view.zoom);
    return { x: p.x - view.topLeft.x, y: p.y - view.topLeft.y };
  };

  const routePoints = (navFixes || []).filter((fix) => Number.isFinite(fix.lat) && Number.isFinite(fix.lon)).map((fix) => project(fix.lat, fix.lon)).filter(Boolean);
  const fallbackRoute = [flight?.origin, flight?.destination].filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lon)).map((p) => project(p.lat, p.lon)).filter(Boolean);
  const path = (routePoints.length >= 2 ? routePoints : fallbackRoute).map((p, index) => `${index === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return <div ref={containerRef} className={`relative h-full w-full overflow-hidden bg-[#E9E9E5] ${compact ? "rounded-md" : ""}`}>
    {tileList.map((tile) => <img key={`${tile.x}-${tile.y}-${tile.z}`} src={tile.url} alt="" className="pointer-events-none absolute select-none" style={{ left: tile.left, top: tile.top, width: 256, height: 256 }} loading="eager" />)}
    <div className="absolute inset-0 bg-white/12" />
    {view && <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${Math.max(1, size.width)} ${Math.max(1, size.height)}`} preserveAspectRatio="none"><path d={path} fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" /><path d={path} fill="none" stroke="#1A1A1A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />{routePoints.map((p, index) => <circle key={`fix-${index}`} cx={p.x} cy={p.y} r="2.7" fill="#526C9B" />)}</svg>}
    {view && (airports || []).filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lon)).map((airport) => { const p = project(airport.lat, airport.lon); const fill = airport.color === "green" ? "#65C52D" : airport.color === "orange" ? "#F2A243" : "#8064A2"; return <div key={`${airport.kind}-${airport.label}`} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: p.x, top: p.y }}><div className="relative flex flex-col items-center"><MapPin size={34} fill={fill} color={fill} /><span className="-mt-2 rounded bg-white/90 px-1 py-0.5 text-[10px] font-bold shadow" style={{ color: fill }}>{airport.label}</span></div></div>; })}
    {showLabels && <div className="absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-[10px] text-gray-600 shadow">{navFixes?.length ? `${navFixes.length} fixes` : "Route overview"}</div>}
    {onToggleLabels && <button onClick={onToggleLabels} className="absolute right-2 top-2 rounded bg-white/90 px-2 py-1 text-[10px] font-semibold text-gray-600 shadow">Labels</button>}
    <div className="absolute bottom-1 right-1 rounded bg-white/85 px-1.5 py-0.5 text-[8px] text-gray-500">© OpenStreetMap contributors</div>
  </div>;
}

function fitMapView(points, width, height) {
  if (!points.length || !width || !height) return null;
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLon = Math.min(...lons);
  let maxLon = Math.max(...lons);
  if (Math.abs(maxLat - minLat) < 0.25) { minLat -= 0.12; maxLat += 0.12; }
  if (Math.abs(maxLon - minLon) < 0.4) { minLon -= 0.2; maxLon += 0.2; }
  const zoom = Math.max(2, Math.min(14, chooseZoom(minLat, maxLat, minLon, maxLon, width, height)));
  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;
  const center = geoToWorld(centerLat, centerLon, zoom);
  return { zoom, bounds: { minLat, maxLat, minLon, maxLon }, topLeft: { x: center.x - width / 2, y: center.y - height / 2 } };
}

function chooseZoom(minLat, maxLat, minLon, maxLon, width, height) {
  for (let z = 14; z >= 2; z -= 1) {
    const a = geoToWorld(maxLat, minLon, z);
    const b = geoToWorld(minLat, maxLon, z);
    const spanX = Math.abs(b.x - a.x) * 1.18;
    const spanY = Math.abs(b.y - a.y) * 1.18;
    if (spanX <= width && spanY <= height) return z;
  }
  return 2;
}

function geoToWorld(lat, lon, zoom) {
  const size = 256 * 2 ** zoom;
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const x = ((lon + 180) / 360) * size;
  const sin = Math.sin((clampedLat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size;
  return { x, y };
}

function makeTiles(zoom, bounds, width, height) {
  const nw = geoToWorld(bounds.maxLat, bounds.minLon, zoom);
  const se = geoToWorld(bounds.minLat, bounds.maxLon, zoom);
  const minX = Math.floor(nw.x / 256);
  const maxX = Math.floor(se.x / 256);
  const minY = Math.floor(nw.y / 256);
  const maxY = Math.floor(se.y / 256);
  const center = geoToWorld((bounds.minLat + bounds.maxLat) / 2, (bounds.minLon + bounds.maxLon) / 2, zoom);
  const topLeft = { x: center.x - width / 2, y: center.y - height / 2 };
  const tiles = [];
  const tileCount = 2 ** zoom;
  for (let y = Math.max(0, minY - 1); y <= Math.min(tileCount - 1, maxY + 1); y += 1) {
    for (let x = minX - 1; x <= maxX + 1; x += 1) {
      const wrappedX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push({ z: zoom, x: wrappedX, y, left: x * 256 - topLeft.x, top: y * 256 - topLeft.y, url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png` });
    }
  }
  return tiles;
}

function DashboardWeatherCard({ airports, selected, onChange, live, loading, onRefresh }) {
  const entry = airports.find((item) => item.id === selected) || airports[0];
  const code = airportCode(entry?.airport);
  const current = live?.[code];
  return <section className="rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3"><div className="flex items-center justify-between"><h2 className="text-center text-[19px] font-semibold">Weather</h2><button onClick={onRefresh} className="rounded p-1 text-gray-500 hover:bg-black/5"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button></div><DynamicAirportTabs airports={airports} selected={selected} onChange={onChange} /><WeatherPanel airport={entry?.airport} importedMetar={entry?.metar} importedTaf={entry?.taf} live={current} loading={loading} /></section>;
}

function DashboardNotamCard({ flight, airports, selected, onChange, live, loading }) {
  const entry = airports.find((item) => item.id === selected) || airports[0];
  const code = airportCode(entry?.airport);
  return <section className="flex h-full min-h-0 flex-col rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3"><h2 className="text-center text-[19px] font-semibold">NOTAM & Weather</h2><DynamicAirportTabs airports={airports} selected={selected} onChange={onChange} /><div className="mt-3 min-h-[220px] max-h-[300px] overflow-y-auto rounded-md bg-white">{flight.notams?.length ? flight.notams.map((notam, index) => <NotamItem key={`${index}-${notam.slice(0, 20)}`} text={notam} last={index === flight.notams.length - 1} />) : <div className="px-4 py-8 text-center text-[13px] text-gray-500">No NOTAMs were returned in this OFP.</div>}</div><div className="mt-3"><WeatherPanel airport={entry?.airport} importedMetar={entry?.metar} importedTaf={entry?.taf} live={live?.[code]} loading={loading} /></div><button className="mt-3 h-[50px] rounded-md border border-gray-300 bg-[#F8F8F8] font-semibold hover:bg-gray-100">View NOTAMs for All Airports</button></section>;
}

function DynamicAirportTabs({ airports, selected, onChange }) {
  return <div className="mt-3 flex gap-1 overflow-x-auto rounded-lg bg-[#D0D0D2] p-1">{airports.map((airport) => <button key={airport.id} onClick={() => onChange(airport.id)} className={`min-w-[98px] flex-1 whitespace-nowrap rounded-md px-3 py-2 text-[12px] font-semibold ${selected === airport.id ? "bg-white shadow-sm" : "text-gray-600"}`}>{airport.label}</button>)}</div>;
}

function WeatherPanel({ airport, importedMetar, importedTaf, live, loading }) {
  const code = airportCode(airport);
  const metar = firstValue(live?.metar, importedMetar, "No METAR available");
  const taf = firstValue(live?.taf, importedTaf, "No TAF available");
  return <div className="mt-3 overflow-hidden rounded-md bg-white"><div className="border-b border-gray-200 px-3 py-3"><div className="text-[16px] font-bold">{airport?.name || "UNKNOWN AIRPORT"}</div><div className="text-[12px] text-gray-500">{code}</div></div><div className="space-y-2 px-3 py-3"><WeatherRow label="Ceiling:" value="-" /><WeatherRow label="Visibility:" value={weatherVisibility(metar)} /><WeatherRow label="Wind:" value={weatherWind(metar)} /><WeatherRow label="Temperature:" value={weatherTemp(metar)} /></div><div className="border-t border-gray-200 px-3 py-3"><div className="mb-1 flex items-center justify-between text-[12px] text-gray-500"><span>METAR</span><span>{loading ? "updating..." : "current / OFP fallback"}</span></div><pre className="whitespace-pre-wrap font-mono text-[11px] leading-[1.5]">{metar}</pre></div><div className="border-t border-gray-200 px-3 py-3"><div className="mb-1 text-[12px] text-gray-500">TAF</div><pre className="whitespace-pre-wrap font-mono text-[11px] leading-[1.5]">{taf}</pre></div><button className="m-3 h-[45px] w-[calc(100%-24px)] rounded-md border border-gray-300 bg-[#F8F8F8] font-semibold hover:bg-gray-100">View Weather Charts</button></div>;
}

function FuelSummaryCard({ flight, fuelOrdered }) { return <section className="rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3"><h2 className="text-center text-[19px] font-semibold">Fuel</h2><div className="mt-3 overflow-hidden rounded-md bg-white"><div className="flex items-center justify-between bg-[#F5F5F5] px-3 py-3"><span className="text-[15px] text-gray-600">Planned Fuel (OFP):</span><strong className="text-[20px]">{flight.rampFuel || flight.takeoffFuel || "-"} kg</strong></div><div className="space-y-1 px-3 py-3"><FuelRow label="Trip Fuel:" value={`${flight.tripFuel || "-"} kg`} /><FuelRow label="Alternate:" value={`${flight.alternateFuel || "-"} kg`} /><FuelRow label="Reserve:" value={`${flight.reserveFuel || "-"} kg`} /><FuelRow label="Taxi:" value={`${flight.taxiFuel || "-"} kg`} /><FuelRow label="Landing:" value={`${flight.landingFuel || "-"} kg`} /></div></div><div className={`mt-3 rounded-md px-3 py-3 text-[13px] font-semibold ${fuelOrdered ? "bg-[#E6F6DA] text-[#17500D]" : "bg-white text-gray-600"}`}>{fuelOrdered ? "Fuel order: ORDERED" : "Fuel order: NOT ORDERED"}</div><button className="mt-3 h-[49px] w-full rounded-md border border-gray-300 bg-[#F8F8F8] font-semibold hover:bg-gray-100">Open Fuel</button></section>; }

function DocumentsCard() { return <section className="rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3"><h2 className="text-center text-[19px] font-semibold">Additional Documents</h2><div className="mt-3 overflow-hidden rounded-md bg-white"><DocumentRow title="Crew / Flight Documents" date="Imported from current OFP" /><DocumentRow title="MEL Restrictions" date="Operational documents" /><DocumentRow title="OFP / Flight Release" date="Current SimBrief release" last /></div><button className="mt-3 h-[49px] w-full rounded-md border border-gray-300 bg-[#F8F8F8] font-semibold hover:bg-gray-100">View All Documents</button></section>; }

function ContactCard() { return <section className="flex h-full flex-col rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3"><h2 className="text-center text-[19px] font-semibold">Contact Information</h2><div className="mt-3 flex flex-1 flex-col overflow-hidden rounded-md bg-white"><div className="bg-[#F5F5F5] px-3 py-3 text-[14px] font-semibold text-gray-500">CREW</div><div className="px-3 py-3"><div className="text-[13px] text-gray-600">Pilot in Command / Captain</div><div className="mt-1 text-[14px] font-semibold">{window?.navigator ? "Current User" : "Pilot"}</div></div><div className="bg-[#F5F5F5] px-3 py-3 text-[14px] font-semibold text-gray-500">DISPATCH</div><div className="flex items-center justify-between px-3 py-3"><div><div className="text-[14px] font-semibold">SimBrief</div><div className="text-[12px] text-gray-600">Latest OFP</div></div><div className="flex gap-2"><button className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#526C9B] text-white"><Phone size={18} /></button><button className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#526C9B] text-white"><MessageSquare size={18} /></button></div></div><div className="border-t border-gray-200 px-3 py-4 text-[13px] text-gray-600">Data shown here is based on the imported flight.</div></div></section>; }

function AlternateCard({ airport, index, weatherLive }) { return <div className="rounded-lg border border-gray-200 bg-[#F8F8F8] p-4"><div className="flex items-center justify-between"><div><div className="text-[16px] font-bold">{airportCode(airport)}</div><div className="text-[12px] text-gray-500">Alternate {index + 1}</div></div><span className="rounded-full bg-[#8064A2] px-2.5 py-1 text-[10px] font-bold text-white">ALTN</span></div><div className="mt-3 space-y-2"><InfoRow label="Runway" value={airport.runway || "-"} /><InfoRow label="METAR" value={weatherLive?.metar || "OFP / unavailable"} /><InfoRow label="TAF" value={weatherLive?.taf || "OFP / unavailable"} /></div></div>; }

function MapAirportButton({ airport, code, role, selected, onClick, color }) { const dot = color === "green" ? "bg-[#65C52D]" : color === "orange" ? "bg-[#F2A243]" : "bg-[#8064A2]"; return <button onClick={onClick} className={`flex w-full items-center gap-3 px-4 py-3 text-left ${selected ? "bg-[#7A8EA8] text-white" : "hover:bg-black/5"}`}><span className={`h-3 w-3 rounded-full ${dot}`} /><span className="min-w-0"><span className="block text-[14px] font-bold">{code || "----"}</span><span className={`block text-[11px] ${selected ? "text-gray-200" : "text-gray-500"}`}>{role} · {airport?.name || "Unknown"}</span></span></button>; }

function MapDetail({ airportCode: code, flight, alternates, tab, weatherLive }) {
  const all = [flight.origin, flight.destination, ...alternates];
  const airport = all.find((apt) => airportCode(apt) === code) || {};
  if (tab === "WX") {
    const importedMetar = firstValue(airport.metar, airportCode(airport) === airportCode(flight.origin) ? flight.originMetar : airportCode(airport) === airportCode(flight.destination) ? flight.destinationMetar : flight.alternateMetar);
    const importedTaf = firstValue(airport.taf, airportCode(airport) === airportCode(flight.origin) ? flight.originTaf : airportCode(airport) === airportCode(flight.destination) ? flight.destinationTaf : flight.alternateTaf);
    return <WeatherPanel airport={airport} importedMetar={importedMetar} importedTaf={importedTaf} live={weatherLive} />;
  }
  return <div className="space-y-2">{flight.notams?.length ? flight.notams.map((n, i) => <NotamItem key={i} text={n} last={i === flight.notams.length - 1} />) : <div className="py-8 text-center text-[13px] text-gray-500">No NOTAMs were returned in this OFP.</div>}</div>;
}

function NavLogRow({ fix, index }) { return <tr className="hover:bg-gray-50"><td className="px-3 py-3">{index + 1}</td><td className="px-3 py-3 font-semibold">{getIdent(fix, `FIX${index + 1}`)}</td><td className="px-3 py-3">{firstValue(fix.stage, fix.phase, "-")}</td><td className="px-3 py-3">{fixAltitude(fix)}</td><td className="px-3 py-3">{firstValue(fix.ind_airspeed, fix.ias, "-")}</td><td className="px-3 py-3">{firstValue(fix.true_airspeed, fix.tas, "-")}</td><td className="px-3 py-3">{firstValue(fix.mach, "-")}</td><td className="px-3 py-3">{firstValue(fix.groundspeed, fix.gs, "-")}</td><td className="px-3 py-3">{fixWind(fix)}</td><td className="px-3 py-3">{firstValue(fix.wind_component, fix.wc, "-")}</td><td className="px-3 py-3">{fixTemperature(fix)}</td><td className="px-3 py-3">{firstValue(fix.distance, "-")}</td><td className="px-3 py-3">{formatNavTime(firstValue(fix.time_leg, fix.leg_time, fix.ete))}</td><td className="px-3 py-3">{formatNavTime(firstValue(fix.time_total, fix.time, fix.total_time))}</td><td className="px-3 py-3">{firstValue(fix.fuel_leg, fix.fuel, fix.fob, "-")}</td><td className="px-3 py-3">{firstValue(fix.fuel_totalused, fix.fuel_plan_onboard, fix.efob, fix.fob, "-")}</td><td className="px-3 py-3">{firstValue(fix.via_airway, fix.airway, "-")}</td></tr>; }

function BriefingValue({ label, value }) { return <div className="min-w-0"><div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</div><div className="truncate text-[17px] font-medium text-[#25282C]">{value}</div></div>; }
function WeightRow({ name, planned, actual, operational, structural }) { return <div className="grid min-h-[56px] grid-cols-[1.2fr_1fr_1fr_1.1fr_1.1fr] items-center"><span className="text-[15px] font-medium">{name}</span><span className="text-[16px] font-medium">{planned || "-"}</span><span className="text-[16px]">{actual || "-"}</span><span className="text-[16px] text-center">{operational || "-"}</span><span className="text-right text-[16px] font-medium">{structural || "-"}</span></div>; }
function FuelLine({ label, time, fuel, bold = false }) { return <div className="grid grid-cols-[1fr_180px_100px] items-center py-2.5"><span className={`text-[14px] ${bold ? "font-semibold" : ""}`}>{label}</span><span className={`text-right text-[14px] ${bold ? "font-semibold" : ""}`}>{time}</span><span className={`text-right text-[14px] ${bold ? "font-semibold" : ""}`}>{fuel || "-"}</span></div>; }
function FuelRow({ label, value }) { return <div className="flex items-center justify-between"><span className="text-[13px] text-gray-600">{label}</span><span className="text-[13px] font-semibold">{value}</span></div>; }
function TimeRow({ label, value }) { return <div className="flex justify-between py-[2px]"><span className="text-[12px] text-gray-500">{label}</span><span className="text-[13px] font-semibold">{value}</span></div>; }
function WeatherRow({ label, value }) { return <div className="flex justify-between"><span className="text-[13px] text-gray-500">{label}</span><span className="max-w-[70%] truncate text-right text-[13px] font-semibold">{value}</span></div>; }
function NotamItem({ text, last }) { return <div className={`relative px-3 py-3 text-[12px] leading-[1.55] ${!last ? "border-b border-gray-200" : ""}`}><Flag size={17} className="absolute right-3 top-3 text-gray-300" fill="currentColor" /><div className="pr-7">{text}</div></div>; }
function DocumentRow({ title, date, last }) { return <div className={`px-3 py-3 ${!last ? "border-b border-gray-200" : ""}`}><div className="text-[14px]">{title}</div><div className="mt-1 text-[11px] text-gray-500">{date}</div></div>; }
function InfoPanel({ title, children }) { return <section className="rounded-lg border border-[#D0D0D0] bg-white p-4"><div className="mb-3 text-[14px] font-semibold">{title}</div>{children}</section>; }
function InfoRow({ label, value }) { return <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2 last:border-0"><span className="text-[12px] text-gray-500">{label}</span><span className="max-w-[65%] break-words text-right text-[12px] font-semibold">{value}</span></div>; }
function formatAltitudeValue(value) { if (value === undefined || value === null || value === "") return "-"; const raw = String(value); if (/FL/i.test(raw)) return raw.toUpperCase(); const n = Number(value); return Number.isFinite(n) && n >= 1000 ? `FL${Math.round(n / 100)}` : raw; }
function formatFuelTime(value) { if (!value) return "--:--"; return formatDuration(value); }
function formatNavTime(value) { if (value === undefined || value === null || value === "") return "-"; if (typeof value === "string" && /^\d{1,2}:\d{2}/.test(value)) return value.slice(0, 5); const n = Number(value); if (Number.isFinite(n)) return formatDuration(n); return String(value); }
function effectiveRouteText(origin, route, destination) { return `${origin} → ${route || "AS FILED"} → ${destination}`; }
function weatherWind(metar) { const match = String(metar || "").match(/\b(\d{3}|VRB)(\d{2,3})KT\b/); return match ? `${match[1]}/${match[2]}` : "-"; }
function weatherVisibility(metar) { const match = String(metar || "").match(/\b(?:P)?(\d{1,2}(?:SM|KM|M))\b/); return match ? match[1] : "-"; }
function weatherTemp(metar) { const match = String(metar || "").match(/\s(M\d{2}|\d{2})\/(M\d{2}|\d{2})\s/); if (!match) return "-"; return `${match[1].replace("M", "-")}°/${match[2].replace("M", "-")}°`; }
