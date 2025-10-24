import React, { useMemo, useState } from "react";
import timelineData from "../attack_timeline.json";
import { emotionFaces } from "../emotionFaces";

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function AttackTimeline() {
  const orderedTimeline = useMemo(
    () =>
      [...timelineData].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    []
  );

  const [selectedEvent, setSelectedEvent] = useState(orderedTimeline[0] || null);

  return (
    <div className="matrix-card timeline-card">
      <div className="panel-header">
        <h2>Attack Timeline</h2>
        <p className="panel-subtitle">
          Step through the incident as it unfolded and keep an eye on critical pivots.
        </p>
      </div>
      <div className="timeline">
        <ol className="timeline__events">
          {orderedTimeline.map((event, index) => {
            const isActive = selectedEvent?.timestamp === event.timestamp;
            return (
              <li key={event.timestamp} className={isActive ? "active" : ""}>
                <button
                  type="button"
                  className="timeline__event"
                  onClick={() => setSelectedEvent(event)}
                >
                  <span className="timeline__index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="timeline__face">
                    {emotionFaces[event.emotion] || emotionFaces.neutral}
                  </span>
                  <span className="timeline__meta">
                    <span className="timeline__title">{event.title}</span>
                    <span className="timeline__time">{formatTimestamp(event.timestamp)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <aside className="timeline__details">
          {selectedEvent ? (
            <div>
              <h3>{selectedEvent.title}</h3>
              <p className="timeline__details-time">
                {formatTimestamp(selectedEvent.timestamp)}
              </p>
              <p className="details-text">{selectedEvent.description}</p>
            </div>
          ) : (
            <div className="details-placeholder">
              <span className="details-placeholder__face">{emotionFaces.calm}</span>
              <p>Tap an event to inspect what the adversary accomplished.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default AttackTimeline;
