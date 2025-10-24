import React, { useCallback, useEffect, useMemo, useState } from "react";
import { emotionFaces } from "../emotionFaces";

const defaultFormState = {
  technique: "",
  target: "",
  success: "success",
  dwellTime: "",
  notes: "",
};

const formatPercentage = (value) => `${Math.round((value || 0) * 100)}%`;

function AdaptiveIntelligence({ onStatusChange }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState(defaultFormState);
  const [submitting, setSubmitting] = useState(false);

  const signalStatus = useCallback(
    (mood, message) => {
      if (onStatusChange) {
        onStatusChange(mood, message);
      }
    },
    [onStatusChange]
  );

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/intelligence");
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      const data = await response.json();
      setSummary(data);
      signalStatus(
        "analyzing",
        "Adaptive intelligence refreshed. Techniques reprioritized."
      );
    } catch (err) {
      console.error("Failed to load intelligence", err);
      setError("Unable to reach the intelligence engine. Try again later.");
      signalStatus("error", "Intelligence refresh failed. Investigate the API link.");
    } finally {
      setLoading(false);
    }
  }, [signalStatus]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formState.technique || !formState.target) {
      setError("Technique and target are required to log an attempt.");
      signalStatus("error", "Provide a technique and target before logging intelligence.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      technique: formState.technique,
      target: formState.target,
      success: formState.success === "success",
      dwellTime: formState.dwellTime ? Number(formState.dwellTime) : undefined,
      notes: formState.notes || undefined,
    };

    try {
      const response = await fetch("/api/intelligence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      await response.json();
      setFormState(defaultFormState);
      signalStatus(
        payload.success ? "success" : "caution",
        payload.success
          ? "Logged a successful attempt. Priority scores updated."
          : "Logged a failed attempt. Strategy recalibrated."
      );
      fetchSummary();
    } catch (err) {
      console.error("Failed to submit intelligence", err);
      setError("Failed to submit the attempt. Ensure the backend is reachable.");
      signalStatus("error", "Intel submission failed. Check Flask service connectivity.");
    } finally {
      setSubmitting(false);
    }
  };

  const recommendations = summary?.recommendations ?? [];
  const stats = summary?.stats;
  const history = summary?.recentHistory ?? [];

  const statusFace = useMemo(() => {
    if (loading) {
      return emotionFaces.focus;
    }
    if (error) {
      return emotionFaces.alert;
    }
    return emotionFaces.stealth;
  }, [loading, error]);

  return (
    <div className="intelligence-grid">
      <section className="matrix-card intelligence-card">
        <div className="panel-header">
          <h2>Adaptive Intelligence Overview</h2>
          <p className="panel-subtitle">
            Inspired by Pwnagotchi&apos;s reinforcement agent, this engine reprioritizes
            simulated tradecraft as new results stream in.
          </p>
        </div>
        <div className="intelligence-status">
          <span className="status-chip__face">{statusFace}</span>
          <span>
            {loading
              ? "Crunching signals from the latest missions..."
              : "Signal feed stable. Training memory online."}
          </span>
        </div>
        {stats ? (
          <dl className="intelligence-stats">
            <div>
              <dt>Techniques Tracked</dt>
              <dd>{stats.techniquesTracked}</dd>
            </div>
            <div>
              <dt>Total Attempts</dt>
              <dd>{stats.totalAttempts}</dd>
            </div>
            <div>
              <dt>Overall Success</dt>
              <dd>{formatPercentage(stats.overallSuccessRate)}</dd>
            </div>
          </dl>
        ) : null}
        {error ? <p className="error-text">{error}</p> : null}
      </section>

      <section className="matrix-card intelligence-card">
        <div className="panel-header">
          <h3>Technique Priorities</h3>
          <p className="panel-subtitle">
            Higher priority scores bubble tactics that are winning frequently or need
            more exploration.
          </p>
        </div>
        <div className="intelligence-table">
          {recommendations.length === 0 ? (
            <p className="details-text">{emotionFaces.calm} No telemetry logged yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Technique</th>
                  <th>Category</th>
                  <th>Score</th>
                  <th>Success</th>
                  <th>Attempts</th>
                  <th>Last Outcome</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((entry) => (
                  <tr key={entry.name}>
                    <td>
                      <span className="table-title">{entry.name}</span>
                      <span className="table-subtitle">{entry.description}</span>
                    </td>
                    <td>{entry.category}</td>
                    <td>{entry.score}</td>
                    <td>{formatPercentage(entry.successRate)}</td>
                    <td>{entry.attempts}</td>
                    <td>
                      {entry.lastOutcome ? (
                        <span className={`outcome-tag outcome-${entry.lastOutcome}`}>
                          {entry.lastOutcome}
                        </span>
                      ) : (
                        <span className="outcome-tag">No data</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="matrix-card intelligence-card">
        <div className="panel-header">
          <h3>Log an Attempt</h3>
          <p className="panel-subtitle">
            Feed the intelligence model with fresh telemetry from red-team simulations.
          </p>
        </div>
        <form className="intelligence-form" onSubmit={handleSubmit}>
          <label>
            Technique
            <input
              type="text"
              name="technique"
              value={formState.technique}
              onChange={handleInputChange}
              placeholder="e.g. Credential Spray"
            />
          </label>
          <label>
            Target or Host
            <input
              type="text"
              name="target"
              value={formState.target}
              onChange={handleInputChange}
              placeholder="Hostname, IP, or campaign"
            />
          </label>
          <label>
            Outcome
            <select
              name="success"
              value={formState.success}
              onChange={handleInputChange}
            >
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </label>
          <label>
            Dwell Time (minutes)
            <input
              type="number"
              name="dwellTime"
              min="0"
              step="0.1"
              value={formState.dwellTime}
              onChange={handleInputChange}
              placeholder="Optional"
            />
          </label>
          <label>
            Notes
            <textarea
              name="notes"
              rows={3}
              value={formState.notes}
              onChange={handleInputChange}
              placeholder="Observations, defenses triggered, etc."
            />
          </label>
          <button
            className="matrix-button"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Record Attempt"}
          </button>
        </form>
      </section>

      <section className="matrix-card intelligence-card">
        <div className="panel-header">
          <h3>Latest Telemetry</h3>
          <p className="panel-subtitle">
            Ten most recent infiltration attempts with context for after-action review.
          </p>
        </div>
        {history.length === 0 ? (
          <p className="details-text">{emotionFaces.idle} No telemetry recorded yet.</p>
        ) : (
          <ul className="intelligence-history">
            {history.map((entry, index) => (
              <li key={`${entry.timestamp}-${index}`}>
                <span className={`outcome-tag outcome-${entry.outcome}`}>
                  {entry.outcome}
                </span>
                <span className="history-technique">{entry.technique}</span>
                <span className="history-target">→ {entry.target}</span>
                <span className="history-time">@ {entry.timestamp}</span>
                {entry.dwellTime ? (
                  <span className="history-detail">
                    ⏱ {entry.dwellTime}m dwell
                  </span>
                ) : null}
                {entry.notes ? (
                  <span className="history-detail">✎ {entry.notes}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default AdaptiveIntelligence;
