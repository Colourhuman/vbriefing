import React, { useRef, useState } from "react";
import {
  LayoutGrid,
  FileText,
  Map,
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
} from "lucide-react";

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "briefing", label: "Briefing", icon: FileText },
  { id: "map", label: "Map", icon: Map },
  { id: "clearances", label: "Clearances", icon: GitFork },
  { id: "navlog", label: "NavLog", icon: List },
];

const airports = ["KEWR", "KDCA", "ALTN"];

const airportsList = [
  { icao: "KEWR/EWR", name: "NEWARK/LIBERTY INTL", role: "Departure", type: "main" },
  { icao: "KDCA/DCA", name: "WASHINGTON REAGAN", role: "Arrival", type: "main" },
  { icao: "KBWI/BWI", name: "BALTIMORE/WASHINGTON", role: "Arrival Alternate", type: "main" },
  { icao: "KIAD/IAD", name: "WASHINGTON DULLES", role: "Arrival Alternate", type: "main" },
  { icao: "KRIC/RIC", name: "RICHMOND INTL", role: "Arrival Alternate", type: "main" },
  { icao: "KPHL/PHL", name: "PHILADELPHIA INTL", role: "Arrival Alternate", type: "main" },
];


const SIMBRIEF_STORAGE_KEY = "virtual-lido-simbrief-user";
const SIMBRIEF_OFP_STORAGE_KEY = "virtual-lido-simbrief-ofp";

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
    // Ignore storage errors (private mode / blocked storage).
  }
}

function getPath(object, path, fallback = "") {
  const parts = path.split(".");
  let value = object;
  for (const part of parts) {
    if (value == null) return fallback;
    value = value[part];
  }
  return value == null || value === "" ? fallback : value;
}

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "") ?? "";
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [value];
}

function formatNumber(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(number);
}

function formatWeight(value, units = "kgs") {
  if (value === undefined || value === null || value === "") return "-";
  const unit = String(units).toLowerCase().includes("lbs") ? "lb" : "kg";
  return `${formatNumber(value)} ${unit}`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(toNumber(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatUtcTime(value) {
  if (value === undefined || value === null || value === "") return "-";

  // SimBrief JSON v2 returns ISO timestamps for time fields.
  if (typeof value === "string" && /[T:-]/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(11, 16);
  }

  const raw = String(value).trim();

  // HHMM timestamps occasionally appear in older/alternate formats.
  if (/^\d{4}$/.test(raw)) {
    return `${raw.slice(0, 2)}:${raw.slice(2, 4)}`;
  }

  // Unix timestamp (seconds).
  const timestamp = Number(value);
  if (Number.isFinite(timestamp) && timestamp > 0) {
    const date = new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(11, 16);
  }

  return "-";
}

function formatTimeOrDash(value) {
  const result = formatUtcTime(value);
  return result === "-" ? "--:--" : result;
}

function formatAltitude(value) {
  if (value === undefined || value === null || value === "") return "-";
  const raw = String(value);
  if (/^FL/i.test(raw)) return raw.toUpperCase();
  const number = Number(value);
  if (Number.isFinite(number)) {
    return number >= 1000 ? `FL${Math.round(number / 100)}` : String(number);
  }
  return raw;
}

function parseLatLon(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (Number.isFinite(n)) return n;

  const raw = String(value).trim().toUpperCase();
  const match = raw.match(/^([NS])(\d{2})(\d{2}(?:\.\d+)?)$/);
  if (match) {
    const degrees = Number(match[2]);
    const minutes = Number(match[3]);
    const result = degrees + minutes / 60;
    return match[1] === "S" ? -result : result;
  }
  const matchLong = raw.match(/^([EW])(\d{3})(\d{2}(?:\.\d+)?)$/);
  if (matchLong) {
    const degrees = Number(matchLong[2]);
    const minutes = Number(matchLong[3]);
    const result = degrees + minutes / 60;
    return matchLong[1] === "W" ? -result : result;
  }
  return null;
}

function fixLat(fix) {
  return parseLatLon(firstValue(fix?.pos_lat, fix?.lat, fix?.latitude, fix?.position?.lat));
}

function fixLon(fix) {
  return parseLatLon(firstValue(fix?.pos_long, fix?.lon, fix?.lng, fix?.longitude, fix?.position?.lon, fix?.position?.long));
}

function normalizeNavlog(rawNavlog) {
  const candidates = [
    rawNavlog?.fix,
    rawNavlog?.fixes,
    rawNavlog?.waypoint,
    rawNavlog?.waypoints,
    rawNavlog,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate.filter(Boolean);
    if (candidate && typeof candidate === "object") {
      if (candidate.ident || candidate.fix_ident || candidate.name) return [candidate];
      const values = Object.values(candidate).filter(
        (item) => item && typeof item === "object" && (item.ident || item.fix_ident || item.name || item.pos_lat)
      );
      if (values.length) return values;
    }
  }

  return [];
}

function formatLegTime(value) {
  if (value === undefined || value === null || value === "") return "-";
  if (typeof value === "string" && /^\d{1,2}:\d{2}(?::\d{2})?$/.test(value.trim())) {
    const parts = value.trim().split(":");
    return parts.length === 3 ? `${parts[0]}:${parts[1]}` : value.trim();
  }
  const n = Number(value);
  if (Number.isFinite(n) && n >= 0) return formatDuration(n);
  return String(value);
}

function extractAlternates(ofp) {
  const found = [];
  const seen = new Set();

  const addAirport = (value, keyHint = "") => {
    if (!value || typeof value !== "object") return;
    const airport = airportFromOFP(value);
    if (!airport.icao) return;
    if (airport.icao === ofp?.origin?.icao_code || airport.icao === ofp?.destination?.icao_code) return;
    const key = airport.icao.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      airport.role = "Alternate";
      found.push({
        ...airport,
        lat: parseLatLon(firstValue(value.pos_lat, value.lat, value.latitude)),
        lon: parseLatLon(firstValue(value.pos_long, value.lon, value.longitude)),
      });
    }
  };

  const walk = (node, keyHint = "") => {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, keyHint));
      return;
    }

    const hint = keyHint.toLowerCase();
    if (hint.includes("altn") || hint.includes("alternate")) {
      addAirport(node, hint);
    }

    for (const [key, value] of Object.entries(node)) {
      const lower = key.toLowerCase();

      // Explicit alternate airport object(s)
      if (lower.includes("altn") || lower.includes("alternate")) {
        if (typeof value === "string") {
          for (const token of value.split(/[,\s]+/).filter(Boolean)) {
            if (/^[A-Z]{4}$/i.test(token)) {
              if (!seen.has(token.toUpperCase())) {
                seen.add(token.toUpperCase());
                found.push({
                  icao: token.toUpperCase(),
                  iata: "",
                  name: token.toUpperCase(),
                  role: "Alternate",
                  runway: "",
                  lat: null,
                  lon: null,
                });
              }
            }
          }
        } else {
          walk(value, lower);
        }
      } else if (value && typeof value === "object") {
        walk(value, lower);
      }
    }
  };

  walk(ofp);
  return found;
}

function airportFromOFP(value = {}) {
  return {
    icao: firstValue(value.icao_code, value.icao, value.ident),
    iata: firstValue(value.iata_code, value.iata),
    name: firstValue(value.name, "UNKNOWN AIRPORT"),
    role: "",
    runway: firstValue(value.plan_rwy, value.runway),
  };
}

function normalizeNotams(rawNotams) {
  const items = [];
  const roots = [rawNotams, getPath(rawNotams, "notam", []), getPath(rawNotams, "item", [])];
  for (const root of roots) {
    for (const item of toArray(root)) {
      if (typeof item === "string" && item.trim()) items.push(item.trim());
      else if (item && typeof item === "object") {
        const text = firstValue(item.text, item.body, item.notam, item.raw, item.message);
        if (text) items.push(String(text).trim());
      }
    }
  }
  return [...new Set(items)];
}

