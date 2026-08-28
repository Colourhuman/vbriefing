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

export default function App() {
  const [activeTab, setActiveTab] = useState("map");
  const [dashboardPage, setDashboardPage] = useState(0);
  const [weatherAirport, setWeatherAirport] = useState("KEWR");
  const [selectedAirport, setSelectedAirport] = useState(airportsList[0]);
  const [subTab, setSubTab] = useState("RAIM"); // NOTAM, RAIM

  const touchStartX = useRef(null);

  const currentNav =
    navigationItems.find((item) => item.id === activeTab) ||
    navigationItems[0];

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
              EUR4425/07
            </div>

            <div className="flex h-full items-center border-r border-[#C4C6C8] px-3">
              MBRF350
            </div>

            <div className="flex h-full items-center border-r border-[#C4C6C8] px-3">
              EUR4425
            </div>

            <div className="flex h-full items-center border-r border-[#C4C6C8] px-3">
              KEWR (10:59) - KDCA (12:17)
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

          <button className="flex h-full w-12 items-center justify-center text-gray-700 hover:bg-black/5">
            <Upload size={22} strokeWidth={1.8} />
          </button>

          <button className="flex h-full w-12 items-center justify-center text-gray-700 hover:bg-black/5">
            <Bell size={22} strokeWidth={1.8} />
          </button>

          <button className="flex h-full w-[52px] items-center justify-center text-gray-700 hover:bg-black/5">
            <Grid3X3 size={22} strokeWidth={2} />
          </button>

        </div>
      </header>


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
                      <span className="text-[13px] text-gray-500">A359</span>
                      <span className="text-center text-[20px] font-bold">EUR4425</span>
                      <span className="text-right text-[13px] text-gray-500">MBRF350</span>
                    </div>
                    <div className="mt-1 text-center">
                      <span className="rounded-full bg-[#69C92D] px-4 py-1 text-[12px] font-bold text-[#17500D]">
                        On time
                      </span>
                    </div>
                    <div className="mt-1 text-center text-[13px]">(1h 18m)</div>
                    <div className="my-1 flex items-center justify-center gap-5">
                      <span className="text-[30px] font-bold">KEWR</span>
                      <span className="text-[25px] text-gray-500">→</span>
                      <span className="text-[30px] font-bold">KDCA</span>
                    </div>
                    <div className="grid grid-cols-2 border-b border-gray-300 pb-2 text-center">
                      <div className="border-r border-gray-300">
                        <div className="text-[12px] text-gray-500">RWY 22R</div>
                        <div className="mt-1 text-[12px]">07 Sep 2023</div>
                      </div>
                      <div>
                        <div className="text-[12px] text-gray-500">RWY 01</div>
                        <div className="mt-1 text-[12px]">07 Sep 2023</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 py-2">
                      <div className="border-r border-gray-300 px-2">
                        <TimeRow label="STD" value="10:59" />
                        <TimeRow label="ETD" value="10:59" />
                      </div>
                      <div className="px-2">
                        <TimeRow label="STA" value="12:17" />
                        <TimeRow label="ETA" value="12:17" />
                      </div>
                    </div>
                    <div className="pb-1 text-center text-[12px] text-gray-500">- CTOT</div>
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
                      <ChecklistRow label="Status:" value="Final at 09:20" />
                      <ChecklistRow label="Fuel:" value="Not ordered" />
                      <ChecklistRow label="NavLog:" value="Pending" />
                      <ChecklistRow label="Journey Log:" value="Pending" last />
                    </div>
                  </section>
                </div>

                {/* ROUTE */}
                <div>
                  <section className="rounded-lg border border-[#D0D0D0] bg-[#F1F1F1] p-3">
                    <h2 className="text-center text-[19px] font-semibold">Route</h2>
                    <div className="mt-2 overflow-hidden rounded-md bg-white">
                      <div className="h-[360px]">
                        <RoutePreview />
                      </div>
                      <div className="px-3 py-3">
                        <p className="text-[12px] leading-[1.5]">
                          KEWR - KZNY BIGGY T_O_C COPES MXE T_O_D KZNY KZDC BAL - KDCA
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
                    <AirportTabs selected={weatherAirport} onChange={setWeatherAirport} />
                    <div className="mt-3 overflow-hidden rounded-md bg-white">
                      <div className="border-b border-gray-200 px-3 py-3">
                        <div className="text-[16px] font-bold">NEWARK/LIBERTY INTL</div>
                        <div className="text-[12px] text-gray-500">{weatherAirport}</div>
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
SA 070951 21004KT 10SM FEW250 25/21 A2979=
                        </pre>
                      </div>
                      <div className="border-t border-gray-200 px-3 py-3">
                        <div className="mb-1 text-[12px] text-gray-500">TAF: Issued at 07 Sep 2023, 08:33</div>
                        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-[1.5]">
Forecast from 09:00 to 12:00
FT 070833Z 0709/0812 VRB04KT P6SM
FEW250
FM071400 23006KT P6SM FEW050 SCT250
FM071900 15009KT P6SM VCSH SCT050
SCT150 BKN250
FM080100 20006KT P6SM FEW050 SCT150
BKN250
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
                    <AirportTabs selected={weatherAirport} onChange={setWeatherAirport} />
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
                        <strong className="text-[20px]">8012 kg</strong>
                      </div>
                      <div className="space-y-1 px-3 py-3">
                        <FuelRow label="PLN ZFW:" value="180000 kg" />
                        <FuelRow label="PLN TOW:" value="187412 kg" />
                        <FuelRow label="PLN LAW:" value="183897 kg" />
                        <FuelRow label="MTOW:" value="272000 kg" />
                        <FuelRow label="MLAW:" value="207000 kg" />
                        <FuelRow label="Max. Discretionary Fuel Cap:" value="23103 kg" />
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
                  KEWR/EWR <span className="mx-3 text-gray-400">···</span> <span className="text-gray-500">✈</span> <span className="mx-3 text-gray-400">···</span> KDCA/DCA
                </div>
                <div className="grid grid-cols-2 gap-y-5 px-5 py-6 sm:grid-cols-5">
                  <BriefingValue label="ATC" value="EUR4425" />
                  <BriefingValue label="STD" value="10:59/11:14" />
                  <BriefingValue label="STA" value="12:02/12:17" />
                  <BriefingValue label="A/C TYPE" value="A359" />
                  <BriefingValue label="REG NO" value="MBRF350" />
                </div>
              </section>

              {/* PARAMETERS */}
              <section className="rounded-xl border border-[#D5D5D5] bg-white px-5 py-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
                  <BriefingValue label="CRZ SYS" value="CI30" />
                  <BriefingValue label="GND DIST" value="183" />
                  <BriefingValue label="AIR DIST" value="192" />
                  <BriefingValue label="TOC WIND" value="237/020" />
                  <BriefingValue label="AVG WIND" value="234/014" />
                  <BriefingValue label="AVG W/C" value="M015" />
                  <BriefingValue label="IALT" value="220" />
                  <BriefingValue label="TOC ISA" value="P011" />
                  <BriefingValue label="AVG FF KGS/HR" value="6023" />
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
                  <WeightRow name="DOW" planned="140000" />
                  <WeightRow name="LOAD" planned="40000" actual="0" actualInput />
                  <WeightRow name="ZFW" planned="180000" actual="0" structural="194000" actualInput />
                  <WeightRow name="TOW" planned="187412" actual="0" operational="272000" structural="272000" actualInput />
                  <WeightRow name="LW" planned="183897" actual="0" operational="207000" structural="207000" actualInput />
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

                  <FuelLine label="Trip" time="00:35" fuel="3515" />
                  <FuelLine label="MINCONT" time="00:04" fuel="388" />

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

                  <FuelLine label="Final Reserve" time="00:30" fuel="2327" />
                  <FuelLine label="ETOPS" time="00:00" fuel="0" />

                  <div className="my-2 border-t border-gray-300" />
                  <FuelLine label="Takeoff Fuel" time="01:21" fuel="7412" bold />

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
                    <span className="text-[15px] font-semibold">8012</span>
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
                    <div>Maximum Discretionary: 23103 kg, LAND</div>
                    <div>no tankering recommended LOSS: 7 USD/TO</div>
                  </div>

                  <div className="my-3 border-t border-gray-300" />

                  <div className="space-y-1 text-[14px]">
                    <div>Estimated Landing Fuel: 3897 kg (00:39)</div>
                    <div>Total Reserve Fuel: 3509 kg (00:42)</div>
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
                      <span className="min-w-[110px] text-right text-[16px] font-semibold">8012</span>
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
                  {airportsList.map((apt) => {
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
                <RoutePreview />

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

        {/* ================= OTHER TABS ================= */}
        {activeTab !== "dashboard" && activeTab !== "briefing" && activeTab !== "map" && (
          <div className="flex h-full items-center justify-center bg-[#E5E7EB] p-5">
            <div className="flex h-full w-full items-center justify-center rounded-lg border border-gray-300 bg-[#F1F1F1]">
              {activeTab === "clearances" && (
                <div className="text-center">
                  <GitFork size={45} className="mx-auto mb-3 text-gray-400" />
                  <h2 className="text-xl font-semibold text-gray-600">Clearances</h2>
                </div>
              )}
              {activeTab === "navlog" && (
                <div className="text-center">
                  <List size={45} className="mx-auto mb-3 text-gray-400" />
                  <h2 className="text-xl font-semibold text-gray-600">NavLog</h2>
                </div>
              )}
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

function ChecklistRow({ label, value, last }) {
  return (
    <div className={`flex min-h-[51px] items-center gap-3 ${!last ? "border-b border-gray-200" : ""}`}>
      <span className="h-[20px] w-[20px] shrink-0 rounded-full border-2 border-gray-300 bg-white" />
      <span className="text-[14px] text-gray-500">{label}</span>
      <span className="ml-auto text-[14px] font-semibold">{value}</span>
    </div>
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

function AirportTabs({ selected, onChange }) {
  return (
    <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-lg bg-[#D0D0D2]">
      {airports.map((airport) => {
        const active = selected === airport;
        return (
          <button
            key={airport}
            onClick={() => onChange(airport)}
            className={`h-[38px] text-[13px] font-semibold ${
              active ? "m-[2px] rounded-md bg-white shadow-sm" : "text-gray-600"
            }`}
          >
            {airport}
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

function RoutePreview() {
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
      <div className="absolute left-0 right-0 top-[25%] border-t border-[#9BA49B]" />
      <div className="absolute left-0 right-0 top-[50%] border-t border-[#9BA49B]" />
      <div className="absolute left-0 right-0 top-[75%] border-t border-[#9BA49B]" />

      <div className="absolute bottom-0 left-[25%] top-0 border-l border-[#9BA49B]" />
      <div className="absolute bottom-0 left-[50%] top-0 border-l border-[#9BA49B]" />
      <div className="absolute bottom-0 left-[75%] top-0 border-l border-[#9BA49B]" />

      <div className="absolute -left-[15%] top-[12%] h-[120px] w-[65%] rotate-[12deg] rounded-[50%] border-2 border-[#9EB59A]" />
      <div className="absolute -right-[15%] top-[40%] h-[250px] w-[55%] rotate-[-18deg] rounded-[50%] border-2 border-[#9EB59A]" />
      <div className="absolute bottom-[-10%] right-[-5%] h-[55%] w-[30%] rotate-[8deg] rounded-[50%] bg-[#D5E5EA]" />

      <div className="absolute left-[35%] top-[15%] rotate-[-8deg] text-[15px] italic text-[#817968]">
        PENNSYLVANIA, PA
      </div>
      <div className="absolute left-[32%] top-[23%] text-[13px] italic text-[#817968]">
        Appalachian Mountains
      </div>
      <div className="absolute bottom-[22%] left-[45%] text-[13px] italic text-[#817968]">
        UNITED STATES
      </div>
      <div className="absolute bottom-[14%] left-[47%] text-[12px] italic text-[#817968]">
        MARYLAND, MD
      </div>

      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 360" preserveAspectRatio="none">
        <path d="M360 55 L235 230" fill="none" stroke="#000000" strokeWidth="3.5" />
      </svg>

      <div className="absolute right-[24%] top-[8%] flex flex-col items-center">
        <MapPin size={38} fill="#65C52D" color="#65C52D" />
        <span className="-mt-1 text-[13px] font-bold text-[#4E9E25]">KEWR</span>
      </div>

      <div className="absolute bottom-[28%] left-[44%] flex flex-col items-center">
        <MapPin size={38} fill="#F2A243" color="#F2A243" />
        <span className="-mt-1 text-[13px] font-bold text-[#C77920]">KDCA</span>
      </div>

      <span className="absolute left-2 top-[22%] text-[11px] text-gray-500">W78°</span>
      <span className="absolute left-[38%] top-2 text-[11px] text-gray-500">W76°</span>
      <span className="absolute right-4 top-[22%] text-[11px] text-gray-500">W72°</span>
      <span className="absolute left-2 top-[35%] text-[11px] text-gray-500">N40°</span>
      <span className="absolute left-2 top-[78%] text-[11px] text-gray-500">N38°</span>
      <span className="absolute right-2 top-[35%] text-[11px] text-gray-500">N40°</span>
      <span className="absolute right-2 top-[78%] text-[11px] text-gray-500">N38°</span>
    </div>
  );
}