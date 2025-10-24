import React, { useEffect, useMemo, useRef, useState } from "react";
import AttackTimeline from "./components/AttackTimeline";
import AttackMap from "./components/AttackMap";
import AdaptiveIntelligence from "./components/AdaptiveIntelligence";
import VulnerabilityDetail from "./components/VulnerabilityDetail";
import { emotionFaces } from "./emotionFaces";
import "./App.css";

const statusEmotions = {
  idle: emotionFaces.idle,
  scanning: emotionFaces.focus,
  simulating: emotionFaces.curious,
  success: emotionFaces.delight,
  error: emotionFaces.alarm,
  analyzing: emotionFaces.stealth,
};

const storageKeys = {
  scanResults: "pd_scan_results",
  simulationLog: "pd_simulation_log",
  activeView: "pd_active_view",
};

function App() {
  const [scanResults, setScanResults] = useState([]);
  const [simulationLog, setSimulationLog] = useState([]);
  const [activeView, setActiveView] = useState("report");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMood, setStatusMood] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("System idle. Awaiting commands.");

  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedScanResults = window.localStorage.getItem(storageKeys.scanResults);
      const storedSimulationLog = window.localStorage.getItem(storageKeys.simulationLog);
      const storedView = window.localStorage.getItem(storageKeys.activeView);

      if (storedScanResults) {
        setScanResults(JSON.parse(storedScanResults));
      }
      if (storedSimulationLog) {
        setSimulationLog(JSON.parse(storedSimulationLog));
      }
      if (storedView) {
        setActiveView(storedView);
      }
    } catch (error) {
      console.error("Failed to restore previous session", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKeys.scanResults, JSON.stringify(scanResults));
  }, [scanResults]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKeys.simulationLog, JSON.stringify(simulationLog));
  }, [simulationLog]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKeys.activeView, activeView);
  }, [activeView]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const updateStatus = (mood, message) => {
    setStatusMood(mood);
    setStatusMessage(message);
  };

  const handleScan = async () => {
    setIsScanning(true);
    setScanResults([]);
    updateStatus("scanning", "Recomputing findings. Stay frosty...");

    try {
      const response = await fetch("/api/scan");
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const data = await response.json();
      const normalized = Array.isArray(data) ? data : [String(data)];
      setScanResults(normalized);
      updateStatus("success", "Scan complete. Review the intelligence below.");
    } catch (error) {
      console.error(error);
      setScanResults([`Error: Could not perform scan. ${error.message}`]);
      updateStatus("error", "Scan failed. Check the backend link and try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSimulate = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsSimulating(true);
    setSimulationLog([]);
    updateStatus("simulating", "Attack simulation engaged. Streaming live telemetry...");

    const eventSource = new EventSource("/api/simulate");
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      if (event.data === "FINISHED") {
        eventSource.close();
        eventSourceRef.current = null;
        setIsSimulating(false);
        updateStatus("success", "Simulation finished. Debrief in the log.");
      } else {
        setSimulationLog((prevLog) => [...prevLog, event.data]);
      }
    };

    eventSource.onerror = () => {
      setSimulationLog((prevLog) => [
        ...prevLog,
        "Error: Connection to simulation server lost.",
      ]);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsSimulating(false);
      updateStatus("error", "Simulation interrupted. Investigate the Flask service.");
    };
  };

  const moodIcon = useMemo(() => statusEmotions[statusMood] || statusEmotions.idle, [statusMood]);

  const handleChangeView = (view) => {
    setActiveView(view);
    if (isScanning || isSimulating) {
      return;
    }

    if (view === "map") {
      updateStatus("simulating", "Visualizing adversary pathways on the attack map.");
    } else if (view === "timeline") {
      updateStatus("scanning", "Reviewing engagement timeline for situational awareness.");
    } else if (view === "intelligence") {
      updateStatus("analyzing", "Tuning adaptive intelligence recommendations.");
    } else {
      updateStatus("idle", "System idle. Awaiting commands.");
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Security Simulation Control Panel</h1>
          <p>Coordinate scans, simulations, and visualize adversary movement in one place.</p>
        </div>
        <div className="status-chip">
          <span className="status-chip__face">{moodIcon}</span>
          <span className="status-chip__text">{statusMessage}</span>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={activeView === "report" ? "active" : ""}
          onClick={() => handleChangeView("report")}
          type="button"
        >
          Dashboard
        </button>
        <button
          className={activeView === "map" ? "active" : ""}
          onClick={() => handleChangeView("map")}
          type="button"
        >
          View Attack Map
        </button>
        <button
          className={activeView === "timeline" ? "active" : ""}
          onClick={() => handleChangeView("timeline")}
          type="button"
        >
          Timeline
        </button>
        <button
          className={activeView === "intelligence" ? "active" : ""}
          onClick={() => handleChangeView("intelligence")}
          type="button"
        >
          Adaptive Intelligence
        </button>
      </nav>

      {activeView === "report" && (
        <main className="dashboard">
          <section className="matrix-card">
            <div className="panel-header">
              <h2>Operations Console</h2>
              <p className="panel-subtitle">
                Trigger scans or attack simulations. Buttons are locked while an operation is live.
              </p>
            </div>
            <div className="control-grid">
              <button
                className="matrix-button"
                onClick={handleScan}
                disabled={isScanning || isSimulating}
                type="button"
              >
                {isScanning ? "Scanning..." : "Run System Scan"}
              </button>
              <button
                className="matrix-button"
                onClick={handleSimulate}
                disabled={isSimulating || isScanning}
                type="button"
              >
                {isSimulating ? "Simulation in Progress..." : "Start Attack Simulation"}
              </button>
            </div>
          </section>

          <section className="matrix-card">
            <div className="panel-header">
              <h2>Recompute Findings</h2>
              <p className="panel-subtitle">
                Structured vulnerability intel renders here as soon as the backend sends updates.
              </p>
            </div>
            <div className="findings">
              {isScanning && scanResults.length === 0 ? (
                <p className="details-text">{emotionFaces.focus} Gathering host evidence...</p>
              ) : null}
              {!isScanning && scanResults.length === 0 ? (
                <p className="details-text">{emotionFaces.calm} Launch a scan to populate findings.</p>
              ) : null}
              {scanResults.map((finding, index) => (
                <VulnerabilityDetail key={`${index}-${finding.slice(0, 20)}`} rawFinding={finding} />
              ))}
            </div>
          </section>

          <section className="matrix-card">
            <div className="panel-header">
              <h2>Simulation Log</h2>
              <p className="panel-subtitle">
                The stream updates live so you can step away and return without losing context.
              </p>
            </div>
            <div className="log-window">
              {simulationLog.length > 0 ? (
                <ul>
                  {simulationLog.map((entry, index) => (
                    <li key={`${index}-${entry}`}>{entry}</li>
                  ))}
                </ul>
              ) : (
                <p className="details-text">{emotionFaces.idle} Simulation output will appear here.</p>
              )}
            </div>
          </section>
        </main>
      )}

      {activeView === "map" && (
        <main>
          <AttackMap />
        </main>
      )}

      {activeView === "timeline" && (
        <main>
          <AttackTimeline />
        </main>
      )}

      {activeView === "intelligence" && (
        <main>
          <AdaptiveIntelligence onStatusChange={updateStatus} />
        </main>
      )}
    </div>
  );
}

export default App;