function normalizeSimBriefOFP(ofp) {
  const originRaw = ofp?.origin || {};
  const destinationRaw = ofp?.destination || {};
  const origin = {
    ...airportFromOFP(originRaw),
    role: "Departure",
    lat: parseLatLon(firstValue(originRaw.pos_lat, originRaw.lat, originRaw.latitude)),
    lon: parseLatLon(firstValue(originRaw.pos_long, originRaw.lon, originRaw.longitude)),
  };
  const destination = {
    ...airportFromOFP(destinationRaw),
    role: "Arrival",
    lat: parseLatLon(firstValue(destinationRaw.pos_lat, destinationRaw.lat, destinationRaw.latitude)),
    lon: parseLatLon(firstValue(destinationRaw.pos_long, destinationRaw.lon, destinationRaw.longitude)),
  };

  const aircraft = ofp?.aircraft || {};
  const general = ofp?.general || {};
  const atc = ofp?.atc || {};
  const fuel = ofp?.fuel || {};
  const weights = ofp?.weights || {};
  const times = ofp?.times || {};
  const weather = ofp?.weather || {};
  const params = ofp?.params || {};

  const navlog = normalizeNavlog(ofp?.navlog);
  const alternates = extractAlternates(ofp);

  const fuelUnits = firstValue(params.units, "kgs");
  const callsign = firstValue(
    atc.callsign,
    general.callsign,
    `${firstValue(general.icao_airline, "")}${firstValue(general.flight_number, "")}`
  );
  const route = firstValue(
    atc.route,
    general.route,
    ofp?.route,
    getPath(ofp, "atc.flightplan_route")
  );

  const cruiseAltitude = firstValue(
    general.initial_altitude,
    general.cruise_altitude,
    atc.initial_alt,
    getPath(atc, "initial_alt"),
    navlog.find((fix) => String(fix.stage || "").toUpperCase() === "CRZ")?.altitude
  );

  const flightTime = firstValue(
    times.est_time_enroute,
    times.sched_time_enroute,
    times.enroute_time
  );

  return {
    raw: ofp,
    params,
    general,
    origin,
    destination,
    alternate: alternates[0] || { icao: "", iata: "", name: "NO ALTERNATE", role: "Alternate" },
    alternates,
    aircraft,
    atc,
    fuel,
    weights,
    times,
    weather,
    navlog,
    notams: normalizeNotams(ofp?.notams),
    flightNumber: firstValue(general.flight_number, atc.flight_number),
    airline: firstValue(general.icao_airline, ""),
    callsign,
    aircraftIcao: firstValue(aircraft.icaocode, aircraft.icao_code, aircraft.icao),
    aircraftName: firstValue(aircraft.name, aircraft.type, aircraftIcaoFallback(aircraft)),
    registration: firstValue(aircraft.reg, aircraft.registration, aircraft.registration_number),
    route,
    cruiseAltitude,
    costIndex: firstValue(general.costindex, general.cost_index, general.cruise_profile, general.cost_index_value),
    fuelUnits,
    tripFuel: firstValue(fuel.enroute_burn, fuel.trip_burn, fuel.trip),
    alternateFuel: firstValue(fuel.alternate_burn, fuel.altn_burn, fuel.alternate),
    reserveFuel: firstValue(fuel.reserve, fuel.reserve_fuel),
    taxiFuel: firstValue(fuel.taxi, fuel.taxi_burn),
    contingencyFuel: firstValue(fuel.contingency, fuel.cont),
    etopsFuel: firstValue(fuel.etops, fuel.etops_fuel),
    extraFuel: firstValue(fuel.extra, fuel.extra_fuel),
    minTakeoffFuel: firstValue(fuel.min_takeoff, fuel.min_takeoff_fuel, fuel.min_block),
    takeoffFuel: firstValue(fuel.plan_takeoff, fuel.takeoff, fuel.takeoff_fuel),
    rampFuel: firstValue(fuel.plan_ramp, fuel.ramp, fuel.ramp_fuel),
    landingFuel: firstValue(fuel.plan_landing, fuel.landing, fuel.landing_fuel),
    zfw: firstValue(weights.est_zfw, weights.plan_zfw),
    tow: firstValue(weights.est_tow, weights.plan_tow),
    ldw: firstValue(weights.est_ldw, weights.plan_ldw),
    maxZfw: firstValue(weights.max_zfw),
    maxTow: firstValue(weights.max_tow, weights.max_tow_struct),
    maxLdw: firstValue(weights.max_ldw),
    payload: firstValue(weights.payload),
    pax: firstValue(weights.pax_count, weights.pax),
    oew: firstValue(weights.oew),
    scheduledOut: firstValue(times.sched_out, times.est_out),
    scheduledOff: firstValue(times.sched_off, times.est_off),
    scheduledOn: firstValue(times.sched_on, times.est_on),
    scheduledIn: firstValue(times.sched_in, times.est_in),
    offBlockTime: firstValue(times.est_out, times.sched_out),
    takeoffTime: firstValue(times.est_off, times.sched_off),
    landingTime: firstValue(times.est_on, times.sched_on),
    onBlockTime: firstValue(times.est_in, times.sched_in),
    actualOut: firstValue(times.actual_out),
    actualOff: firstValue(times.actual_off),
    actualOn: firstValue(times.actual_on),
    actualIn: firstValue(times.actual_in),
    tripTime: formatDuration(firstValue(flightTime, 0)),
    originMetar: firstValue(weather.orig_metar, weather.origin_metar),
    originTaf: firstValue(weather.orig_taf, weather.origin_taf),
    destinationMetar: firstValue(weather.dest_metar, weather.destination_metar),
    destinationTaf: firstValue(weather.dest_taf, weather.destination_taf),
    alternateMetar: firstValue(weather.altn_metar, weather.alternate_metar),
    alternateTaf: firstValue(weather.altn_taf, weather.alternate_taf),
    pdcText: firstValue(atc.flightplan_text, atc.pdc, ofp?.text?.atc),
  };
}

function aircraftIcaoFallback(aircraft) {
  return firstValue(aircraft.iatacode, "-");
}

