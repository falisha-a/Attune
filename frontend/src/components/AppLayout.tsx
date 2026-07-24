import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AiPanel } from "./AiPanel";
import "./layout.css";

function IconSleep() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3a7 7 0 1 0 9 9 8 8 0 0 1-9-9z" />
    </svg>
  );
}

function IconPeriod() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 8v8M9.5 10.5h5" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M7 10.5V19h10v-8.5" />
    </svg>
  );
}

function IconEat() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M8 3v8a2 2 0 0 0 2 2v8" />
      <path d="M6 3v4M10 3v4" />
      <path d="M16 3v18M16 3c2.5 0 3.5 3 3.5 6S18.5 12 16 12" />
    </svg>
  );
}

function IconMood() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M9 10h.01M15 10h.01M9 14c1 1.4 5 1.4 6 0" />
    </svg>
  );
}

const tabs: {
  to: string;
  label: string;
  tip: string;
  home?: boolean;
  icon: React.ReactNode;
}[] = [
  {
    to: "/sleep",
    label: "Sleep",
    tip: "Log bedtime and wake",
    icon: <IconSleep />,
  },
  {
    to: "/period",
    label: "Period",
    tip: "Track cycle and symptoms",
    icon: <IconPeriod />,
  },
  {
    to: "/home",
    label: "Home",
    tip: "Today at a glance",
    home: true,
    icon: <IconHome />,
  },
  {
    to: "/eat",
    label: "Eat",
    tip: "Log food and macros",
    icon: <IconEat />,
  },
  {
    to: "/mood",
    label: "Mood",
    tip: "How you’re feeling today",
    icon: <IconMood />,
  },
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const onSettings = location.pathname === "/settings";

  return (
    <div className="app-shell">
      <header className="top-chrome">
        <span className="brand-quiet">Attune</span>
        <button
          type="button"
          className={onSettings ? "settings-icon on" : "settings-icon"}
          aria-label={onSettings ? "Close settings" : "Settings"}
          aria-pressed={onSettings}
          title="Settings & profile"
          onClick={() => navigate(onSettings ? "/home" : "/settings")}
        >
          <span className="settings-glyph" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>
      </header>

      <main className="page">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            title={tab.tip}
            className={({ isActive }) =>
              [
                "nav-item",
                tab.home ? "nav-home" : "",
                isActive ? "active" : "",
              ]
                .filter(Boolean)
                .join(" ")
            }
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      <AiPanel />
    </div>
  );
}
