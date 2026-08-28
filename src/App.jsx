import React, { useState } from "react";
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
} from "lucide-react";

const navigationItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutGrid,
  },
  {
    id: "briefing",
    label: "Briefing",
    icon: FileText,
  },
  {
    id: "map",
    label: "Map",
    icon: Map,
  },
  {
    id: "clearances",
    label: "Clearances",
    icon: GitFork,
  },
  {
    id: "navlog",
    label: "NavLog",
    icon: List,
  },
];

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const activeNavigationItem = navigationItems.find(
    (item) => item.id === activeTab
  );

  const pageTitle = activeNavigationItem?.label || "Dashboard";

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#E5E7EB] text-[#1F2937]">

      {/* ============================================================
          TOP HEADER BAR
          ============================================================ */}
      <header className="relative z-20 flex h-[58px] min-h-[58px] w-full items-center border-b border-[#C7C9CC] bg-[#D1D3D4]">

        {/* ----------------------------------------------------------
            LEFT SIDE - FLIGHT STATUS
            ---------------------------------------------------------- */}
        <div className="flex h-full min-w-0 items-center overflow-hidden">

          {/* Menu / Flight Menu Icon */}
          <button
            type="button"
            className="flex h-full w-[54px] shrink-0 items-center justify-center border-r border-[#C5C7C9] text-[#25282B] transition-colors hover:bg-[#C8CACD]"
            aria-label="Flight menu"
          >
            <div className="relative">
              <svg
                width="25"
                height="25"
                viewBox="0 0 25 25"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 7H15"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M4 12H13"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M4 17H10"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M17 9V19"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M14.5 16.5L17 19L19.5 16.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>

          {/* Flight Information */}
          <div className="flex h-full min-w-0 items-center whitespace-nowrap">

            <div className="flex h-full items-center border-r border-[#C5C7C9] px-[12px] text-[13px] font-semibold">
              EUR4425/07
            </div>

            <div className="flex h-full items-center border-r border-[#C5C7C9] px-[12px] text-[13px] font-semibold">
              MBRF350
            </div>

            <div className="flex h-full items-center border-r border-[#C5C7C9] px-[12px] text-[13px] font-semibold">
              EUR4425
            </div>

            <div className="flex h-full items-center border-r border-[#C5C7C9] px-[12px] text-[13px] font-semibold">
              KEWR (10:59) - KDCA (12:17)
            </div>

            <div className="flex h-full items-center border-r border-[#C5C7C9] px-[12px] text-[13px] font-semibold">
              OFP 1/0/1
            </div>

            {/* FINAL STATUS */}
            <div className="flex h-full items-center px-[10px]">
              <span className="rounded-[5px] bg-[#65C529] px-[9px] py-[3px] text-[11px] font-bold uppercase leading-none text-[#173D0B]">
                FINAL
              </span>
            </div>

          </div>
        </div>

        {/* ----------------------------------------------------------
            CENTER - PAGE TITLE
            ---------------------------------------------------------- */}
        <div className="pointer-events-none absolute left-1/2 top-0 flex h-full -translate-x-1/2 items-center">
          <h1 className="text-[19px] font-semibold tracking-[-0.2px] text-[#303236]">
            {pageTitle}
          </h1>
        </div>

        {/* ----------------------------------------------------------
            RIGHT SIDE - ACTION ICONS
            ---------------------------------------------------------- */}
        <div className="ml-auto flex h-full shrink-0 items-center">

          {/* Language */}
          <button
            type="button"
            className="flex h-full w-[48px] items-center justify-center text-[#292C30] transition-colors hover:bg-[#C8CACD]"
            aria-label="Language"
          >
            <Languages size={22} strokeWidth={1.8} />
          </button>

          {/* Upload / Export */}
          <button
            type="button"
            className="flex h-full w-[48px] items-center justify-center text-[#292C30] transition-colors hover:bg-[#C8CACD]"
            aria-label="Export or upload"
          >
            <Upload size={22} strokeWidth={1.9} />
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="relative flex h-full w-[48px] items-center justify-center text-[#292C30] transition-colors hover:bg-[#C8CACD]"
            aria-label="Notifications"
          >
            <Bell size={22} strokeWidth={1.8} />

            {/* Optional notification indicator */}
            <span className="absolute right-[11px] top-[15px] h-[5px] w-[5px] rounded-full bg-[#4D5257]" />
          </button>

          {/* Application Grid */}
          <button
            type="button"
            className="flex h-full w-[52px] items-center justify-center text-[#292C30] transition-colors hover:bg-[#C8CACD]"
            aria-label="Application menu"
          >
            <Grid3X3 size={22} strokeWidth={2} />
          </button>

        </div>
      </header>


      {/* ============================================================
          MAIN CONTENT AREA
          ============================================================ */}
      <main className="min-h-0 flex-1 overflow-y-auto bg-[#E5E7EB]">

        {/* ----------------------------------------------------------
            DASHBOARD
            ---------------------------------------------------------- */}
        {activeTab === "dashboard" && (
          <div className="flex min-h-full w-full items-start justify-center p-[18px]">

            <div className="flex min-h-[500px] w-full max-w-[1500px] items-center justify-center rounded-[6px] border border-[#D0D2D5] bg-[#E5E7EB]">

              <div className="text-center">

                <LayoutGrid
                  size={38}
                  strokeWidth={1.4}
                  className="mx-auto mb-3 text-[#8A8D91]"
                />

                <h2 className="text-[18px] font-semibold text-[#4B4F53]">
                  Dashboard
                </h2>

                <p className="mt-1 text-[13px] text-[#777B80]">
                  Flight dashboard content will be displayed here.
                </p>

              </div>

            </div>

          </div>
        )}


        {/* ----------------------------------------------------------
            BRIEFING
            ---------------------------------------------------------- */}
        {activeTab === "briefing" && (
          <div className="flex min-h-full w-full items-start justify-center p-[18px]">

            <div className="flex min-h-[500px] w-full max-w-[1500px] items-center justify-center rounded-[6px] border border-[#D0D2D5] bg-[#E5E7EB]">

              <div className="text-center">

                <FileText
                  size={38}
                  strokeWidth={1.4}
                  className="mx-auto mb-3 text-[#8A8D91]"
                />

                <h2 className="text-[18px] font-semibold text-[#4B4F53]">
                  Briefing
                </h2>

                <p className="mt-1 text-[13px] text-[#777B80]">
                  Flight briefing content will be displayed here.
                </p>

              </div>

            </div>

          </div>
        )}


        {/* ----------------------------------------------------------
            MAP
            ---------------------------------------------------------- */}
        {activeTab === "map" && (
          <div className="flex min-h-full w-full items-start justify-center p-[18px]">

            <div className="flex min-h-[500px] w-full max-w-[1500px] items-center justify-center rounded-[6px] border border-[#D0D2D5] bg-[#E5E7EB]">

              <div className="text-center">

                <Map
                  size={38}
                  strokeWidth={1.4}
                  className="mx-auto mb-3 text-[#8A8D91]"
                />

                <h2 className="text-[18px] font-semibold text-[#4B4F53]">
                  Map
                </h2>

                <p className="mt-1 text-[13px] text-[#777B80]">
                  Navigation map content will be displayed here.
                </p>

              </div>

            </div>

          </div>
        )}


        {/* ----------------------------------------------------------
            CLEARANCES
            ---------------------------------------------------------- */}
        {activeTab === "clearances" && (
          <div className="flex min-h-full w-full items-start justify-center p-[18px]">

            <div className="flex min-h-[500px] w-full max-w-[1500px] items-center justify-center rounded-[6px] border border-[#D0D2D5] bg-[#E5E7EB]">

              <div className="text-center">

                <GitFork
                  size={38}
                  strokeWidth={1.4}
                  className="mx-auto mb-3 text-[#8A8D91]"
                />

                <h2 className="text-[18px] font-semibold text-[#4B4F53]">
                  Clearances
                </h2>

                <p className="mt-1 text-[13px] text-[#777B80]">
                  ATC clearance content will be displayed here.
                </p>

              </div>

            </div>

          </div>
        )}


        {/* ----------------------------------------------------------
            NAVLOG
            ---------------------------------------------------------- */}
        {activeTab === "navlog" && (
          <div className="flex min-h-full w-full items-start justify-center p-[18px]">

            <div className="flex min-h-[500px] w-full max-w-[1500px] items-center justify-center rounded-[6px] border border-[#D0D2D5] bg-[#E5E7EB]">

              <div className="text-center">

                <List
                  size={38}
                  strokeWidth={1.4}
                  className="mx-auto mb-3 text-[#8A8D91]"
                />

                <h2 className="text-[18px] font-semibold text-[#4B4F53]">
                  NavLog
                </h2>

                <p className="mt-1 text-[13px] text-[#777B80]">
                  Navigation log content will be displayed here.
                </p>

              </div>

            </div>

          </div>
        )}

      </main>


      {/* ============================================================
          BOTTOM NAVIGATION BAR
          ============================================================ */}
      <nav className="z-20 flex h-[70px] min-h-[70px] w-full items-stretch border-t border-[#C7C9CC] bg-[#D1D3D4]">

        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={[
                "flex h-full flex-1 flex-col items-center justify-center gap-[4px]",
                "transition-colors duration-150",
                "focus:outline-none",
                isActive
                  ? "text-[#31353A]"
                  : "text-[#74787C] hover:bg-[#C9CBCE] hover:text-[#50545A]",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >

              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.7}
              />

              <span
                className={[
                  "text-[12px] leading-none",
                  isActive ? "font-semibold" : "font-normal",
                ].join(" ")}
              >
                {item.label}
              </span>

            </button>
          );
        })}

      </nav>

    </div>
  );
}

export default App;