export default function App() {
  const [activeTab, setActiveTab] = useState("map");
  const [dashboardPage, setDashboardPage] = useState(0);
  const [weatherAirport, setWeatherAirport] = useState("KEWR");
  const [selectedAirport, setSelectedAirport] = useState(airportsList[0]);
  const [subTab, setSubTab] = useState("RAIM"); // NOTAM, RAIM
  const [simbriefUser, setSimbriefUser] = useState(() => safeStorageGet(SIMBRIEF_STORAGE_KEY));
  const [simbriefData, setSimbriefData] = useState(() => {
    const stored = safeStorageGet(SIMBRIEF_OFP_STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });
  const [showSimBriefModal, setShowSimBriefModal] = useState(false);
  const [simbriefInput, setSimbriefInput] = useState(() => safeStorageGet(SIMBRIEF_STORAGE_KEY));
  const [simbriefLoading, setSimbriefLoading] = useState(false);
  const [simbriefError, setSimbriefError] = useState("");
  const [simbriefImportedAt, setSimbriefImportedAt] = useState(() => {
    const stored = safeStorageGet(SIMBRIEF_OFP_STORAGE_KEY);
    try {
      return stored ? JSON.parse(stored)?._importedAt || "" : "";
    } catch {
      return "";
    }
  });
  const [copiedClearance, setCopiedClearance] = useState(false);
  const [checklist, setChecklist] = useState({ status: true, fuel: false, navlog: false, journey: false });

  const touchStartX = useRef(null);

  const currentNav =
    navigationItems.find((item) => item.id === activeTab) ||
    navigationItems[0];

  const flight = simbriefData || {
    origin: { icao: "KEWR", iata: "EWR", name: "NEWARK/LIBERTY INTL", runway: "22R" },
    destination: { icao: "KDCA", iata: "DCA", name: "WASHINGTON REAGAN", runway: "01" },
    alternate: { icao: "KBWI", iata: "BWI", name: "BALTIMORE/WASHINGTON" },
    flightNumber: "EUR4425",
    airline: "EUR",
    callsign: "EUR4425",
    aircraftIcao: "A359",
    aircraftName: "Airbus A350-900",
    registration: "-",
    route: "BIGGY4 BIGGY COPES MXE BAL",
    cruiseAltitude: "35000",
    costIndex: "30",
    fuelUnits: "kgs",
    tripFuel: "3515",
    alternateFuel: "1182",
    reserveFuel: "2327",
    taxiFuel: "600",
    minTakeoffFuel: "8012",
    takeoffFuel: "7412",
    rampFuel: "8012",
    landingFuel: "3897",
    zfw: "180000",
    tow: "187412",
    ldw: "183897",
    maxZfw: "194000",
    maxTow: "272000",
    maxLdw: "207000",
    payload: "40000",
    pax: "0",
    oew: "140000",
    scheduledOut: "",
    scheduledIn: "",
    offBlockTime: "",
    takeoffTime: "",
    landingTime: "",
    onBlockTime: "",
    tripTime: "01:18",
    originMetar: "",
    originTaf: "",
    destinationMetar: "",
    destinationTaf: "",
    alternateMetar: "",
    alternateTaf: "",
    pdcText: "",
    navlog: [],
    notams: [],
  };

  const importedOrigin = flight.origin?.icao || "KEWR";
  const importedDestination = flight.destination?.icao || "KDCA";
  const importedAlternate = flight.alternate?.icao || "KBWI";
  const scheduledDepartureTime = formatTimeOrDash(flight.scheduledOut);
  const headerDepartureTime = scheduledDepartureTime;
  const headerArrivalTime = formatTimeOrDash(flight.scheduledIn);
  const offBlockTime = formatTimeOrDash(flight.offBlockTime || flight.scheduledOut);
  const takeoffTime = formatTimeOrDash(flight.takeoffTime || flight.scheduledOff);
  const landingTime = formatTimeOrDash(flight.landingTime || flight.scheduledOn);
  const onBlockTime = formatTimeOrDash(flight.onBlockTime || flight.scheduledIn);
  const effectiveRoute = flight.route || "No route in OFP";
  const effectiveAircraft = flight.aircraftIcao || flight.aircraftName || "-";
  const effectiveFlight = flight.flightNumber || flight.callsign || "-";
  const alternateAirports = Array.isArray(flight.alternates)
    ? flight.alternates
    : (flight.alternate?.icao ? [flight.alternate] : []);
  const mapFixes = (flight.navlog || []).map((fix, index) => ({
    ...fix,
    ident: firstValue(fix.ident, fix.fix_ident, fix.name, `FIX${index + 1}`),
    lat: fixLat(fix),
    lon: fixLon(fix),
  })).filter((fix) => fix.lat !== null && fix.lon !== null);

  const weatherOptions = [
    { id: "KEWR", code: importedOrigin, airport: flight.origin, metar: flight.originMetar, taf: flight.originTaf },
    { id: "KDCA", code: importedDestination, airport: flight.destination, metar: flight.destinationMetar, taf: flight.destinationTaf },
    ...alternateAirports.map((apt, index) => ({
      id: `ALTN-${index}`,
      code: apt.icao,
      airport: apt,
      metar: index === 0 ? flight.alternateMetar : "",
      taf: index === 0 ? flight.alternateTaf : "",
    })),
  ];

  const weatherSelection =
    weatherOptions.find((item) => item.id === weatherAirport || item.code === weatherAirport) ||
    weatherOptions[0];

  async function importSimBrief() {
    const user = simbriefInput.trim();
    if (!user) {
      setSimbriefError("Bitte gib deinen SimBrief Username oder Pilot ID ein.");
      return;
    }

    setSimbriefLoading(true);
    setSimbriefError("");
    setCopiedClearance(false);

    try {
      const numeric = /^\d+$/.test(user);
      const param = numeric ? `userid=${encodeURIComponent(user)}` : `username=${encodeURIComponent(user)}`;
      const url = `https://www.simbrief.com/api/xml.fetcher.php?${param}&json=v2`;
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }

      if (!response.ok || !payload || payload.error) {
        throw new Error(
          payload?.error?.message ||
            payload?.message ||
            `SimBrief konnte den OFP nicht laden (HTTP ${response.status}).`
        );
      }

      const normalized = normalizeSimBriefOFP(payload);
      normalized._importedAt = new Date().toISOString();
      normalized._simbriefUser = user;

      setSimbriefData(normalized);
      setSelectedAirport({
        icao: `${normalized.origin.icao}/${normalized.origin.iata || normalized.origin.icao}`,
        name: normalized.origin.name,
        role: "Departure",
      });
      setSimbriefUser(user);
      setSimbriefImportedAt(normalized._importedAt);
      safeStorageSet(SIMBRIEF_STORAGE_KEY, user);
      safeStorageSet(SIMBRIEF_OFP_STORAGE_KEY, JSON.stringify(normalized));
      setShowSimBriefModal(false);
    } catch (error) {
      setSimbriefError(
        error?.message ||
          "Der SimBrief OFP konnte nicht geladen werden. Prüfe Username/Pilot ID und deine Internetverbindung."
      );
    } finally {
      setSimbriefLoading(false);
    }
  }

  function clearImportedPlan() {
    setSimbriefData(null);
    setSimbriefImportedAt("");
    safeStorageSet(SIMBRIEF_OFP_STORAGE_KEY, "");
  }

  async function copyClearance() {
    const clearance = flight.pdcText ||
      `${effectiveFlight}, cleared ${importedOrigin} to ${importedDestination}, ${effectiveRoute}, maintain ${flight.cruiseAltitude || "filed altitude"}.`;
    try {
      await navigator.clipboard.writeText(clearance);
      setCopiedClearance(true);
      window.setTimeout(() => setCopiedClearance(false), 1800);
    } catch {
      setSimbriefError("Die Clearance konnte nicht in die Zwischenablage kopiert werden.");
    }
  }

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;

    const endX = event.changedTouches[0].clientX;
    const difference = touchStartX.current - endX;

    if (Math.abs(difference) > 60) {
      if (difference > 0) {
        setDashboardPage(1);
      } else {
        setDashboardPage(0);
      }
    }

    touchStartX.current = null;
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#E5E7EB] text-[#25282C]">

      {/* =========================================================
          TOP HEADER
          ========================================================= */}

      <header className="relative z-30 flex h-[58px] min-h-[58px] items-center border-b border-[#C4C6C8] bg-[#D1D3D4]">

        <div className="flex h-full min-w-0 items-center overflow-hidden">

          <button className="flex h-full w-[55px] shrink-0 items-center justify-center border-r border-[#C4C6C8] text-gray-700 hover:bg-black/5">
            <X size={24} />
          </button>

          <div className="flex h-full items-center whitespace-nowrap text-[13px] font-semibold">

            <div className="flex h-full items-center border-r border-[#C4C6C8] px-3">
              {effectiveFlight}/01
            </div>

            <div className="flex h-full items-center border-r border-[#C4C6C8] px-3">
              {flight.registration || "-"}
            </div>

            <div className="flex h-full items-center border-r border-[#C4C6C8] px-3">
              {effectiveFlight}
            </div>

            <div className="flex h-full items-center border-r border-[#C4C6C8] px-3">
              {importedOrigin} ({headerDepartureTime}) - {importedDestination} ({headerArrivalTime})
            </div>

            <div className="flex h-full items-center border-r border-[#C4C6C8] px-3">
              OFP 1/0/1
            </div>

            <div className="px-2">
              <span className="rounded-[3px] bg-[#65C529] px-2 py-[3px] text-[11px] font-bold text-[#173D0B]">
                FINAL
              </span>
            </div>

          </div>
        </div>

        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[19px] font-semibold">
          {currentNav.label}
        </div>

        <div className="ml-auto flex h-full shrink-0 items-center">

          <button className="flex h-full w-12 items-center justify-center text-gray-700 hover:bg-black/5">
            <Languages size={22} strokeWidth={1.8} />
          </button>

          <button
            onClick={() => { setSimbriefInput(simbriefUser); setSimbriefError(""); setShowSimBriefModal(true); }}
            title="Import latest SimBrief OFP"
            className={`relative flex h-full w-12 items-center justify-center text-gray-700 hover:bg-black/5 ${simbriefData ? "bg-black/[0.03]" : ""}`}
          >
            <Upload size={22} strokeWidth={1.8} />
            {simbriefData && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#65C529]" />}
          </button>

          <button className="flex h-full w-12 items-center justify-center text-gray-700 hover:bg-black/5">
            <Bell size={22} strokeWidth={1.8} />
          </button>

          <button className="flex h-full w-[52px] items-center justify-center text-gray-700 hover:bg-black/5">
            <Grid3X3 size={22} strokeWidth={2} />
          </button>

        </div>
      </header>

      {showSimBriefModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-[#C9CBCF] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-[#F1F1F1] px-5 py-4">
              <div>
                <h2 className="text-[19px] font-semibold">SimBrief Import</h2>
                <p className="mt-1 text-[12px] text-gray-500">Import your latest generated OFP into virtual Lido.</p>
              </div>
              <button onClick={() => setShowSimBriefModal(false)} className="rounded-md p-2 text-gray-600 hover:bg-black/5">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                  SimBrief Username / Pilot ID
                </label>
                <input
                  value={simbriefInput}
                  onChange={(event) => setSimbriefInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") importSimBrief(); }}
                  placeholder="e.g. username or 1234567"
                  className="h-[48px] w-full rounded-md border border-gray-300 bg-white px-3 text-[15px] outline-none focus:border-[#526C9B] focus:ring-2 focus:ring-[#526C9B]/20"
                  autoFocus
                />
              </div>

              {simbriefError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-3 text-[13px] text-red-700">
                  {simbriefError}
                </div>
              )}

              {simbriefData && !simbriefError && (
                <div className="rounded-md border border-green-200 bg-green-50 px-3 py-3 text-[13px] text-green-800">
                  Imported: {simbriefData.origin?.icao} → {simbriefData.destination?.icao} · {simbriefData.flightNumber || simbriefData.callsign}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={clearImportedPlan}
                  disabled={!simbriefData || simbriefLoading}
                  className="h-[48px] rounded-md border border-gray-300 bg-white font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear OFP
                </button>
                <button
                  onClick={importSimBrief}
                  disabled={simbriefLoading}
                  className="flex h-[48px] items-center justify-center gap-2 rounded-md bg-[#0B1E48] font-semibold text-white hover:bg-[#10285C] disabled:opacity-60"
                >
                  {simbriefLoading && <Loader2 size={18} className="animate-spin" />}
                  {simbriefLoading ? "Importing..." : "Import Latest OFP"}
                </button>
              </div>

              <p className="text-[11px] leading-5 text-gray-500">
                The app only requests your latest OFP when you press Import. Your username and the last imported OFP are stored locally in this browser.
              </p>
            </div>
          </div>
        </div>
      )}


      {/* =========================================================
          MAIN CONTENT
          ========================================================= */}

      <main className="min-h-0 flex-1 overflow-hidden bg-[#E5E7EB]">

        {/* ================= DASHBOARD TAB ================= */}
        {activeTab === "dashboard" && (
          <div
            className="h-full w-full overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >

            {/* PAGE 1 */}
            <div
              className={`h-full w-full overflow-y-auto ${
                dashboardPage === 0 ? "block" : "hidden"
              }`}
            >
              <div className="grid min-h-full grid-cols-1 gap-4 p-3 lg:grid-cols-3">

                {/* FLIGHT INFO */}
                <div className="flex flex-col gap-4">
                  <section className="rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3">
                    <div className="grid grid-cols-3 items-center">
                      <span className="text-[13px] text-gray-500">{effectiveAircraft}</span>
                      <span className="text-center text-[20px] font-bold">{effectiveFlight}</span>
                      <span className="text-right text-[13px] text-gray-500">{flight.registration || "-"}</span>
                    </div>
                    <div className="mt-1 text-center">
                      <span className="rounded-full bg-[#69C92D] px-4 py-1 text-[12px] font-bold text-[#17500D]">
                        On time
                      </span>
                    </div>
                    <div className="mt-1 text-center text-[13px]">(1h 18m)</div>
                    <div className="my-1 flex items-center justify-center gap-5">
                      <span className="text-[30px] font-bold">{importedOrigin}</span>
                      <span className="text-[25px] text-gray-500">→</span>
                      <span className="text-[30px] font-bold">{importedDestination}</span>
                    </div>
                    <div className="grid grid-cols-2 border-b border-gray-300 pb-2 text-center">
                      <div className="border-r border-gray-300">
                        <div className="text-[12px] text-gray-500">RWY {flight.origin?.runway || "—"}</div>
                        <div className="mt-1 text-[12px]">{headerArrivalTime}</div>
                      </div>
                      <div>
                        <div className="text-[12px] text-gray-500">RWY {flight.destination?.runway || "—"}</div>
                        <div className="mt-1 text-[12px]">07 Sep 2023</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 py-2">
                      <div className="border-r border-gray-300 px-2">
                        <TimeRow label="STD" value={scheduledDepartureTime} />
                        <TimeRow label="ETD" value={offBlockTime} />
                      </div>
                      <div className="px-2">
                        <TimeRow label="STA" value={headerArrivalTime} />
                        <TimeRow label="ETA" value={headerArrivalTime} />
                      </div>
                    </div>
                    <div className="pb-1 text-center text-[12px] text-gray-500">- CTOT</div>
                    <div className="mb-2 grid grid-cols-3 gap-2 rounded-md bg-white px-2 py-2 text-center">
                      <div>
                        <div className="text-[10px] uppercase text-gray-500">OFF-BLOCK</div>
                        <div className="text-[13px] font-semibold">{offBlockTime}</div>
                      </div>
                      <div className="border-x border-gray-200">
                        <div className="text-[10px] uppercase text-gray-500">TAKEOFF</div>
                        <div className="text-[13px] font-semibold">{takeoffTime}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-gray-500">ON-BLOCK</div>
                        <div className="text-[13px] font-semibold">{onBlockTime}</div>
                      </div>
                    </div>
                    <button className="mt-2 h-[51px] w-full rounded-md bg-[#0B1E48] text-[16px] font-semibold text-white">
                      Accept Flight
                    </button>
                  </section>

                  {/* CHECKLIST */}
                  <section className="rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3">
                    <h2 className="mb-3 text-center text-[19px] font-semibold">
                      Flight Checklist
                    </h2>
                    <div className="rounded-md bg-white px-3">
                      <ChecklistRow
                        label="Status:"
                        value={checklist.status ? "Final" : "Pending"}
                        checked={checklist.status}
                        onClick={() => setChecklist((value) => ({ ...value, status: !value.status }))}
                      />
                      <ChecklistRow
                        label="Fuel:"
                        value={checklist.fuel ? "Loaded" : "Not ordered"}
                        checked={checklist.fuel}
                        onClick={() => setChecklist((value) => ({ ...value, fuel: !value.fuel }))}
                      />
                      <ChecklistRow
                        label="NavLog:"
                        value={checklist.navlog ? "Loaded" : "Pending"}
                        checked={checklist.navlog}
                        onClick={() => setChecklist((value) => ({ ...value, navlog: !value.navlog }))}
                      />
                      <ChecklistRow
                        label="Journey Log:"
                        value={checklist.journey ? "Ready" : "Pending"}
                        checked={checklist.journey}
                        onClick={() => setChecklist((value) => ({ ...value, journey: !value.journey }))}
                        last
                      />
                    </div>
                  </section>
                </div>

                {/* ROUTE */}
                <div>
                  <section className="rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3">
                    <h2 className="text-center text-[19px] font-semibold">Route</h2>
                    <div className="mt-2 overflow-hidden rounded-md bg-white">
                      <div className="h-[360px]">
                        <DynamicRoutePreview flight={flight} />
                      </div>
                      <div className="px-3 py-3">
                        <p className="text-[12px] leading-[1.5]">
                          {importedOrigin} - {effectiveRoute} - {importedDestination}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-3">
                      <button onClick={() => setActiveTab("map")} className="h-[47px] rounded-md border border-gray-300 bg-[#F8F8F8] font-semibold hover:bg-gray-100">
                        Go to Map
                      </button>
                      <button className="h-[47px] rounded-md border border-gray-300 bg-[#F8F8F8] font-semibold hover:bg-gray-100">
                        Open in mPilot
                      </button>
                    </div>
                  </section>
                </div>

                {/* WEATHER */}
                <div>
                  <section className="rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3">
                    <h2 className="text-center text-[19px] font-semibold">Weather</h2>
                    <AirportTabs
  selected={weatherAirport}
  onChange={setWeatherAirport}
  options={weatherOptions.map((item) => ({ id: item.id, label: item.code }))}
 />
                    <div className="mt-3 overflow-hidden rounded-md bg-white">
                      <div className="border-b border-gray-200 px-3 py-3">
                        <div className="text-[16px] font-bold">{weatherSelection.airport?.name || weatherSelection.code || "AIRPORT"}</div>
                        <div className="text-[12px] text-gray-500">{weatherSelection.code}</div>
                      </div>
                      <div className="space-y-2 px-3 py-3">
                        <WeatherRow label="Ceiling:" value="-" />
                        <WeatherRow label="Visibility:" value="9999 m" />
                        <WeatherRow label="HWC:" value="CALM" />
                        <WeatherRow label="CWC:" value="CALM" />
                      </div>
                      <div className="border-t border-gray-200 px-3 py-3">
                        <div className="mb-1 text-[12px] text-gray-500">METAR: 15m old</div>
                        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-[1.5]">
{weatherSelection.metar || "No METAR available in imported OFP"}
                        </pre>
                      </div>
                      <div className="border-t border-gray-200 px-3 py-3">
                        <div className="mb-1 text-[12px] text-gray-500">TAF: Issued at 07 Sep 2023, 08:33</div>
                        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-[1.5]">
{weatherSelection.taf || "No TAF available in imported OFP"}
                        </pre>
                      </div>
                    </div>
                    <button className="mt-3 h-[47px] w-full rounded-md border border-gray-300 bg-[#F8F8F8] font-semibold hover:bg-gray-100">
                      View Weather Charts
                    </button>
                  </section>
                </div>

              </div>
            </div>

            {/* PAGE 2 */}
            <div
              className={`h-full w-full overflow-y-auto ${
                dashboardPage === 1 ? "block" : "hidden"
              }`}
            >
              <div className="grid min-h-full grid-cols-1 gap-4 p-3 lg:grid-cols-3">

                {/* NOTAM */}
                <div>
                  <section className="flex h-full flex-col rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3">
                    <h2 className="text-center text-[19px] font-semibold">NOTAM</h2>
                    <AirportTabs
  selected={weatherAirport}
  onChange={setWeatherAirport}
  options={weatherOptions.map((item) => ({ id: item.id, label: item.code }))}
 />
                    <div className="mt-3 flex-1 overflow-hidden rounded-md bg-white">
                      <div className="bg-[#F5F5F5] px-3 py-3 text-[14px] font-semibold text-gray-500">
                        RUNWAY
                      </div>
                      <NotamItem
                        text={
                          <>
                            1A3305/23 - 05 Sep 2023, 18:02 - 09 Oct 2023, 18:02<br /><br />
                            EWR SID NEWARK LIBERTY INTL, NEWARK, NJ.<br />
                            NEWARK FOUR DEPARTURE...<br />
                            DEPARTING RWYS 4L/R AND 22L/R:<br />
                            BIGGY DEPARTURES: NA EXCEPT FOR AIRCRAFT EQUIPPED WITH SUITABLE <strong>RNAV</strong> SYSTEM WITH GPS.<br />
                            DEPARTING RWY 22L/R: LANNA, PARKE DEPARTURES: NA EXCEPT FOR AIRCRAFT EQUIPPED WITH SUITABLE <strong>RNAV</strong> SYSTEM WITH GPS, SBJ VOR OUT OF SERVICE.
                          </>
                        }
                      />
                      <NotamItem
                        last
                        text={
                          <>
                            1A3263/23 - 30 Aug 2023, 12:16 - 19 Sep 2023, 23:59<br /><br />
                            EWR <strong>RWY 04L PAPI U/S</strong>
                          </>
                        }
                      />
                    </div>
                    <button className="mt-3 h-[50px] rounded-md border border-gray-300 bg-[#F8F8F8] font-semibold hover:bg-gray-100">
                      View NOTAMs for All Airports
                    </button>
                  </section>
                </div>

                {/* FUEL + DOCUMENTS */}
                <div className="flex flex-col gap-4">
                  <section className="rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3">
                    <h2 className="text-center text-[19px] font-semibold">Fuel</h2>
                    <div className="mt-3 overflow-hidden rounded-md bg-white">
                      <div className="flex items-center justify-between bg-[#F5F5F5] px-3 py-3">
                        <span className="text-[15px] text-gray-600">Planned Fuel (OFP):</span>
                        <strong className="text-[20px]">{formatWeight(flight.rampFuel || flight.takeoffFuel, flight.fuelUnits)}</strong>
                      </div>
                      <div className="space-y-1 px-3 py-3">
                        <FuelRow label="PLN ZFW:" value={formatWeight(flight.zfw, flight.fuelUnits)} />
                        <FuelRow label="PLN TOW:" value={formatWeight(flight.tow, flight.fuelUnits)} />
                        <FuelRow label="PLN LAW:" value={formatWeight(flight.ldw, flight.fuelUnits)} />
                        <FuelRow label="MTOW:" value={formatWeight(flight.maxTow, flight.fuelUnits)} />
                        <FuelRow label="MLAW:" value={formatWeight(flight.maxLdw, flight.fuelUnits)} />
                        <FuelRow label="Max. Discretionary Fuel Cap:" value={formatWeight(flight.extraFuel, flight.fuelUnits)} />
                      </div>
                    </div>
                    <button className="mt-3 h-[49px] w-full rounded-md border border-gray-300 bg-[#F8F8F8] font-semibold hover:bg-gray-100">
                      Open Fuel
                    </button>
                  </section>

                  <section className="rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3">
                    <h2 className="text-center text-[19px] font-semibold">Additional Documents</h2>
                    <div className="mt-3 overflow-hidden rounded-md bg-white">
                      <DocumentRow title="CREW NAMES" date="- 30 Aug 2022 - 01 Jan 9999" />
                      <DocumentRow title="MEL Restrictions examples" date="- 30 Nov 2021 - 01 Jan 9999" />
                      <DocumentRow title="Welcome to Lido Flight 4D" date="- 30 Nov 2021 - 01 Jan 9999" last />
                    </div>
                    <button className="mt-3 h-[49px] w-full rounded-md border border-gray-300 bg-[#F8F8F8] font-semibold hover:bg-gray-100">
                      View All Documents
                    </button>
                  </section>
                </div>

                {/* CONTACT */}
                <div>
                  <section className="flex h-full flex-col rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3">
                    <h2 className="text-center text-[19px] font-semibold">Contact Information</h2>
                    <div className="mt-3 flex flex-1 flex-col overflow-hidden rounded-md bg-white">
                      <div>
                        <div className="bg-[#F5F5F5] px-3 py-3 text-[14px] font-semibold text-gray-500">CREW</div>
                        <div className="px-3 py-3">
                          <div className="text-[13px] text-gray-600">Pilot in Command / Captain</div>
                          <div className="mt-1 text-[14px] font-semibold">J.DOE</div>
                        </div>
                      </div>
                      <div>
                        <div className="bg-[#F5F5F5] px-3 py-3 text-[14px] font-semibold text-gray-500">DISPATCHER</div>
                        <div className="flex items-center justify-between px-3 py-3">
                          <div>
                            <div className="text-[14px] font-semibold">A. O.S</div>
                            <div className="text-[12px] text-gray-600">telno</div>
                          </div>
                          <div className="flex gap-2">
                            <button className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#526C9B] text-white">
                              <Phone size={18} />
                            </button>
                            <button className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#526C9B] text-white">
                              <MessageSquare size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 px-3 py-4 text-[13px] text-gray-600">
                        No remarks available
                      </div>
                    </div>
                  </section>
                </div>

              </div>
            </div>

          </div>
        )}


        {/* ================= BRIEFING TAB ================= */}
        {activeTab === "briefing" && (
          <div className="h-full overflow-y-auto bg-[#E5E7EB] px-3 py-3">
            <div className="mx-auto max-w-[1100px] space-y-3">

              {/* HEADER */}
              <section className="overflow-hidden rounded-xl border border-[#D5D5D5] bg-white">
                <div className="flex h-[50px] items-center justify-center bg-[#EEEEEE] text-[20px] font-semibold">
                  {importedOrigin}/{flight.origin?.iata || importedOrigin} <span className="mx-3 text-gray-400">···</span> <span className="text-gray-500">✈</span> <span className="mx-3 text-gray-400">···</span> {importedDestination}/{flight.destination?.iata || importedDestination}
                </div>
                <div className="grid grid-cols-2 gap-y-5 px-5 py-6 sm:grid-cols-5">
                  <BriefingValue label="ATC" value={effectiveFlight} />
                  <BriefingValue label="STD" value={headerDepartureTime} />
                  <BriefingValue label="STA" value={headerArrivalTime} />
                  <BriefingValue label="A/C TYPE" value={effectiveAircraft} />
                  <BriefingValue label="REG NO" value={flight.registration || "-"} />
                </div>
              </section>

              {/* PARAMETERS */}
              <section className="rounded-xl border border-[#D5D5D5] bg-white px-5 py-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
                  <BriefingValue label="CRZ SYS" value={flight.costIndex ? `CI${flight.costIndex}` : "-"} />
                  <BriefingValue label="GND DIST" value={firstValue(getPath(flight, "general.gc_distance"), getPath(flight, "general.route_distance"), "-")} />
                  <BriefingValue label="AIR DIST" value={firstValue(getPath(flight, "general.air_distance"), "-")} />
                  <BriefingValue label="TOC WIND" value={`${getPath(flight, "general.avg_wind_dir", "")}/${getPath(flight, "general.avg_wind_spd", "") || "-"}`} />
                  <BriefingValue label="AVG WIND" value="234/014" />
                  <BriefingValue label="AVG W/C" value={getPath(flight, "general.avg_wind_comp", "-")} />
                  <BriefingValue label="IALT" value="220" />
                  <BriefingValue label="TOC ISA" value={getPath(flight, "general.avg_temp_dev", "-")} />
                  <BriefingValue label="AVG FF KGS/HR" value={getPath(flight, "fuel.avg_fuel_flow", "-")} />
                  <BriefingValue label="FUEL BIAS" value="P00.0" />
                  <BriefingValue label="TKOF ALTN" value="-" />
                </div>
              </section>

              {/* WEIGHT */}
              <section className="overflow-hidden rounded-xl border border-[#D5D5D5] bg-white">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_1.1fr_1.1fr] bg-[#E9E9E9] px-5 py-3 text-[15px] font-semibold text-gray-600">
                  <span>Weight(kg)</span>
                  <span>Planned</span>
                  <span>Actual</span>
                  <span>Operational Limit</span>
                  <span>Structural Limit</span>
                </div>
                <div className="px-5 py-4">
                  <WeightRow name="DOW" planned={formatWeight(flight.oew, flight.fuelUnits)} />
                  <WeightRow name="LOAD" planned={formatWeight(flight.payload, flight.fuelUnits)} />
                  <WeightRow name="ZFW" planned={formatWeight(flight.zfw, flight.fuelUnits)} structural={formatWeight(flight.maxZfw, flight.fuelUnits)} />
                  <WeightRow name="TOW" planned={formatWeight(flight.tow, flight.fuelUnits)} operational={formatWeight(flight.maxTow, flight.fuelUnits)} structural={formatWeight(flight.maxTow, flight.fuelUnits)} />
                  <WeightRow name="LW" planned={formatWeight(flight.ldw, flight.fuelUnits)} operational={formatWeight(flight.maxLdw, flight.fuelUnits)} structural={formatWeight(flight.maxLdw, flight.fuelUnits)} />
                </div>
              </section>

              {/* FUEL */}
              <section className="overflow-hidden rounded-xl border border-[#D5D5D5] bg-white">
                <div className="flex items-center justify-between bg-[#E9E9E9] px-5 py-3">
                  <h2 className="text-[17px] font-semibold">Fuel</h2>
                  <button className="rounded-md border border-gray-300 bg-[#F4F4F4] px-5 py-2 text-[14px] shadow-sm hover:bg-gray-100">
                    Reset
                  </button>
                </div>

                <div className="px-5 py-2">
                  <div className="grid grid-cols-[1fr_255px_95px] items-center py-2 text-right text-[14px] text-gray-500">
                    <span></span>
                    <span>HH:MM</span>
                    <span>kg</span>
                  </div>

                  <FuelLine label="Trip" time={flight.tripTime} fuel={formatNumber(flight.tripFuel)} />
                  <FuelLine label="MINCONT" time={formatDuration(flight.contingencyFuel ? 240 : 0)} fuel={formatNumber(flight.contingencyFuel)} />

                  {/* ALTERNATE */}
                  <div className="grid grid-cols-[1fr_255px_95px] items-center py-3">
                    <div className="flex items-center">
                      <span className="text-[15px]">Alternate</span>
                      <select className="ml-auto mr-3 h-[46px] w-[255px] appearance-none rounded-md border-0 bg-[#DCDCDC] px-3 text-[14px] text-gray-700 outline-none">
                        <option>KBWI - BALTIMORE/W...</option>
                        <option>KRIC - RICHMOND</option>
                        <option>KPHL - PHILADELPHIA</option>
                      </select>
                    </div>
                    <span className="text-right text-[15px]">00:12</span>
                    <span className="text-right text-[15px]">1182</span>
                  </div>

                  <FuelLine label="Final Reserve" time={getPath(flight, "times.reserve_time", "1800") ? formatDuration(getPath(flight, "times.reserve_time", "1800")) : "00:30"} fuel={formatNumber(flight.reserveFuel)} />
                  <FuelLine label="ETOPS" time="00:00" fuel="0" />

                  <div className="my-2 border-t border-gray-300" />
                  <FuelLine label="Takeoff Fuel" time={formatDuration((toNumber(flight.tripFuel)+toNumber(flight.reserveFuel)+toNumber(flight.alternateFuel)) * 0)} fuel={formatNumber(flight.takeoffFuel || flight.minTakeoffFuel)} bold />

                  {/* TAXI */}
                  <div className="grid grid-cols-[1fr_255px_95px] items-center py-3">
                    <div className="flex items-center">
                      <span className="text-[15px]">Taxi Fuel</span>
                      <select className="ml-auto mr-3 h-[46px] w-[255px] appearance-none rounded-md border-0 bg-[#DCDCDC] px-3 text-[14px] text-gray-500 outline-none">
                        <option>Select Reason</option>
                        <option>Long taxi</option>
                        <option>De-icing</option>
                        <option>APU operation</option>
                      </select>
                    </div>
                    <div className="rounded-md bg-[#DCDCDC] py-3 text-center text-[15px]">00:15</div>
                    <div className="ml-3 rounded-md bg-[#DCDCDC] py-3 text-center text-[15px]">600</div>
                  </div>

                  <div className="my-2 border-t border-gray-300" />

                  <div className="flex items-center justify-between py-3">
                    <span className="text-[16px] font-semibold">Minimum Block Fuel</span>
                    <span className="text-[15px] font-semibold">{formatNumber(flight.minTakeoffFuel || flight.rampFuel || flight.takeoffFuel)}</span>
                  </div>

                  {/* DISCRETIONARY */}
                  <div className="grid grid-cols-[1fr_255px_95px] items-center py-3">
                    <div className="flex items-center">
                      <span className="text-[15px]">Discretionary Fuel</span>
                      <select className="ml-auto mr-3 h-[46px] w-[255px] appearance-none rounded-md border-0 bg-[#E1E1E1] px-3 text-[14px] text-gray-400 outline-none">
                        <option>Select Reason</option>
                        <option>Company policy</option>
                        <option>ATC delay</option>
                        <option>Weather</option>
                      </select>
                    </div>
                    <div className="rounded-md bg-[#DCDCDC] py-3 text-center text-[15px]">00:00</div>
                    <div className="ml-3 rounded-md bg-[#DCDCDC] py-3 text-center text-[15px]">0</div>
                  </div>

                  <div className="text-[13px] leading-6">
                    <div>Maximum Discretionary: {formatWeight(flight.extraFuel, flight.fuelUnits)}, LAND</div>
                    <div>no tankering recommended LOSS: 7 USD/TO</div>
                  </div>

                  <div className="my-3 border-t border-gray-300" />

                  <div className="space-y-1 text-[14px]">
                    <div>Estimated Landing Fuel: {formatWeight(flight.landingFuel, flight.fuelUnits)} ({flight.tripTime})</div>
                    <div>Total Reserve Fuel: {formatWeight(flight.reserveFuel, flight.fuelUnits)}</div>
                  </div>

                  <div className="my-3 border-t border-gray-300" />

                  <label className="flex cursor-pointer items-center gap-3 py-2">
                    <input type="checkbox" className="h-7 w-7 appearance-none rounded-md border-2 border-gray-700 bg-white checked:bg-[#0B1E48]" />
                    <span className="text-[16px] font-semibold">Fuel Truck Standby</span>
                  </label>
                </div>

                {/* BLOCK FUEL FOOTER */}
                <div className="mt-2 flex items-center gap-3 bg-[#5575A5] px-5 py-3 text-white">
                  <span className="text-[16px] font-semibold">Block Fuel</span>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="flex h-[46px] items-center rounded-md bg-white px-4 text-gray-800">
                      <span className="min-w-[110px] text-right text-[16px] font-semibold">{formatNumber(flight.rampFuel || flight.takeoffFuel || flight.minTakeoffFuel)}</span>
                      <span className="ml-3 text-[14px]">kg</span>
                    </div>
                    <button className="h-[46px] rounded-md bg-[#0B1E48] px-9 text-[17px] font-semibold text-white shadow-sm hover:bg-[#071330]">
                      Order
                    </button>
                  </div>
                </div>
              </section>

            </div>
          </div>
        )}


        {/* ================= MAP TAB ================= */}
        {activeTab === "map" && (
          <div className="flex h-full w-full">

            {/* LEFT SIDEBAR - AIRPORT LIST */}
            <aside className="w-[300px] shrink-0 border-r border-[#C4C6C8] bg-[#F4F4F4] overflow-y-auto">
              <div>
                <button className="flex w-full items-center justify-between px-4 py-3 font-semibold text-[15px] text-[#25282C] border-b border-[#E0E0E0]">
                  <span>Main Airport</span>
                  <ChevronDown size={20} className="text-gray-500" />
                </button>

                <div className="divide-y divide-[#E0E0E0]">
                  {[
                    { icao: `${importedOrigin}/${flight.origin?.iata || importedOrigin}`, name: flight.origin?.name || "DEPARTURE", role: "Departure", runway: flight.origin?.runway },
                    { icao: `${importedDestination}/${flight.destination?.iata || importedDestination}`, name: flight.destination?.name || "ARRIVAL", role: "Arrival", runway: flight.destination?.runway },
                    { icao: `${importedAlternate}/${flight.alternate?.iata || importedAlternate}`, name: flight.alternate?.name || "ALTERNATE", role: "Arrival Alternate", runway: flight.alternate?.runway },
                  ].map((apt) => {
                    const isSelected = selectedAirport.icao === apt.icao;
                    return (
                      <button
                        key={apt.icao}
                        onClick={() => setSelectedAirport(apt)}
                        className={`flex w-full flex-col text-left px-5 py-3 transition-colors ${
                          isSelected
                            ? "bg-[#7A8EA8] text-white"
                            : "hover:bg-black/5 text-gray-800"
                        }`}
                      >
                        <span className="text-[15px] font-bold leading-tight">
                          {apt.icao}
                        </span>
                        <span
                          className={`text-[12px] mt-0.5 ${
                            isSelected ? "text-gray-200" : "text-gray-500"
                          }`}
                        >
                          {apt.role}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* COLLAPSIBLE SECTIONS */}
              <div className="border-t border-[#D0D0D0]">
                <button className="flex w-full items-center justify-between px-4 py-3.5 font-semibold text-[15px] text-[#25282C] border-b border-[#E0E0E0] hover:bg-black/5">
                  <span>EDTO</span>
                  <ChevronRight size={20} className="text-gray-500" />
                </button>

                <button className="flex w-full items-center justify-between px-4 py-3.5 font-semibold text-[15px] text-[#25282C] border-b border-[#E0E0E0] hover:bg-black/5">
                  <span>Enroute Airport</span>
                </button>

                <button className="flex w-full items-center justify-between px-4 py-3.5 font-semibold text-[15px] text-[#25282C] border-b border-[#E0E0E0] hover:bg-black/5">
                  <span>Enroute Others</span>
                  <ChevronRight size={20} className="text-gray-500" />
                </button>
              </div>
            </aside>


            {/* RIGHT PANEL - MAP & DETAILS */}
            <section className="flex flex-1 flex-col overflow-hidden bg-white">
              
              {/* TOP MAP VIEW */}
              <div className="relative flex-1 bg-[#E8E7E1] overflow-hidden">
                <DynamicRoutePreview flight={flight} />

                <div className="absolute top-[38%] left-[49%] flex flex-col items-center">
                  <MapPin size={26} fill="#7A6899" color="#7A6899" />
                </div>
                <div className="absolute top-[68%] left-[45%] flex flex-col items-center">
                  <MapPin size={26} fill="#7A6899" color="#7A6899" />
                </div>
                <div className="absolute top-[58%] left-[41%] flex flex-col items-center">
                  <MapPin size={26} fill="#7A6899" color="#7A6899" />
                </div>
              </div>

              {/* BOTTOM DETAIL SHEET */}
              <div className="h-[260px] border-t border-[#C4C6C8] bg-[#F4F4F4] flex flex-col shadow-inner">
                <div className="flex h-3 w-full justify-center items-center">
                  <div className="h-1 w-12 rounded-full bg-[#B0B0B0]" />
                </div>

                <div className="px-5 py-2">
                  <h2 className="text-[17px] font-bold text-[#25282C] uppercase tracking-wide">
                    {selectedAirport.icao} - {selectedAirport.name}
                  </h2>
                </div>

                <div className="px-4 py-1">
                  <button className="flex w-full items-center justify-between rounded bg-[#E4E4E4] px-4 py-2 text-[14px] font-semibold text-gray-700 hover:bg-[#DCDCDC]">
                    <span>WX</span>
                    <ChevronRight size={18} className="text-gray-500" />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between border-b border-[#D5D5D5] px-4">
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSubTab("NOTAM")}
                      className={`px-6 py-2 text-[13px] font-semibold transition-colors ${
                        subTab === "NOTAM"
                          ? "bg-[#E0E0E0] text-gray-900 border-t-2 border-[#526C9B]"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      NOTAM
                    </button>
                    <button
                      onClick={() => setSubTab("RAIM")}
                      className={`px-6 py-2 text-[13px] font-semibold transition-colors ${
                        subTab === "RAIM"
                          ? "bg-[#E0E0E0] text-gray-900 border-t-2 border-[#526C9B]"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      RAIM
                    </button>
                  </div>

                  <button className="mb-1 rounded border border-[#B0B0B0] bg-white px-3 py-1 text-[12px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
                    View AFC
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-3">
                  {subTab === "RAIM" ? (
                    <table className="w-full text-center text-[12px]">
                      <thead>
                        <tr className="text-gray-500 uppercase tracking-wider text-[11px] font-semibold border-b border-gray-200 pb-1">
                          <th className="py-1">PRECISION</th>
                          <th className="py-1">BARO AIDED</th>
                          <th className="py-1">MASK ANGLE</th>
                          <th className="py-1">OUTAGE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-gray-800 font-medium">
                        <tr>
                          <td className="py-1.5">RNP 0.15</td>
                          <td className="py-1.5 text-gray-600">false</td>
                          <td className="py-1.5">5.0</td>
                          <td className="py-1.5">13:43 - 14:07</td>
                        </tr>
                        <tr>
                          <td className="py-1.5">RNP 0.16</td>
                          <td className="py-1.5 text-gray-600">false</td>
                          <td className="py-1.5">5.0</td>
                          <td className="py-1.5">13:43 - 14:07</td>
                        </tr>
                        <tr>
                          <td className="py-1.5">RNP 0.3</td>
                          <td className="py-1.5 text-gray-600">false</td>
                          <td className="py-1.5">5.0</td>
                          <td className="py-1.5">NO OUTAGES</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-4 text-center text-[13px] text-gray-500">
                      No critical NOTAMs for selected airport.
                    </div>
                  )}
                </div>

              </div>

            </section>

          </div>
        )}

                {/* ================= CLEARANCES TAB ================= */}
        {activeTab === "clearances" && (
          <div className="h-full w-full overflow-y-auto bg-[#E5E7EB] p-3">
            <div className="mx-auto max-w-[1100px] space-y-3">

              <section className="rounded-xl border border-[#D0D0D0] bg-[#F1F1F1]">
                <div className="border-b border-[#D0D0D0] px-5 py-4">
                  <h2 className="text-[19px] font-semibold">
                    Clearances
                  </h2>
                  <p className="mt-1 text-[12px] text-gray-500">
                    Flight {effectiveFlight} · {importedOrigin} → {importedDestination}
                  </p>
                </div>

                <div className="p-4 space-y-3">

                  <div className="rounded-lg border border-[#D5D5D5] bg-white">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                      <div>
                        <div className="text-[15px] font-semibold">
                          ATC Clearance
                        </div>
                        <div className="text-[11px] text-gray-500">
                          IFR Clearance
                        </div>
                      </div>

                      <span className="rounded-full bg-[#69C92D] px-3 py-1 text-[11px] font-bold text-[#17500D]">
                        READY
                      </span>
                    </div>

                    <div className="p-4">
                      <div className="rounded-md bg-[#F4F4F4] p-4 font-mono text-[13px] leading-[1.7]">
                        <div>{flight.pdcText || `${effectiveFlight}, cleared ${importedOrigin} to ${importedDestination}`}</div>
                        <div>{effectiveRoute}</div>
                        <div>Initial cruise / cleared altitude: {flight.cruiseAltitude || "-"}</div>
                        <div>Aircraft: {effectiveAircraft}</div>
                        <div>Squawk: {getPath(flight, "atc.squawk", "-")}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                    <div className="rounded-lg border border-[#D5D5D5] bg-white p-4">
                      <div className="mb-3 text-[14px] font-semibold">
                        Clearance Data
                      </div>

                      <div className="space-y-3">
                        <WeatherRow label="Destination" value={importedDestination} />
                        <WeatherRow label="Departure" value={importedOrigin} />
                        <WeatherRow label="SID" value={firstValue(getPath(flight, "general.sid", ""), getPath(flight, "origin.sid", "-"), "-")} />
                        <WeatherRow label="Cruise" value={flight.cruiseAltitude || "-"} />
                        <WeatherRow label="Squawk" value={getPath(flight, "atc.squawk", "-")} />
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#D5D5D5] bg-white p-4">
                      <div className="mb-3 text-[14px] font-semibold">
                        Frequencies
                      </div>

                      <div className="space-y-3">
                        <WeatherRow label="DELIVERY" value="121.85" />
                        <WeatherRow label="GROUND" value="121.70" />
                        <WeatherRow label="TOWER" value="118.30" />
                        <WeatherRow label="DEPARTURE" value="119.20" />
                        <WeatherRow label="CENTER" value="125.32" />
                      </div>
                    </div>

                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={copyClearance} className="flex h-[48px] items-center justify-center gap-2 rounded-md border border-gray-300 bg-white font-semibold hover:bg-gray-50">
                      {copiedClearance ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                      {copiedClearance ? "Copied" : "Copy Clearance"}
                    </button>

                    <button className="h-[48px] rounded-md bg-[#0B1E48] font-semibold text-white hover:bg-[#10285C]">
                      Mark Read
                    </button>
                  </div>

                </div>
              </section>

            </div>
          </div>
        )}

        {/* ================= NAVLOG TAB ================= */}
        {activeTab === "navlog" && (
          <div className="h-full w-full overflow-y-auto bg-[#E5E7EB] p-3">
            <div className="mx-auto max-w-[1200px] space-y-3">

              <section className="overflow-hidden rounded-xl border border-[#D0D0D0] bg-white">

                <div className="border-b border-[#D0D0D0] bg-[#F1F1F1] px-5 py-4">
                  <h2 className="text-[19px] font-semibold">
                    Navigation Log
                  </h2>

                  <p className="mt-1 text-[12px] text-gray-500">
                    {effectiveFlight} · {importedOrigin} → {importedDestination} · {effectiveAircraft}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-[12px]">

                    <thead className="bg-[#E9E9E9] text-[11px] font-semibold uppercase text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Waypoint</th>
                        <th className="px-4 py-3">FL</th>
                        <th className="px-4 py-3">Wind</th>
                        <th className="px-4 py-3">Dist</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Fuel</th>
                        <th className="px-4 py-3">ETA</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {flight.navlog.length > 0 ? (
                        flight.navlog.map((fix, index) => {
                          const ident = firstValue(fix.ident, fix.fix_ident, fix.name, `FIX${index + 1}`);
                          const altitude = formatAltitude(firstValue(fix.altitude_feet, fix.altitude, fix.level, "-"));
                          const windDir = firstValue(fix.wind_dir, fix.wind_direction, "-");
                          const windSpd = firstValue(fix.wind_spd, fix.wind_speed, "-");
                          const dist = firstValue(fix.distance, fix.distance_nm, "-");
                          const legTime = formatLegTime(firstValue(fix.time_leg, fix.leg_time, fix.time_leg_seconds, "-"));
                          const fuelRemaining = firstValue(fix.fuel_remaining, fix.fuel_remain, "-");
                          const etaValue = firstValue(fix.eta, fix.time_total_epoch, fix.time_total, "");
                           const eta = typeof etaValue === "string" && /[T:-]/.test(etaValue)
                             ? formatUtcTime(etaValue)
                             : (Number(etaValue) > 1000000000 ? formatUtcTime(etaValue) : "-");
                          return (
                            <tr key={`${ident}-${index}`} className={index === flight.navlog.length - 1 ? "bg-[#F5F5F5] font-semibold" : "hover:bg-gray-50"}>
                              <td className="px-4 py-3 font-semibold">{ident}</td>
                              <td className="px-4 py-3">{altitude}</td>
                              <td className="px-4 py-3">{windDir}/{windSpd}</td>
                              <td className="px-4 py-3">{dist}</td>
                              <td className="px-4 py-3">{legTime}</td>
                              <td className="px-4 py-3">{fuelRemaining}</td>
                              <td className="px-4 py-3">{eta}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                            Import a SimBrief OFP to populate the navigation log.
                          </td>
                        </tr>
                      )}
                    </tbody>

                  </table>
                </div>

              </section>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                <section className="rounded-xl border border-[#D0D0D0] bg-white p-4">
                  <div className="mb-3 text-[14px] font-semibold">
                    Route
                  </div>

                  <div className="text-[13px] leading-[1.7] text-gray-700">
                    {importedOrigin} → {effectiveRoute.replace(/\s+/g, " → ")} → {importedDestination}
                  </div>
                </section>

                <section className="rounded-xl border border-[#D0D0D0] bg-white p-4">
                  <div className="mb-3 text-[14px] font-semibold">
                    Trip
                  </div>

                  <div className="space-y-2">
                    <WeatherRow label="Distance" value={`${firstValue(getPath(flight, "general.gc_distance", "-"), "-")} NM`} />
                    <WeatherRow label="Air Distance" value={`${firstValue(getPath(flight, "general.air_distance", "-"), "-")} NM`} />
                    <WeatherRow label="Time" value={flight.tripTime} />
                  </div>
                </section>

                <section className="rounded-xl border border-[#D0D0D0] bg-white p-4">
                  <div className="mb-3 text-[14px] font-semibold">
                    Fuel
                  </div>

                  <div className="space-y-2">
                    <WeatherRow label="Trip Fuel" value={formatWeight(flight.tripFuel, flight.fuelUnits)} />
                    <WeatherRow label="Minimum Block" value={formatWeight(flight.minTakeoffFuel || flight.rampFuel, flight.fuelUnits)} />
                    <WeatherRow label="Takeoff Fuel" value={formatWeight(flight.takeoffFuel, flight.fuelUnits)} />
                  </div>
                </section>

              </div>

            </div>
          </div>
        )}


      </main>

      {/* =========================================================
          DASHBOARD PAGE INDICATORS
          ========================================================= */}

      {activeTab === "dashboard" && (
        <div className="pointer-events-none absolute bottom-[70px] left-0 right-0 z-20 flex h-[25px] items-center justify-center gap-2">
          <button
            onClick={() => setDashboardPage(0)}
            className={`pointer-events-auto h-[9px] w-[9px] rounded-full ${
              dashboardPage === 0 ? "bg-[#6C7074]" : "bg-[#C7C9CB]"
            }`}
          />
          <button
            onClick={() => setDashboardPage(1)}
            className={`pointer-events-auto h-[9px] w-[9px] rounded-full ${
              dashboardPage === 1 ? "bg-[#6C7074]" : "bg-[#C7C9CB]"
            }`}
          />
        </div>
      )}


      {/* =========================================================
          BOTTOM NAVIGATION
          ========================================================= */}

      <nav className="z-30 flex h-[70px] min-h-[70px] border-t border-[#C4C6C8] bg-[#D1D3D4]">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 ${
                active ? "text-[#354C70]" : "text-[#777B7F]"
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.7} />
              <span className={`text-[11px] ${active ? "font-semibold" : "font-normal"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}


/* ================================================================
   HELPER COMPONENTS
   ================================================================ */

function TimeRow({ label, value }) {
  return (
    <div className="flex justify-between py-[2px]">
      <span className="text-[12px] text-gray-500">{label}</span>
      <span className="text-[13px] font-semibold">{value}</span>
    </div>
  );
}

function ChecklistRow({ label, value, last, checked = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[51px] w-full items-center gap-3 text-left ${
        !last ? "border-b border-gray-200" : ""
      }`}
    >
      <span
        className={`flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border-2 ${
          checked ? "border-[#0B1E48] bg-[#0B1E48]" : "border-gray-300 bg-white"
        }`}
      >
        {checked && <span className="h-[8px] w-[8px] rounded-full bg-white" />}
      </span>
      <span className="text-[14px] text-gray-500">{label}</span>
      <span className="ml-auto text-[14px] font-semibold">{value}</span>
    </button>
  );
}

function FuelRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px] text-gray-600">{label}</span>
      <span className="text-[14px] font-semibold">{value}</span>
    </div>
  );
}

function WeatherRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-[13px] text-gray-500">{label}</span>
      <span className="text-[13px] font-semibold">{value}</span>
    </div>
  );
}

function AirportTabs({ selected, onChange, options }) {
  const fallback = [
    { id: "KEWR", label: "KEWR" },
    { id: "KDCA", label: "KDCA" },
    { id: "ALTN", label: "ALTN" },
  ];
  const items = options?.length ? options.slice(0, 4) : fallback;

  return (
    <div className={`mt-3 grid overflow-hidden rounded-lg bg-[#D0D0D2]`} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((airport) => {
        const active = selected === airport.id || selected === airport.label;
        return (
          <button
            key={airport.id}
            onClick={() => onChange(airport.id)}
            className={`h-[38px] text-[13px] font-semibold ${
              active ? "m-[2px] rounded-md bg-white shadow-sm" : "text-gray-600"
            }`}
          >
            {airport.label}
          </button>
        );
      })}
    </div>
  );
}

function DocumentRow({ title, date, last }) {
  return (
    <div className={`px-3 py-3 ${!last ? "border-b border-gray-200" : ""}`}>
      <div className="text-[14px]">{title}</div>
      <div className="mt-1 text-[11px] text-gray-500">{date}</div>
    </div>
  );
}

function NotamItem({ text, last }) {
  return (
    <div className={`relative px-3 py-3 text-[13px] leading-[1.55] ${!last ? "border-b border-gray-200" : ""}`}>
      <Flag size={19} className="absolute right-3 top-3 text-gray-300" fill="currentColor" />
      <div className="pr-7">{text}</div>
    </div>
  );
}

function BriefingValue({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="truncate text-[18px] font-medium text-[#25282C]">{value}</div>
    </div>
  );
}

function WeightRow({ name, planned, actual, operational, structural, actualInput = false }) {
  return (
    <div className="grid min-h-[58px] grid-cols-[1.2fr_1fr_1fr_1.1fr_1.1fr] items-center">
      <span className="text-[16px] font-medium">{name}</span>
      <span className="text-[17px] font-medium">{planned}</span>
      <div>
        {actualInput && actual ? (
          <div className="mx-auto flex h-[47px] max-w-[115px] items-center justify-center rounded-md bg-[#E1E1E1] text-[16px] text-gray-500">
            {actual}
          </div>
        ) : actual ? (
          <span className="text-[16px]">{actual}</span>
        ) : null}
      </div>
      <div>
        {operational && (
          <div className="mx-auto flex h-[47px] max-w-[115px] items-center justify-center rounded-md bg-[#E1E1E1] text-[16px] font-medium">
            {operational}
          </div>
        )}
      </div>
      <div className="text-right text-[16px] font-medium">{structural}</div>
    </div>
  );
}

function FuelLine({ label, time, fuel, bold = false }) {
  return (
    <div className="grid grid-cols-[1fr_255px_95px] items-center py-3">
      <span className={`text-[15px] ${bold ? "font-semibold" : ""}`}>{label}</span>
      <span className={`text-right text-[15px] ${bold ? "font-semibold" : ""}`}>{time}</span>
      <span className={`text-right text-[15px] ${bold ? "font-semibold" : ""}`}>{fuel}</span>
    </div>
  );
}

function DynamicRoutePreview({ flight }) {
  const fixes = (flight?.navlog || [])
    .map((fix, index) => ({
      ident: firstValue(fix.ident, fix.fix_ident, fix.name, `FIX${index + 1}`),
      lat: fixLat(fix),
      lon: fixLon(fix),
    }))
    .filter((fix) => Number.isFinite(fix.lat) && Number.isFinite(fix.lon));

  const airports = [
    {
      ident: flight?.origin?.icao,
      lat: flight?.origin?.lat,
      lon: flight?.origin?.lon,
      kind: "origin",
      label: flight?.origin?.name,
    },
    {
      ident: flight?.destination?.icao,
      lat: flight?.destination?.lat,
      lon: flight?.destination?.lon,
      kind: "destination",
      label: flight?.destination?.name,
    },
    ...(flight?.alternates || []).map((apt) => ({
      ident: apt.icao,
      lat: apt.lat,
      lon: apt.lon,
      kind: "alternate",
      label: apt.name,
    })),
  ].filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));

  const all = [...fixes, ...airports];
  if (!all.length) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#E8E7E1]">
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(110,130,110,.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(110,130,110,.3) 1px, transparent 1px)
          `,
          backgroundSize: "55px 55px",
        }} />
        <div className="absolute inset-0 flex items-center justify-center text-[12px] text-gray-500">
          No detailed position data in this OFP
        </div>
      </div>
    );
  }

  const lats = all.map((p) => p.lat);
  const lons = all.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const latPad = Math.max((maxLat - minLat) * 0.18, 0.6);
  const lonPad = Math.max((maxLon - minLon) * 0.18, 0.6);
  const view = {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLon: minLon - lonPad,
    maxLon: maxLon + lonPad,
  };

  const project = (lat, lon) => ({
    x: ((lon - view.minLon) / (view.maxLon - view.minLon)) * 500,
    y: (1 - (lat - view.minLat) / (view.maxLat - view.minLat)) * 360,
  });

  const routePoints = fixes.length >= 2
    ? fixes
    : airports.filter((p) => p.kind === "origin" || p.kind === "destination");

  const projectedRoute = routePoints.map((p) => project(p.lat, p.lon));
  const pathD = projectedRoute.length
    ? projectedRoute.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
    : "";

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#E8E7E1]">
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(110,130,110,.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(110,130,110,.3) 1px, transparent 1px)
          `,
          backgroundSize: "55px 55px",
        }}
      />

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 360" preserveAspectRatio="none">
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="#111111"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {fixes.map((fix, index) => {
          const point = project(fix.lat, fix.lon);
          return (
            <g key={`${fix.ident}-${index}`}>
              <circle cx={point.x} cy={point.y} r="3.2" fill="#4D6488" />
            </g>
          );
        })}

        {airports.map((airport, index) => {
          const point = project(airport.lat, airport.lon);
          const fill =
            airport.kind === "origin"
              ? "#65C52D"
              : airport.kind === "destination"
                ? "#F2A243"
                : "#7A6899";

          return (
            <g key={`${airport.ident}-${index}`}>
              <circle cx={point.x} cy={point.y} r="10" fill={fill} />
              <circle cx={point.x} cy={point.y} r="10" fill="none" stroke="white" strokeWidth="2" />
            </g>
          );
        })}
      </svg>

      {airports.map((airport, index) => {
        const point = project(airport.lat, airport.lon);
        const left = `${(point.x / 500) * 100}%`;
        const top = `${(point.y / 360) * 100}%`;
        const textColor =
          airport.kind === "origin"
            ? "#4E9E25"
            : airport.kind === "destination"
              ? "#C77920"
              : "#675483";

        return (
          <div
            key={`label-${airport.ident}-${index}`}
            className="absolute -translate-x-1/2 -translate-y-[120%] text-center"
            style={{ left, top }}
          >
            <div className="rounded bg-white/75 px-1.5 py-0.5 text-[11px] font-bold shadow-sm" style={{ color: textColor }}>
              {airport.ident}
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-2 left-2 rounded bg-white/80 px-2 py-1 text-[10px] text-gray-600 shadow-sm">
        {fixes.length ? `${fixes.length} navlog fixes` : "Airport-to-airport route"}
      </div>
    </div>
  );
}
